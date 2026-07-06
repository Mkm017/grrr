//D:\Grrr\apps\api\src\routes\catalog.ts
import { Hono } from 'hono';
import { db, restaurants, branches, menus, menuCategories, menuItems, itemVariants, addonGroups, addons } from '@grrr/database';
import { eq, inArray, asc, and } from 'drizzle-orm';
import {
    RestaurantsResponseSchema,
    RestaurantSchema,
    RestaurantMenuResponseSchema
} from '@grrr/contracts';

const catalogApp = new Hono();

// GET /restaurants - List all active restaurants with their branches
catalogApp.get('/', async (c) => {
    try {
        const list = await db.select().from(restaurants).where(eq(restaurants.isActive, true));
        const allBranches = await db.select().from(branches);

        const formatted = list.map(r => {
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

        const validated = RestaurantsResponseSchema.parse({ restaurants: formatted });
        return c.json(validated);
    } catch (error) {
        console.error('Failed to list restaurants:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// GET /restaurants/:id - Get a specific restaurant by ID
catalogApp.get('/:id', async (c) => {
    const id = c.req.param('id');
    try {
        const rest = await db.select().from(restaurants).where(eq(restaurants.id, id)).then(res => res[0]);
        if (!rest) {
            return c.json({ error: 'Restaurant not found' }, 404);
        }

        const restBranches = await db.select().from(branches).where(eq(branches.restaurantId, rest.id));

        const formatted = {
            id: rest.id,
            name: rest.name,
            description: rest.description || null,
            cuisineType: rest.cuisineType,
            rating: Number(rest.rating),
            deliveryTime: rest.deliveryTime,
            imageEmoji: rest.imageEmoji,
            isActive: rest.isActive,
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
            createdAt: rest.createdAt.toISOString(),
        };

        const validated = RestaurantSchema.parse(formatted);
        return c.json(validated);
    } catch (error) {
        console.error(`Failed to get restaurant ${id}:`, error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// GET /restaurants/:id/menu - Get nested menu catalog for a restaurant
catalogApp.get('/:id/menu', async (c) => {
    const restaurantId = c.req.param('id');
    try {
        // 1. Fetch active menu
        const menuRow = await db.select()
            .from(menus)
            .where(eq(menus.restaurantId, restaurantId))
            .then(res => res.find(m => m.isActive) || res[0]);

        if (!menuRow) {
            return c.json({ menu: null });
        }

        // 2. Fetch categories
        const categoriesList = await db.select()
            .from(menuCategories)
            .where(eq(menuCategories.menuId, menuRow.id))
            .orderBy(asc(menuCategories.sortOrder));

        if (categoriesList.length === 0) {
            return c.json({
                menu: {
                    id: menuRow.id,
                    restaurantId: menuRow.restaurantId,
                    name: menuRow.name,
                    description: menuRow.description || null,
                    isActive: menuRow.isActive,
                    categories: [],
                    createdAt: menuRow.createdAt.toISOString(),
                }
            });
        }

        const categoryIds = categoriesList.map(cat => cat.id);

        // 3. Fetch items in these categories
        const itemsList = await db.select()
            .from(menuItems)
            .where(and(
                inArray(menuItems.categoryId, categoryIds),
                eq(menuItems.isDeleted, false)
            ))
            .orderBy(asc(menuItems.sortOrder));

        const itemIds = itemsList.map(item => item.id);

        // 4. Fetch variants and addon groups if there are items
        const variantsList = itemIds.length > 0
            ? await db.select().from(itemVariants).where(inArray(itemVariants.itemId, itemIds))
            : [];

        const addonGroupsList = itemIds.length > 0
            ? await db.select().from(addonGroups).where(inArray(addonGroups.itemId, itemIds))
            : [];

        const groupIds = addonGroupsList.map(group => group.id);

        // 5. Fetch addons in these groups
        const addonsList = groupIds.length > 0
            ? await db.select().from(addons).where(inArray(addons.groupId, groupIds))
            : [];

        // 6. Compile nested response
        const menuFormatted = {
            id: menuRow.id,
            restaurantId: menuRow.restaurantId,
            name: menuRow.name,
            description: menuRow.description || null,
            isActive: menuRow.isActive,
            categories: categoriesList.map(cat => {
                const catItems = itemsList.filter(item => item.categoryId === cat.id);
                return {
                    id: cat.id,
                    menuId: cat.menuId,
                    name: cat.name,
                    description: cat.description || null,
                    sortOrder: cat.sortOrder,
                    items: catItems.map(item => {
                        const itemVariantsList = variantsList.filter(v => v.itemId === item.id);
                        const itemGroupsList = addonGroupsList.filter(g => g.itemId === item.id);
                        return {
                            id: item.id,
                            categoryId: item.categoryId,
                            name: item.name,
                            description: item.description || null,
                            price: item.price,
                            imageEmoji: item.imageEmoji || null,
                            imageUrl: item.imageUrl || null,
                            isVegetarian: item.isVegetarian,
                            isAvailable: item.isAvailable,
                            sortOrder: item.sortOrder,
                            variants: itemVariantsList.map(v => ({
                                id: v.id,
                                itemId: v.itemId,
                                name: v.name,
                                priceOverride: v.priceOverride || null,
                                isAvailable: v.isAvailable,
                                createdAt: v.createdAt.toISOString(),
                            })),
                            addonGroups: itemGroupsList.map(g => {
                                const groupAddonsList = addonsList.filter(a => a.groupId === g.id);
                                return {
                                    id: g.id,
                                    itemId: g.itemId,
                                    name: g.name,
                                    minSelection: g.minSelection,
                                    maxSelection: g.maxSelection,
                                    addons: groupAddonsList.map(a => ({
                                        id: a.id,
                                        groupId: a.groupId,
                                        name: a.name,
                                        price: a.price,
                                        isAvailable: a.isAvailable,
                                        createdAt: a.createdAt.toISOString(),
                                    })),
                                    createdAt: g.createdAt.toISOString(),
                                };
                            }),
                            createdAt: item.createdAt.toISOString(),
                        };
                    }),
                    createdAt: cat.createdAt.toISOString(),
                };
            }),
            createdAt: menuRow.createdAt.toISOString(),
        };

        const validated = RestaurantMenuResponseSchema.parse({ menu: menuFormatted });
        return c.json(validated);
    } catch (error) {
        console.error(`Failed to get menu for restaurant ${restaurantId}:`, error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

export default catalogApp;
