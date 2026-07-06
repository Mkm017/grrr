/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware } from './auth';
import { adminAuth } from '../lib/firebase';

vi.mock('../lib/firebase', () => ({
    adminAuth: {
        verifyIdToken: vi.fn(),
    },
}));

// Set up dynamic resolvers for database mock
let dbSelectResult: any[] = [];
let dbInsertResult: any[] = [];

vi.mock('@grrr/database', () => {
    const chain = {
        select: () => chain,
        from: () => chain,
        where: () => chain,
        insert: () => chain,
        values: () => chain,
        returning: () => Promise.resolve(dbInsertResult),
        then: (cb: any) => Promise.resolve(dbSelectResult).then(cb),
    };
    return {
        db: chain,
        users: {
            id: 'id',
            firebaseUid: 'firebase_uid',
            email: 'email',
            phoneNumber: 'phone_number',
            createdAt: 'created_at',
        },
    };
});

describe('authMiddleware', () => {
    let app: Hono<any>;

    beforeEach(() => {
        vi.clearAllMocks();
        dbSelectResult = [];
        dbInsertResult = [];

        app = new Hono();
        app.use('/protected/*', authMiddleware);
        app.get('/protected/test', (c) => c.json({ userId: c.var.userId }));
    });

    it('should return 401 if Authorization header is missing', async () => {
        const res = await app.request('/protected/test');
        expect(res.status).toBe(401);
        const data = await res.json() as { error: string };
        expect(data.error).toBe('Missing or malformed Authorization header');
    });

    it('should return 401 if Authorization header is not Bearer', async () => {
        const res = await app.request('/protected/test', {
            headers: { Authorization: 'Basic abc' },
        });
        expect(res.status).toBe(401);
        const data = await res.json() as { error: string };
        expect(data.error).toBe('Missing or malformed Authorization header');
    });

    it('should return 401 if token verification fails', async () => {
        vi.mocked(adminAuth.verifyIdToken).mockRejectedValue(new Error('Invalid token'));

        const res = await app.request('/protected/test', {
            headers: { Authorization: 'Bearer invalid-token' },
        });
        expect(res.status).toBe(401);
        const data = await res.json() as { error: string };
        expect(data.error).toBe('Unauthorized: Invalid token');
    });

    it('should look up and inject userId if user exists in database', async () => {
        const mockDecodedToken = {
            uid: 'firebase-uid-123',
            email: 'test@example.com',
            phone_number: '+16505550343',
        };
        vi.mocked(adminAuth.verifyIdToken).mockResolvedValue(mockDecodedToken as any);

        const mockDbUser = {
            id: 'db-user-uuid-xyz',
            firebaseUid: 'firebase-uid-123',
            email: 'test@example.com',
            phoneNumber: '+16505550343',
            createdAt: new Date(),
        };
        dbSelectResult = [mockDbUser];

        const res = await app.request('/protected/test', {
            headers: { Authorization: 'Bearer valid-token' },
        });
        expect(res.status).toBe(200);
        const data = await res.json() as { userId: string };
        expect(data.userId).toBe(mockDbUser.id);
    });

    it('should auto-provision and inject userId if user does not exist in database', async () => {
        const mockDecodedToken = {
            uid: 'firebase-uid-new',
            email: 'new@example.com',
            phone_number: '+16505559999',
        };
        vi.mocked(adminAuth.verifyIdToken).mockResolvedValue(mockDecodedToken as any);

        dbSelectResult = [];

        const mockNewUser = {
            id: 'new-user-uuid-abc',
            firebaseUid: 'firebase-uid-new',
            email: 'new@example.com',
            phoneNumber: '+16505559999',
            createdAt: new Date(),
        };
        dbInsertResult = [mockNewUser];

        const res = await app.request('/protected/test', {
            headers: { Authorization: 'Bearer valid-token' },
        });
        expect(res.status).toBe(200);
        const data = await res.json() as { userId: string };
        expect(data.userId).toBe(mockNewUser.id);
    });
});
