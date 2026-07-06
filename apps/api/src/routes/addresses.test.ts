//D:\Grrr\apps\api\src\routes\addresses.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import addressesApp from './addresses';
import { adminAuth } from '../lib/firebase';

vi.mock('../lib/firebase', () => ({
    adminAuth: {
        verifyIdToken: vi.fn(),
    },
}));

let dbSelectResult: any[] = [];
let dbInsertResult: any[] = [];
let dbUpdateResult: any[] = [];
let updateCalls: any[] = [];

vi.mock('@grrr/database', () => {
    const chain = {
        select: () => chain,
        from: () => chain,
        where: () => chain,
        orderBy: () => chain,
        insert: () => chain,
        values: () => chain,
        update: () => {
            return {
                set: (vals: any) => {
                    updateCalls.push(vals);
                    return chain;
                }
            };
        },
        delete: () => chain,
        returning: () => {
            if (dbInsertResult.length > 0) return Promise.resolve(dbInsertResult);
            if (dbUpdateResult.length > 0) return Promise.resolve(dbUpdateResult);
            return Promise.resolve([]);
        },
        then: (cb: any) => {
            // Differentiate user lookup vs addresses lookup
            const queryStr = cb.toString();
            let result = dbSelectResult;
            if (queryStr.includes('firebaseUid')) {
                result = [{ id: 'user-uuid-123', firebaseUid: 'firebase-uid-123' }];
            }
            return Promise.resolve(result).then(cb);
        },
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
        addresses: {
            id: 'id',
            userId: 'user_id',
            title: 'title',
            addressLine1: 'address_line1',
            addressLine2: 'address_line2',
            city: 'city',
            state: 'state',
            postalCode: 'postal_code',
            country: 'country',
            latitude: 'latitude',
            longitude: 'longitude',
            isDefault: 'is_default',
            createdAt: 'created_at',
        },
    };
});

describe('addresses routes', () => {
    let app: Hono<any>;

    beforeEach(() => {
        vi.clearAllMocks();
        dbSelectResult = [];
        dbInsertResult = [];
        dbUpdateResult = [];
        updateCalls = [];

        app = new Hono();
        app.route('/addresses', addressesApp);

        vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({
            uid: 'firebase-uid-123',
            email: 'test@example.com',
        } as any);
    });

    it('should list saved addresses for the authenticated user', async () => {
        const mockAddress = {
            id: 'address-uuid-xyz',
            userId: 'user-uuid-123',
            title: 'Home',
            addressLine1: '123 Main St',
            city: 'Springfield',
            postalCode: '62701',
            country: 'US',
            latitude: '39.7817',
            longitude: '-89.6501',
            isDefault: true,
            createdAt: new Date(),
        };
        dbSelectResult = [mockAddress];

        const res = await app.request('/addresses', {
            headers: { Authorization: 'Bearer valid-token' },
        });
        expect(res.status).toBe(200);
        const data = await res.json() as { addresses: any[] };
        expect(data.addresses.length).toBe(1);
        expect(data.addresses[0].id).toBe(mockAddress.id);
        expect(data.addresses[0].latitude).toBe(39.7817);
    });

    it('should create a new address and reset previous default status if isDefault is true', async () => {
        const payload = {
            title: 'Work',
            addressLine1: '456 Corporate Blvd',
            city: 'Metropolis',
            postalCode: '90210',
            latitude: 34.0522,
            longitude: -118.2437,
            isDefault: true,
        };

        const mockInsertedAddress = {
            id: 'address-new-uuid',
            userId: 'user-uuid-123',
            ...payload,
            createdAt: new Date(),
        };
        dbInsertResult = [mockInsertedAddress];

        const res = await app.request('/addresses', {
            method: 'POST',
            headers: {
                Authorization: 'Bearer valid-token',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
        });

        expect(res.status).toBe(200);
        const data = await res.json() as any;
        expect(data.id).toBe(mockInsertedAddress.id);
        // Verify default status was reset on other addresses
        expect(updateCalls.length).toBe(1);
        expect(updateCalls[0].isDefault).toBe(false);
    });

    it('should delete a saved address if owned by user', async () => {
        const mockAddress = {
            id: 'address-to-delete',
            userId: 'user-uuid-123',
            addressLine1: '123 Main St',
            city: 'Springfield',
            postalCode: '62701',
            createdAt: new Date(),
        };
        dbSelectResult = [mockAddress];

        const res = await app.request('/addresses/address-to-delete', {
            method: 'DELETE',
            headers: { Authorization: 'Bearer valid-token' },
        });

        expect(res.status).toBe(200);
        const data = await res.json() as { success: boolean };
        expect(data.success).toBe(true);
    });
});
