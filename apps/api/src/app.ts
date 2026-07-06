import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { PingResponse, UsersResponse, UserMeResponse, UpdateProfileRequestSchema } from '@grrr/contracts';
import { db, users } from '@grrr/database';
import { authMiddleware, AuthVariables } from './middleware/auth';
import { eq, sql } from 'drizzle-orm';
import { errorHandler } from './middleware/errors';
import addressesApp from './routes/addresses';
import catalogApp from './routes/catalog';
import favoritesApp from './routes/favorites';
import ordersApp from './routes/orders';
import { restaurantOwnerRouter } from './routes/restaurant-owner';
import deliveryApp from './routes/delivery';
import aiApp from './routes/ai';
import recommendationsApp from './routes/recommendations';

function isAllowedOrigin(origin: string): boolean {
    if (origin.startsWith('http://localhost:')) return true;
    if (origin.endsWith('.vercel.app')) return true;
    const custom = process.env.ALLOWED_ORIGIN;
    if (custom && origin === custom) return true;
    return false;
}

export function createApp(basePath = '') {
    const app = new Hono<{ Variables: AuthVariables }>().basePath(basePath);

    app.use('/*', cors({
        origin: (origin) => {
            if (!origin) return '*';
            return isAllowedOrigin(origin) ? origin : 'http://localhost:5173';
        },
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        credentials: true,
    }));

    app.route('/addresses', addressesApp);
    app.route('/restaurants', catalogApp);
    app.route('/favorites', favoritesApp);
    app.route('/orders', ordersApp);
    app.route('/restaurant-owner', restaurantOwnerRouter);
    app.route('/delivery', deliveryApp);
    app.route('/ai', aiApp);
    app.route('/recommendations', recommendationsApp);

    app.onError(errorHandler);

    app.get('/ping', (c) => {
        const response: PingResponse = {
            status: 'ok',
            timestamp: new Date().toISOString(),
        };
        return c.json(response);
    });

    app.get('/health', async (c) => {
        try {
            await db.execute(sql`SELECT 1`);
            return c.json({
                status: 'healthy',
                database: 'connected',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Health check database query failed:', error);
            return c.json({
                status: 'unhealthy',
                database: 'disconnected',
                timestamp: new Date().toISOString(),
            }, 500);
        }
    });

    app.get('/users', async (c) => {
        try {
            const allUsers = await db.select().from(users);
            const response: UsersResponse = {
                users: allUsers.map(u => ({
                    id: u.id,
                    email: u.email,
                    createdAt: u.createdAt.toISOString(),
                }))
            };
            return c.json(response);
        } catch (error) {
            console.error('Database Error:', error);
            return c.json({ error: 'Failed to fetch users' }, 500);
        }
    });

    app.get('/users/me', authMiddleware, async (c) => {
        const userId = c.var.userId;
        try {
            const user = await db.select().from(users).where(eq(users.id, userId)).then(res => res[0]);
            if (!user) {
                return c.json({ error: 'User not found' }, 404);
            }
            const response: UserMeResponse = {
                id: user.id,
                firebaseUid: user.firebaseUid,
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role,
                createdAt: user.createdAt.toISOString(),
            };
            return c.json(response);
        } catch (error) {
            console.error('Failed to retrieve current user:', error);
            return c.json({ error: 'Internal server error' }, 500);
        }
    });

    app.put('/users/profile', authMiddleware, async (c) => {
        const userId = c.var.userId;
        try {
            const body = await c.req.json().catch(() => ({}));
            const parsed = UpdateProfileRequestSchema.safeParse(body);
            if (!parsed.success) {
                return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
            }
            const { name, email, phoneNumber, role } = parsed.data;
            const updateObj: Record<string, unknown> = { name };
            if (email !== undefined && email !== null) updateObj.email = email;
            if (phoneNumber !== undefined && phoneNumber !== null) updateObj.phoneNumber = phoneNumber;
            if (role !== undefined && role !== null) updateObj.role = role;

            const updated = await db.update(users)
                .set(updateObj)
                .where(eq(users.id, userId))
                .returning();

            const user = updated[0];
            const response: UserMeResponse = {
                id: user.id,
                firebaseUid: user.firebaseUid,
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role,
                createdAt: user.createdAt.toISOString(),
            };
            return c.json(response);
        } catch (error) {
            console.error('Failed to update user profile:', error);
            return c.json({ error: 'Internal server error' }, 500);
        }
    });

    return app;
}
