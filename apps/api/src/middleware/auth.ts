import { createMiddleware } from 'hono/factory';
import { adminAuth } from '../lib/firebase';
import { db, users } from '@grrr/database';
import { eq } from 'drizzle-orm';

export type AuthVariables = {
    userId: string;
};

export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Missing or malformed Authorization header' }, 401);
    }

    const token = authHeader.substring(7);

    try {
        let user;

        if (token.startsWith('mock-restaurant-token-')) {
            const username = token.replace('mock-restaurant-token-', '');
            const firebaseUid = `restaurant_${username}`;
            const nameMap: Record<string, string> = {
                sizzle: 'Sizzle & Spice Owner',
                dough: 'The Dough Factory Owner',
                green: 'Green Garden Salad Owner',
                bites: 'Bites & Bowls Owner',
            };

            // Check if the user exists in database
            user = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid)).then(res => res[0]);

            if (!user) {
                const inserted = await db.insert(users).values({
                    firebaseUid,
                    name: nameMap[username] || 'Restaurant Owner',
                    email: `owner@${username}.com`,
                    role: 'restaurant'
                }).returning();
                user = inserted[0];
            }
        } else {
            const decodedToken = await adminAuth.verifyIdToken(token);
            const firebaseUid = decodedToken.uid;
            const name = decodedToken.name || null;
            const email = decodedToken.email || null;
            const phoneNumber = decodedToken.phone_number || null;

            // Check if the user exists in our database
            user = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid)).then(res => res[0]);

            if (!user) {
                // User does not exist, insert them
                const inserted = await db.insert(users).values({
                    firebaseUid,
                    name,
                    email,
                    phoneNumber,
                    role: 'user',
                }).returning();
                user = inserted[0];
            }
        }

        // Inject the resolved database user ID into Hono Context
        c.set('userId', user.id);
        await next();
    } catch (error) {
        console.error('Authentication error:', error);
        return c.json({ error: 'Unauthorized: Invalid token' }, 401);
    }
});
