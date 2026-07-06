import { Hono } from 'hono';
import { db, orders, orderItems, deliveryAssignments, deliveryAgents, restaurants } from '@grrr/database';
import { eq, desc } from 'drizzle-orm';
import { authMiddleware, AuthVariables } from '../middleware/auth';

const ordersApp = new Hono<{ Variables: AuthVariables }>();
ordersApp.use('/*', authMiddleware);

type MonthlyCalorieOrderItem = {
    itemName: string;
    quantity: number;
    variantName: string | null;
    pricePerUnit: number;
    addonsJson: string | null;
};

function estimateCaloriesForItem(item: MonthlyCalorieOrderItem): number {
    const name = item.itemName.toLowerCase();
    const variant = (item.variantName || '').toLowerCase();
    const addonCount = item.addonsJson ? (() => {
        try {
            const parsed = JSON.parse(item.addonsJson);
            return Array.isArray(parsed) ? parsed.length : 0;
        } catch {
            return 0;
        }
    })() : 0;

    const baseCalories = (() => {
        if (name.includes('burger') || name.includes('sandwich')) return 560;
        if (name.includes('pizza')) return 720;
        if (name.includes('fries') || name.includes('chips')) return 360;
        if (name.includes('salad')) return 180;
        if (name.includes('curry') || name.includes('bowl')) return 460;
        if (name.includes('pasta')) return 540;
        if (name.includes('biryani') || name.includes('rice')) return 680;
        if (name.includes('wrap') || name.includes('roll')) return 420;
        if (name.includes('noodle')) return 500;
        if (name.includes('dosa') || name.includes('idli')) return 320;
        if (name.includes('cake') || name.includes('dessert') || name.includes('ice cream')) return 400;
        if (name.includes('drink') || name.includes('juice') || name.includes('soda') || name.includes('coffee') || name.includes('tea')) return 120;
        if (name.includes('thali')) return 760;
        return Math.max(220, Math.round((item.pricePerUnit / 100) * 2.2));
    })();

    let modifier = 1;
    if (variant.includes('large') || variant.includes('double') || variant.includes('family')) modifier += 0.2;
    if (variant.includes('small') || variant.includes('lite') || variant.includes('mini')) modifier -= 0.1;

    const addonCalories = addonCount * 55;
    return Math.max(0, Math.round((baseCalories * modifier + addonCalories) * item.quantity));
}

function getMonthBounds(monthParam?: string) {
    const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : new Date().toISOString().slice(0, 7);
    const [year, monthIndex] = month.split('-').map(Number);
    const start = new Date(Date.UTC(year, monthIndex - 1, 1));
    const end = new Date(Date.UTC(year, monthIndex, 1));
    return { month, start, end };
}

// POST /orders - Place a new order
ordersApp.post('/', async (c) => {
    const userId = c.var.userId;
    try {
        const body = await c.req.json();
        const { restaurantId, addressId, items, subtotal, deliveryFee, taxes, discount, total, couponCode, paymentMethod, specialInstructions } = body;

        // Create order
        const [order] = await db.insert(orders).values({
            userId,
            restaurantId,
            addressId,
            status: 'pending',
            subtotal,
            deliveryFee: deliveryFee || 0,
            taxes: taxes || 0,
            discount: discount || 0,
            total,
            couponCode: couponCode || null,
            paymentMethod: paymentMethod || 'card',
            specialInstructions: specialInstructions || null,
            estimatedDeliveryTime: new Date(Date.now() + 35 * 60 * 1000),
        }).returning();

        // Create order items
        if (items && items.length > 0) {
            const orderItemsData = items.map((item: any) => ({
                orderId: order.id,
                menuItemId: item.menuItemId,
                itemName: item.itemName,
                variantName: item.variantName || null,
                quantity: item.quantity,
                pricePerUnit: item.pricePerUnit,
                addonsJson: JSON.stringify(item.addons || []),
            }));
            await db.insert(orderItems).values(orderItemsData);
        }

        return c.json({ success: true, order }, 201);
    } catch (error) {
        console.error('Place order error:', error);
        return c.json({ error: 'Failed to place order' }, 500);
    }
});

