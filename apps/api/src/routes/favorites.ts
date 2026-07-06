//D:\Grrr\apps\api\src\routes\favorites.ts
import { Hono } from 'hono';
import { db, favorites, restaurants, branches } from '@grrr/database';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, AuthVariables } from '../middleware/auth';
import {
    CreateFavoriteRequestSchema,
    FavoriteResponseSchema,
    FavoritesListResponseSchema
} from '@grrr/contracts';

const favoritesApp = new Hono<{ Variables: AuthVariables }>();

// All routes require authentication
favoritesApp.use('/*', authMiddleware);

// GET / - List all favorite restaurants for the authenticated user
favoritesApp.get('/', async (c) => {
    const userId = c.var.userId;
    try {
        // Fetch all favorite records for the user
        const favRows = await db.select().from(favorites).where(eq(favorites.userId, userId));

        if (favRows.length === 0) {
            return c.json({ favorites: [] });
        }

        const restaurantIds = favRows.map(row => row.restaurantId);

        // Fetch corresponding restaurants details
        const list = await db.select().from(restaurants);
        const filteredRestaurants = list.filter(r => restaurantIds.includes(r.id) && r.isActive);
        const allBranches = await db.select().from(branches);

        const formatted = filteredRestaurants.map(r => {
            const restBranches = allBranches.filter(b => b.restaurantId === r.id);
            return {
                id: r.id,
                name: r.name,
                description: r.description || null,
                cuisineType: r.cuisineType,
                rating: Number(r.rating),
                deliveryTime: r.deliveryTime,
                imageEmoji: r.imageEmoji,
                isActive: r.isActive,
                branches: restBranches.map(b => ({
                    id: b.id,
                    restaurantId: b.restaurantId,
                    name: b.name,
                    addressLine1: b.addressLine1,
                    addressLine2: b.addressLine2 || null,
                    city: b.city,
                    latitude: b.latitude ? Number(b.latitude) : null,
                    longitude: b.longitude ? Number(b.longitude) : null,
                    phoneNumber: b.phoneNumber || null,
                })),
                createdAt: r.createdAt.toISOString(),
            };
        });

        const validated = FavoritesListResponseSchema.parse({ favorites: formatted });
        return c.json(validated);
    } catch (error) {
        console.error(`Failed to list favorites for user ${userId}:`, error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// POST / - Add a restaurant to favorites
favoritesApp.post('/', async (c) => {
    const userId = c.var.userId;
    try {
        const body = await c.req.json();
        const { restaurantId } = CreateFavoriteRequestSchema.parse(body);

        // Verify the restaurant exists and is active
        const rest = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId)).then(res => res[0]);
        if (!rest) {
            return c.json({ error: 'Restaurant not found' }, 404);
        }

        // Check if already favorited
        const existing = await db.select()
            .from(favorites)
            .where(and(eq(favorites.userId, userId), eq(favorites.restaurantId, restaurantId)))
            .then(res => res[0]);

        if (existing) {
            return c.json(FavoriteResponseSchema.parse({
                id: existing.id,
                userId: existing.userId,
                restaurantId: existing.restaurantId,
                createdAt: existing.createdAt.toISOString(),
            }));
        }

        // Insert new favorite
        const [inserted] = await db.insert(favorites).values({
            userId,
            restaurantId,
        }).returning();

        const validated = FavoriteResponseSchema.parse({
            id: inserted.id,
            userId: inserted.userId,
            restaurantId: inserted.restaurantId,
            createdAt: inserted.createdAt.toISOString(),
        });

        return c.json(validated, 201);
    } catch (error) {
        console.error(`Failed to add favorite for user ${userId}:`, error);
        return c.json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500);
    }
});

// DELETE /:restaurantId - Remove a restaurant from favorites
favoritesApp.delete('/:restaurantId', async (c) => {
    const userId = c.var.userId;
    const restaurantId = c.req.param('restaurantId');
    try {
        await db.delete(favorites)
            .where(and(eq(favorites.userId, userId), eq(favorites.restaurantId, restaurantId)));

        return c.json({ success: true });
    } catch (error) {
        console.error(`Failed to delete favorite ${restaurantId} for user ${userId}:`, error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

export default favoritesApp;
