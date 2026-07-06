//D:\Grrr\apps\api\src\routes\favorites.test.ts
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import favoritesApp from './favorites';
import { adminAuth } from '../lib/firebase';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const RESTAURANT_ID = '22222222-2222-2222-2222-222222222222';
const FAVORITE_ID = '33333333-3333-3333-3333-333333333333';

vi.mock('../lib/firebase', () => ({
    adminAuth: {
        verifyIdToken: vi.fn(),
    },
}));

let dbSelectResult: any[] = [];
let dbInsertResult: any[] = [];
let dbDeleteCalled = false;
let selectCount = 0;

vi.mock('@grrr/database', () => {
    const chain = {
        select: () => chain,
        from: (table: any) => {
            chain.currentTable = table;
            return chain;
        },
        where: () => chain,
        insert: () => chain,
        values: () => chain,
        delete: () => {
            dbDeleteCalled = true;
            return chain;
        },
        returning: () => {
            if (dbInsertResult.length > 0) return Promise.resolve(dbInsertResult);
            return Promise.resolve([]);
        },
        currentTable: null as any,
        then: (cb: any) => {
            let result = dbSelectResult;
            if (chain.currentTable && chain.currentTable.name === 'users') {
                result = [{ id: USER_ID, firebaseUid: 'firebase-uid-123' }];
            } else if (chain.currentTable && chain.currentTable.name === 'favorites') {
                // If it is the secondary select check in post
                if (selectCount > 0) {
                    result = [];
                } else {
                    result = dbSelectResult;
                }
                selectCount++;
            } else if (chain.currentTable && chain.currentTable.name === 'restaurants') {
                result = [{
                    id: RESTAURANT_ID,
                    name: 'Sizzle & Spice',
                    description: 'Burgers',
                    cuisineType: 'Fast Food',
                    rating: 4.8,
                    deliveryTime: '20-30 min',
                    imageEmoji: '🍔',
                    isActive: true,
                    createdAt: new Date(),
                }];
            } else if (chain.currentTable && chain.currentTable.name === 'restaurant_branches') {
                result = [];
            }
            return Promise.resolve(result).then(cb);
        },
    };

    return {
        db: chain,
        users: { name: 'users', id: 'id', firebaseUid: 'firebase_uid' },
        favorites: { name: 'favorites', id: 'id', userId: 'user_id', restaurantId: 'restaurant_id', createdAt: 'created_at' },
        restaurants: { name: 'restaurants', id: 'id', isActive: 'is_active' },
        branches: { name: 'restaurant_branches', restaurantId: 'restaurant_id' }
    };
});

describe('favorites routes', () => {
    let app: Hono<any>;

    beforeEach(() => {
        vi.clearAllMocks();
        dbSelectResult = [];
        dbInsertResult = [];
        dbDeleteCalled = false;
        selectCount = 0;

        app = new Hono();
        app.route('/favorites', favoritesApp);

        vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({
            uid: 'firebase-uid-123',
            email: 'test@example.com',
        } as any);
    });

    it('should list all favorites for authenticated user', async () => {
        dbSelectResult = [
            {
                id: FAVORITE_ID,
                userId: USER_ID,
                restaurantId: RESTAURANT_ID,
                createdAt: new Date(),
            }
        ];

        const res = await app.request('/favorites', {
            headers: {
                Authorization: 'Bearer mock-token-123',
            },
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.favorites).toHaveLength(1);
        expect(data.favorites[0].name).toBe('Sizzle & Spice');
    });

    it('should add a restaurant to favorites', async () => {
        dbSelectResult = []; // Check already exists returns empty
        dbInsertResult = [
            {
                id: FAVORITE_ID,
                userId: USER_ID,
                restaurantId: RESTAURANT_ID,
                createdAt: new Date(),
            }
        ];

        const res = await app.request('/favorites', {
            method: 'POST',
            headers: {
                Authorization: 'Bearer mock-token-123',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                restaurantId: RESTAURANT_ID,
            }),
        });

        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.restaurantId).toBe(RESTAURANT_ID);
        expect(data.id).toBe(FAVORITE_ID);
    });

    it('should delete a restaurant from favorites', async () => {
        const res = await app.request(`/favorites/${RESTAURANT_ID}`, {
            method: 'DELETE',
            headers: {
                Authorization: 'Bearer mock-token-123',
            },
        });

        expect(res.status).toBe(200);
        expect(dbDeleteCalled).toBe(true);
        const data = await res.json();
        expect(data.success).toBe(true);
    });
});
