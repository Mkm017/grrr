//D:\Grrr\apps\api\src\routes\catalog.test.ts
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import catalogApp from './catalog';

const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';
const MENU_ID = '22222222-2222-2222-2222-222222222222';
const CATEGORY_ID = '33333333-3333-3333-3333-333333333333';
const ITEM_ID = '44444444-4444-4444-4444-444444444444';
const BRANCH_ID = '55555555-5555-5555-5555-555555555555';

let dbSelectResult: any[] = [];
let mockMenuRow: any = null;
let mockCategories: any[] = [];
let mockItems: any[] = [];
let mockVariants: any[] = [];
let mockAddonGroups: any[] = [];
let mockAddons: any[] = [];
let mockBranches: any[] = [];

vi.mock('@grrr/database', () => {
    const chain = {
        select: () => chain,
        from: (table: any) => {
            chain.currentTable = table;
            return chain;
        },
        where: () => chain,
        orderBy: () => chain,
        currentTable: null as any,
        then: (cb: any) => {
            let result = dbSelectResult;
            if (chain.currentTable && chain.currentTable.name === 'menus') {
                result = mockMenuRow ? [mockMenuRow] : [];
            } else if (chain.currentTable && chain.currentTable.name === 'menu_categories') {
                result = mockCategories;
            } else if (chain.currentTable && chain.currentTable.name === 'menu_items') {
                result = mockItems;
            } else if (chain.currentTable && chain.currentTable.name === 'item_variants') {
                result = mockVariants;
            } else if (chain.currentTable && chain.currentTable.name === 'addon_groups') {
                result = mockAddonGroups;
            } else if (chain.currentTable && chain.currentTable.name === 'addons') {
                result = mockAddons;
            } else if (chain.currentTable && chain.currentTable.name === 'restaurant_branches') {
                result = mockBranches;
            }
            return Promise.resolve(result).then(cb);
        },
    };

    return {
        db: chain,
        restaurants: { name: 'restaurants', isActive: 'is_active', id: 'id' },
        branches: { name: 'restaurant_branches', restaurantId: 'restaurant_id', id: 'id' },
        menus: { name: 'menus', restaurantId: 'restaurant_id', id: 'id', isActive: 'is_active' },
        menuCategories: { name: 'menu_categories', menuId: 'menu_id', id: 'id', sortOrder: 'sort_order' },
        menuItems: { name: 'menu_items', categoryId: 'category_id', id: 'id', sortOrder: 'sort_order' },
        itemVariants: { name: 'item_variants', itemId: 'item_id', id: 'id' },
        addonGroups: { name: 'addon_groups', itemId: 'item_id', id: 'id' },
        addons: { name: 'addons', groupId: 'group_id', id: 'id' },
    };
});

describe('catalog routes', () => {
    let app: Hono;

    beforeEach(() => {
        vi.clearAllMocks();
        dbSelectResult = [];
        mockMenuRow = null;
        mockCategories = [];
        mockItems = [];
        mockVariants = [];
        mockAddonGroups = [];
        mockAddons = [];
        mockBranches = [];

        app = new Hono();
        app.route('/restaurants', catalogApp);
    });

    it('should list all active restaurants', async () => {
        dbSelectResult = [
            {
                id: RESTAURANT_ID,
                name: 'Sizzle & Spice',
                description: 'Burgers',
                cuisineType: 'Fast Food',
                rating: 4.8,
                deliveryTime: '20-30 min',
                imageEmoji: '🍔',
                isActive: true,
                createdAt: new Date(),
            }
        ];

        mockBranches = [
            {
                id: BRANCH_ID,
                restaurantId: RESTAURANT_ID,
                name: 'Connaught Place',
                addressLine1: 'CP',
                addressLine2: null,
                city: 'New Delhi',
                latitude: 28.6,
                longitude: 77.2,
                phoneNumber: '1234567890',
            }
        ];

        const res = await app.request('/restaurants');
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.restaurants).toHaveLength(1);
        expect(data.restaurants[0].name).toBe('Sizzle & Spice');
        expect(data.restaurants[0].rating).toBe(4.8);
        expect(data.restaurants[0].branches).toHaveLength(1);
    });

    it('should return a specific restaurant by ID', async () => {
        dbSelectResult = [
            {
                id: RESTAURANT_ID,
                name: 'Sizzle & Spice',
                description: 'Burgers',
                cuisineType: 'Fast Food',
                rating: 4.8,
                deliveryTime: '20-30 min',
                imageEmoji: '🍔',
                isActive: true,
                createdAt: new Date(),
            }
        ];

        mockBranches = [
            {
                id: BRANCH_ID,
                restaurantId: RESTAURANT_ID,
                name: 'Connaught Place',
                addressLine1: 'CP',
                addressLine2: null,
                city: 'New Delhi',
                latitude: 28.6,
                longitude: 77.2,
                phoneNumber: '1234567890',
            }
        ];

        const res = await app.request(`/restaurants/${RESTAURANT_ID}`);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.name).toBe('Sizzle & Spice');
        expect(data.branches).toHaveLength(1);
    });

    it('should return 404 if restaurant does not exist', async () => {
        dbSelectResult = [];

        const res = await app.request('/restaurants/00000000-0000-0000-0000-000000000000');
        expect(res.status).toBe(404);
    });

    it('should return empty menu if restaurant has no active menu', async () => {
        mockMenuRow = null;

        const res = await app.request(`/restaurants/${RESTAURANT_ID}/menu`);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.menu).toBeNull();
    });

    it('should return nested menu catalog structure', async () => {
        mockMenuRow = {
            id: MENU_ID,
            restaurantId: RESTAURANT_ID,
            name: 'Main Menu',
            description: 'Standard',
            isActive: true,
            createdAt: new Date(),
        };

        mockCategories = [
            {
                id: CATEGORY_ID,
                menuId: MENU_ID,
                name: 'Burgers',
                description: null,
                sortOrder: 1,
                createdAt: new Date(),
            }
        ];

        mockItems = [
            {
                id: ITEM_ID,
                categoryId: CATEGORY_ID,
                name: 'Cheeseburger',
                description: 'Classic',
                price: 999,
                imageEmoji: '🍔',
                isAvailable: true,
                sortOrder: 1,
                createdAt: new Date(),
            }
        ];

        mockVariants = [];
        mockAddonGroups = [];
        mockAddons = [];

        const res = await app.request(`/restaurants/${RESTAURANT_ID}/menu`);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.menu.name).toBe('Main Menu');
        expect(data.menu.categories).toHaveLength(1);
        expect(data.menu.categories[0].items).toHaveLength(1);
        expect(data.menu.categories[0].items[0].name).toBe('Cheeseburger');
        expect(data.menu.categories[0].items[0].price).toBe(999);
    });
});
