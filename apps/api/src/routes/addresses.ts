//D:\Grrr\apps\api\src\routes\addresses.ts
import { Hono } from 'hono';
import { authMiddleware, AuthVariables } from '../middleware/auth';
import { db, addresses } from '@grrr/database';
import { eq, and, desc } from 'drizzle-orm';
import { CreateAddressRequestSchema } from '@grrr/contracts';

const addressesApp = new Hono<{ Variables: AuthVariables }>();

// All routes here are protected
addressesApp.use('/*', authMiddleware);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatAddress = (addr: any) => ({
    id: addr.id,
    userId: addr.userId,
    title: addr.title,
    addressLine1: addr.addressLine1,
    addressLine2: addr.addressLine2,
    city: addr.city,
    state: addr.state,
    postalCode: addr.postalCode,
    country: addr.country,
    latitude: addr.latitude !== null ? Number(addr.latitude) : null,
    longitude: addr.longitude !== null ? Number(addr.longitude) : null,
    isDefault: addr.isDefault,
    createdAt: addr.createdAt instanceof Date ? addr.createdAt.toISOString() : addr.createdAt,
});

// GET /addresses
addressesApp.get('/', async (c) => {
    const userId = c.var.userId;
    try {
        const list = await db.select().from(addresses)
            .where(eq(addresses.userId, userId))
            .orderBy(desc(addresses.createdAt));

        return c.json({
            addresses: list.map(formatAddress)
        });
    } catch (error) {
        console.error('Failed to list addresses:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// POST /addresses
addressesApp.post('/', async (c) => {
    const userId = c.var.userId;
    try {
        const body = await c.req.json().catch(() => ({}));
        const parsed = CreateAddressRequestSchema.safeParse(body);
        if (!parsed.success) {
            return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
        }

        // If isDefault is true, unset default status for all other addresses
        if (parsed.data.isDefault) {
            await db.update(addresses)
                .set({ isDefault: false })
                .where(eq(addresses.userId, userId));
        }

        const inserted = await db.insert(addresses).values({
            userId,
            title: parsed.data.title || null,
            addressLine1: parsed.data.addressLine1,
            addressLine2: parsed.data.addressLine2 || null,
            city: parsed.data.city,
            state: parsed.data.state || null,
            postalCode: parsed.data.postalCode,
            country: parsed.data.country || 'US',
            latitude: parsed.data.latitude ?? null,
            longitude: parsed.data.longitude ?? null,
            isDefault: parsed.data.isDefault || false,
        }).returning();

        return c.json(formatAddress(inserted[0]));
    } catch (error) {
        console.error('Failed to create address:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// PUT /addresses/:id
addressesApp.put('/:id', async (c) => {
    const userId = c.var.userId;
    const addressId = c.req.param('id');
    try {
        const body = await c.req.json().catch(() => ({}));
        const parsed = CreateAddressRequestSchema.partial().safeParse(body);
        if (!parsed.success) {
            return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
        }

        // Verify ownership
        const existing = await db.select().from(addresses)
            .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
            .then(res => res[0]);

        if (!existing) {
            return c.json({ error: 'Address not found' }, 404);
        }

        if (parsed.data.isDefault) {
            await db.update(addresses)
                .set({ isDefault: false })
                .where(eq(addresses.userId, userId));
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateValues: any = { ...parsed.data };
        if (parsed.data.latitude !== undefined) {
            updateValues.latitude = parsed.data.latitude;
        }
        if (parsed.data.longitude !== undefined) {
            updateValues.longitude = parsed.data.longitude;
        }

        const updated = await db.update(addresses)
            .set(updateValues)
            .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
            .returning();

        return c.json(formatAddress(updated[0]));
    } catch (error) {
        console.error('Failed to update address:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// DELETE /addresses/:id
addressesApp.delete('/:id', async (c) => {
    const userId = c.var.userId;
    const addressId = c.req.param('id');
    try {
        const existing = await db.select().from(addresses)
            .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
            .then(res => res[0]);

        if (!existing) {
            return c.json({ error: 'Address not found' }, 404);
        }

        await db.delete(addresses)
            .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)));

        return c.json({ success: true });
    } catch (error) {
        console.error('Failed to delete address:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// PATCH /addresses/:id/default
addressesApp.patch('/:id/default', async (c) => {
    const userId = c.var.userId;
    const addressId = c.req.param('id');
    try {
        const existing = await db.select().from(addresses)
            .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
            .then(res => res[0]);

        if (!existing) {
            return c.json({ error: 'Address not found' }, 404);
        }

        // Clear other defaults
        await db.update(addresses)
            .set({ isDefault: false })
            .where(eq(addresses.userId, userId));

        // Set new default
        const updated = await db.update(addresses)
            .set({ isDefault: true })
            .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
            .returning();

        return c.json(formatAddress(updated[0]));
    } catch (error) {
        console.error('Failed to update default address:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

export default addressesApp;