// GET /orders/my-orders - Get user's orders
ordersApp.get('/my-orders', async (c) => {
    const userId = c.var.userId;
    try {
        const userOrders = await db.select().from(orders)
            .where(eq(orders.userId, userId))
            .orderBy(desc(orders.createdAt));

        // Fetch items for each order
        const ordersWithItems = await Promise.all(
            userOrders.map(async (order) => {
                const items = await db.select().from(orderItems)
                    .where(eq(orderItems.orderId, order.id));

                const assignment = await db.select().from(deliveryAssignments)
                    .where(eq(deliveryAssignments.orderId, order.id)).then(res => res[0]);
                
                let agent = null;
                if (assignment) {
                    agent = await db.select().from(deliveryAgents).where(eq(deliveryAgents.id, assignment.agentId)).then(res => res[0]);
                }

                const restaurant = await db.select().from(restaurants).where(eq(restaurants.id, order.restaurantId)).then(res => res[0]);

                return {
                    ...order,
                    restaurant: restaurant ? { name: restaurant.name, imageEmoji: restaurant.imageEmoji } : null,
                    items: items.map(item => ({
                        ...item,
                        addonsJson: typeof item.addonsJson === 'string' ? JSON.parse(item.addonsJson) : item.addonsJson,
                    })),
                    deliveryAgent: agent ? { name: agent.name, phoneNumber: agent.phoneNumber } : null,
                    createdAt: order.createdAt.toISOString(),
                    updatedAt: order.updatedAt?.toISOString(),
                    estimatedDeliveryTime: order.estimatedDeliveryTime?.toISOString() || null,
                };
            })
        );

        return c.json({ orders: ordersWithItems });
    } catch (error) {
        console.error('Get orders error:', error);
        return c.json({ error: 'Failed to fetch orders' }, 500);
    }
});

// GET /orders/restaurant/:restaurantId - Get restaurant's orders
ordersApp.get('/restaurant/:restaurantId', async (c) => {
    const restaurantId = c.req.param('restaurantId');
    try {
        const restaurantOrders = await db.select().from(orders)
            .where(eq(orders.restaurantId, restaurantId))
            .orderBy(desc(orders.createdAt));

        const ordersWithItems = await Promise.all(
            restaurantOrders.map(async (order) => {
                const items = await db.select().from(orderItems)
                    .where(eq(orderItems.orderId, order.id));

                return {
                    ...order,
                    items: items.map(item => ({
                        ...item,
                        addonsJson: typeof item.addonsJson === 'string' ? JSON.parse(item.addonsJson) : item.addonsJson,
                    })),
                    createdAt: order.createdAt.toISOString(),
                };
            })
        );

        return c.json({ orders: ordersWithItems });
    } catch (error) {
        console.error('Get restaurant orders error:', error);
        return c.json({ error: 'Failed to fetch orders' }, 500);
    }
});

// PATCH /orders/:orderId/status - Update order status
ordersApp.patch('/:orderId/status', async (c) => {
    const orderId = c.req.param('orderId');
    try {
        const { status } = await c.req.json();

        const [updated] = await db.update(orders)
            .set({
                status,
                updatedAt: new Date(),
                actualDeliveryTime: status === 'delivered' ? new Date() : undefined,
            })
            .where(eq(orders.id, orderId))
            .returning();

        return c.json({ order: updated });
    } catch (error) {
        console.error('Update order status error:', error);
        return c.json({ error: 'Failed to update order' }, 500);
    }
});

// GET /orders/monthly-calories?month=YYYY-MM - Get calorie summary for a month
ordersApp.get('/monthly-calories', async (c) => {
    const userId = c.var.userId;
    const { month, start, end } = getMonthBounds(c.req.query('month'));

    try {
        const monthlyOrders = await db.select().from(orders)
            .where(eq(orders.userId, userId))
            .orderBy(desc(orders.createdAt));

        const deliveredMonthlyOrders = monthlyOrders.filter(order =>
            order.status === 'delivered' &&
            order.createdAt >= start &&
            order.createdAt < end
        );

        const restaurantRows = await db.select().from(restaurants);
        const ordersWithCalories = await Promise.all(deliveredMonthlyOrders.map(async (order) => {
            const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
            const restaurant = restaurantRows.find(row => row.id === order.restaurantId);
            const calories = items.reduce((sum, item) => sum + estimateCaloriesForItem({
                itemName: item.itemName,
                quantity: item.quantity,
                variantName: item.variantName,
                pricePerUnit: item.pricePerUnit,
                addonsJson: item.addonsJson,
            }), 0);

            return {
                orderId: order.id,
                createdAt: order.createdAt.toISOString(),
                restaurantName: restaurant?.name || 'Restaurant',
                calories,
                subtotal: order.subtotal,
                deliveryFee: order.deliveryFee,
                discount: order.discount,
                total: order.total,
                itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
            };
        }));

        const dailyMap = new Map<string, number>();
        for (const row of ordersWithCalories) {
            const dayKey = row.createdAt.slice(0, 10);
            dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + row.calories);
        }

        const dailyCalories = Array.from(dailyMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, calories]) => ({ date, calories }));

        const totalCalories = ordersWithCalories.reduce((sum, row) => sum + row.calories, 0);

        return c.json({
            month,
            summary: {
                totalCalories,
                orderCount: ordersWithCalories.length,
                averageCalories: ordersWithCalories.length > 0 ? Math.round(totalCalories / ordersWithCalories.length) : 0,
            },
            orders: ordersWithCalories,
            dailyCalories,
        });
    } catch (error) {
        console.error('Monthly calorie stats error:', error);
        return c.json({ error: 'Failed to fetch monthly calorie dashboard' }, 500);
    }
});

export default ordersApp;