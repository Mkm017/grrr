import { Hono } from 'hono';
import { db, deliveryAgents, deliveryAssignments, orders, orderItems, restaurants, addresses, branches, users } from '@grrr/database';
import { eq, inArray, and, or, sql } from 'drizzle-orm';
import { authMiddleware, AuthVariables } from '../middleware/auth';
import { calculateDeliveryEarning } from '../lib/pricing';

const deliveryApp = new Hono<{ Variables: AuthVariables }>();
deliveryApp.use('/*', authMiddleware);

// POST /delivery/location - Update delivery agent location
deliveryApp.post('/location', async (c) => {
    const userId = c.var.userId;
    try {
        const body = await c.req.json();
        const { latitude, longitude } = body;

        let agent = await db.select().from(deliveryAgents).where(eq(deliveryAgents.userId, userId)).then(res => res[0]);

        if (!agent) {
            // Find user to get name/phone
            const user = await db.select().from(users).where(eq(users.id, userId)).then(res => res[0]);
            if (!user) return c.json({ error: 'User not found' }, 404);

            const [newAgent] = await db.insert(deliveryAgents).values({
                userId,
                name: user.name,
                phoneNumber: user.phoneNumber || '0000000000',
                currentLatitude: latitude,
                currentLongitude: longitude,
                isAvailable: true,
            }).returning();
            agent = newAgent;
        } else {
            const [updated] = await db.update(deliveryAgents)
                .set({
                    currentLatitude: latitude,
                    currentLongitude: longitude,
                })
                .where(eq(deliveryAgents.id, agent.id))
                .returning();
            agent = updated;
        }

        return c.json({ agent });
    } catch (error) {
        console.error('Update location error:', error);
        return c.json({ error: 'Failed to update location' }, 500);
    }
});

// GET /delivery/available-orders - Get orders nearby
deliveryApp.get('/available-orders', async (c) => {
    const userId = c.var.userId;
    try {
        const agent = await db.select().from(deliveryAgents).where(eq(deliveryAgents.userId, userId)).then(res => res[0]);
        if (!agent || !agent.currentLatitude || !agent.currentLongitude) {
            return c.json({ orders: [] });
        }

        const allRestaurants = await db.select().from(restaurants);
        const assignedOrderIds = await db.select({ orderId: deliveryAssignments.orderId }).from(deliveryAssignments);
        const assignedSet = new Set(assignedOrderIds.map(a => a.orderId));

        const pendingOrders = await db.select().from(orders).where(inArray(orders.status, ['accepted', 'preparing', 'ready']));
        const availableOrders = pendingOrders.filter(o => !assignedSet.has(o.id));

        const formatted = [];
        for (const order of availableOrders) {
            const res = allRestaurants.find(r => r.id === order.restaurantId);
            if (res) {
                const branch = await db.select().from(branches).where(eq(branches.restaurantId, res.id)).then(b => b[0]);
                const address = await db.select().from(addresses).where(eq(addresses.id, order.addressId)).then(a => a[0]);
                const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
                formatted.push({
                    ...order,
                    restaurant: { ...res, branch },
                    address,
                    items,
                    earning: calculateDeliveryEarning(order)
                });
            }
        }

        return c.json({ orders: formatted });
    } catch (error) {
        console.error('Get available orders error:', error);
        return c.json({ error: 'Failed to fetch available orders' }, 500);
    }
});

// GET /delivery/active-assignment - Get the currently assigned order
deliveryApp.get('/active-assignment', async (c) => {
    const userId = c.var.userId;
    try {
        const agent = await db.select().from(deliveryAgents).where(eq(deliveryAgents.userId, userId)).then(res => res[0]);
        if (!agent) return c.json({ assignment: null });

        const assignment = await db.select().from(deliveryAssignments)
            .where(and(eq(deliveryAssignments.agentId, agent.id), inArray(deliveryAssignments.status, ['assigned', 'picked_up'])))
            .then(res => res[0]);

        if (!assignment) return c.json({ assignment: null });

        const orderRow = await db.select().from(orders).where(eq(orders.id, assignment.orderId)).then(res => res[0]);
        const res = await db.select().from(restaurants).where(eq(restaurants.id, orderRow.restaurantId)).then(res => res[0]);
        const branch = await db.select().from(branches).where(eq(branches.restaurantId, res.id)).then(b => b[0]);
        const address = await db.select().from(addresses).where(eq(addresses.id, orderRow.addressId)).then(a => a[0]);
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderRow.id));

        return c.json({
            assignment,
            order: {
                ...orderRow,
                restaurant: { ...res, branch },
                address,
                items,
                earning: calculateDeliveryEarning(orderRow)
            }
        });
    } catch (error) {
        console.error('Active assignment error:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// POST /delivery/accept/:orderId
deliveryApp.post('/accept/:orderId', async (c) => {
    const userId = c.var.userId;
    const orderId = c.req.param('orderId');
    try {
        const agent = await db.select().from(deliveryAgents).where(eq(deliveryAgents.userId, userId)).then(res => res[0]);
        if (!agent) return c.json({ error: 'Agent not found' }, 404);

        const [assignment] = await db.insert(deliveryAssignments).values({
            orderId,
            agentId: agent.id,
            status: 'assigned',
        }).returning();

        return c.json({ success: true, assignment });
    } catch (error) {
        console.error('Accept order error:', error);
        return c.json({ error: 'Failed to accept order' }, 500);
    }
});

// PATCH /delivery/status/:assignmentId
deliveryApp.patch('/status/:assignmentId', async (c) => {
    const assignmentId = c.req.param('assignmentId');
    const { status, orderStatus } = await c.req.json();
    try {
        const [assignment] = await db.update(deliveryAssignments)
            .set({ 
                status, 
                pickupTime: status === 'picked_up' ? new Date() : undefined,
                deliveryTime: status === 'delivered' ? new Date() : undefined
            })
            .where(eq(deliveryAssignments.id, assignmentId))
            .returning();
            
        if (orderStatus) {
            await db.update(orders)
                .set({ 
                    status: orderStatus,
                    actualDeliveryTime: orderStatus === 'delivered' ? new Date() : undefined
                })
                .where(eq(orders.id, assignment.orderId));
        }

        return c.json({ success: true, assignment });
    } catch (error) {
        console.error('Update status error:', error);
        return c.json({ error: 'Failed to update status' }, 500);
    }
});

// GET /delivery/stats
deliveryApp.get('/stats', async (c) => {
    const userId = c.var.userId;
    try {
        const agent = await db.select().from(deliveryAgents).where(eq(deliveryAgents.userId, userId)).then(res => res[0]);
        if (!agent) return c.json({ stats: { deliveries: 0, earnings: 0, rating: 5.0 } });

        const assignments = await db.select().from(deliveryAssignments).where(eq(deliveryAssignments.agentId, agent.id));
        const deliveredAssignments = assignments.filter(a => a.status === 'delivered');
        
        let totalEarnings = 0;
        for (const a of deliveredAssignments) {
            const orderRow = await db.select().from(orders).where(eq(orders.id, a.orderId)).then(res => res[0]);
            if (orderRow) {
                totalEarnings += calculateDeliveryEarning(orderRow);
            }
        }

        return c.json({
            stats: {
                deliveries: deliveredAssignments.length,
                earnings: totalEarnings,
                rating: agent.rating
            }
        });
    } catch (error) {
        console.error('Stats error:', error);
        return c.json({ error: 'Failed to fetch stats' }, 500);
    }
});

export default deliveryApp;
