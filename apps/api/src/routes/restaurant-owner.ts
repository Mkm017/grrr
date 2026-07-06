//D:\Grrr\apps\api\src\routes\restaurant-owner.ts
import { Hono } from 'hono'
import { db, restaurants, branches, menus, menuCategories, menuItems, itemVariants, addonGroups, addons, users } from '@grrr/database'
import { eq } from 'drizzle-orm'
import { authMiddleware, AuthVariables } from '../middleware/auth'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { calculateRestaurantNetRevenue } from '../lib/pricing'

const restaurantOwnerRouter = new Hono<{ Variables: AuthVariables }>()

// Public login route for restaurants
restaurantOwnerRouter.post('/login', async (c) => {
    try {
        const { username, password } = await c.req.json()
        const credentials: Record<string, { name: string; restaurantName: string }> = {
            sizzle: { name: 'Sizzle & Spice Owner', restaurantName: 'Sizzle & Spice' },
            dough: { name: 'The Dough Factory Owner', restaurantName: 'The Dough Factory' },
            green: { name: 'Green Garden Salad Owner', restaurantName: 'Green Garden Salad' },
            bites: { name: 'Bites & Bowls Owner', restaurantName: 'Bites & Bowls' },
        }

        if (credentials[username] && password === 'password123') {
            return c.json({
                success: true,
                token: `mock-restaurant-token-${username}`,
                user: {
                    name: credentials[username].name,
                    email: `owner@${username}.com`,
                    role: 'restaurant'
                }
            })
        }

        return c.json({ error: 'Invalid username or password' }, 401)
    } catch (error) {
        return c.json({ error: 'Login failed' }, 500)
    }
})

// Protected routes below
restaurantOwnerRouter.use('*', authMiddleware)

// 1. Create/Update Restaurant
const restaurantSchema = z.object({
    name: z.string().min(2),
    description: z.string().nullable().optional(),
    cuisineType: z.string(),
    deliveryTime: z.string(),
    imageEmoji: z.string().default('🍽️'),
    branches: z.array(z.object({
        name: z.string(),
        addressLine1: z.string(),
        city: z.string(),
        latitude: z.number().nullable().optional(),
        longitude: z.number().nullable().optional(),
        phoneNumber: z.string().nullable().optional()
    })).optional()
})

restaurantOwnerRouter.post('/restaurant', zValidator('json', restaurantSchema), async (c) => {
    const data = c.req.valid('json')

    try {
        const [restaurant] = await db.insert(restaurants).values({
            name: data.name,
            description: data.description || null,
            cuisineType: data.cuisineType,
            deliveryTime: data.deliveryTime,
            imageEmoji: data.imageEmoji,
            isActive: true
        }).returning()

        // Insert branches if provided
        if (data.branches?.length) {
            for (const branch of data.branches) {
                await db.insert(branches).values({
                    restaurantId: restaurant.id,
                    name: branch.name,
                    addressLine1: branch.addressLine1,
                    city: branch.city,
                    latitude: branch.latitude ?? null,
                    longitude: branch.longitude ?? null,
                    phoneNumber: branch.phoneNumber || null
                })
            }
        }

        return c.json({ restaurant }, 201)
    } catch (error) {
        console.error('Create restaurant error:', error)
        return c.json({ error: 'Failed to create restaurant' }, 500)
    }
})

// 2. Get My Restaurants
restaurantOwnerRouter.get('/my-restaurants', async (c) => {
    try {
        const userId = c.get('userId')
        const user = await db.select().from(users).where(eq(users.id, userId)).then(res => res[0])

        let myRestaurants = await db.select().from(restaurants)

        if (user && user.firebaseUid.startsWith('restaurant_')) {
            const username = user.firebaseUid.replace('restaurant_', '')
            const nameMap: Record<string, string> = {
                sizzle: 'Sizzle & Spice',
                dough: 'The Dough Factory',
                green: 'Green Garden Salad',
                bites: 'Bites & Bowls',
            }
            const targetName = nameMap[username]
            if (targetName) {
                myRestaurants = myRestaurants.filter(r => r.name.toLowerCase() === targetName.toLowerCase())
            }
        }

        const allBranches = await db.select().from(branches)
        const allMenus = await db.select().from(menus)

        const formatted = myRestaurants.map(r => ({
            ...r,
            branches: allBranches.filter(b => b.restaurantId === r.id),
            menus: allMenus.filter(m => m.restaurantId === r.id)
        }))

        return c.json({ restaurants: formatted })
    } catch (error) {
        console.error('Failed to get my restaurants:', error)
        return c.json({ error: 'Failed to fetch restaurants' }, 500)
    }
})

// 3. Create/Update Menu Item
const menuSchema = z.object({
    name: z.string().min(2),
    description: z.string().nullable().optional(),
    isActive: z.boolean().default(true),
})

restaurantOwnerRouter.post('/menu/:restaurantId', zValidator('json', menuSchema), async (c) => {
    const restaurantId = c.req.param('restaurantId')
    const data = c.req.valid('json')

    try {
        let menu = await db.select().from(menus).where(eq(menus.restaurantId, restaurantId)).then(res => res[0])

        if (menu) {
            const [updated] = await db.update(menus).set({
                name: data.name,
                description: data.description || null,
                isActive: data.isActive,
            }).where(eq(menus.id, menu.id)).returning()
            return c.json({ menu: updated }, 200)
        }

        const [created] = await db.insert(menus).values({
            restaurantId,
            name: data.name,
            description: data.description || null,
            isActive: data.isActive,
        }).returning()

        return c.json({ menu: created }, 201)
    } catch (error) {
        console.error('Create/update menu error:', error)
        return c.json({ error: 'Failed to create menu' }, 500)
    }
})

const menuItemSchema = z.object({
    name: z.string(),
    description: z.string().nullable().optional(),
    price: z.number().int(),
    imageEmoji: z.string().nullable().optional(),
    imageUrl: z.string().min(1).nullable().optional(),
    isAvailable: z.boolean().default(true),
    isVegetarian: z.boolean().default(false),
    category: z.string().optional().default('Popular Items'),
    variants: z.array(z.object({
        name: z.string(),
        priceOverride: z.number().int().nullable().optional()
    })).optional(),
    addonGroups: z.array(z.object({
        name: z.string(),
        minSelection: z.number().int().default(0),
        maxSelection: z.number().int().default(1),
        addons: z.array(z.object({
            name: z.string(),
            price: z.number().int()
        }))
    })).optional()
})

restaurantOwnerRouter.post('/menu/:restaurantId/items', zValidator('json', menuItemSchema), async (c) => {
    const restaurantId = c.req.param('restaurantId')
    const data = c.req.valid('json')

    try {
        // Find or create menu
        let menu = await db.select().from(menus).where(eq(menus.restaurantId, restaurantId)).then(res => res[0])

        if (!menu) {
            [menu] = await db.insert(menus).values({
                restaurantId,
                name: 'Main Menu',
                isActive: true
            }).returning()
        }

        // Find or create requested category
        const allCategories = await db.select().from(menuCategories).where(eq(menuCategories.menuId, menu.id))
        let category = allCategories.find(c => c.name.toLowerCase() === data.category.toLowerCase())

        if (!category) {
            [category] = await db.insert(menuCategories).values({
                menuId: menu.id,
                name: data.category,
                sortOrder: allCategories.length
            }).returning()
        }

        // Create menu item
        const [item] = await db.insert(menuItems).values({
            categoryId: category.id,
            name: data.name,
            description: data.description || null,
            price: data.price,
            imageEmoji: data.imageEmoji || null,
            imageUrl: data.imageUrl || null,
            isVegetarian: data.isVegetarian,
            isAvailable: data.isAvailable
        }).returning()

        // Create variants
        if (data.variants?.length) {
            for (const v of data.variants) {
                await db.insert(itemVariants).values({
                    itemId: item.id,
                    name: v.name,
                    priceOverride: v.priceOverride ?? null,
                    isAvailable: true
                })
            }
        }

        // Create addon groups with addons
        if (data.addonGroups?.length) {
            for (const group of data.addonGroups) {
                const [g] = await db.insert(addonGroups).values({
                    itemId: item.id,
                    name: group.name,
                    minSelection: group.minSelection,
                    maxSelection: group.maxSelection
                }).returning()

                for (const addon of group.addons) {
                    await db.insert(addons).values({
                        groupId: g.id,
                        name: addon.name,
                        price: addon.price,
                        isAvailable: true
                    })
                }
            }
        }

        return c.json({ item }, 201)
    } catch (error) {
        console.error('Create menu item error:', error)
        return c.json({ error: 'Failed to create menu item' }, 500)
    }
})

// Delete Menu Item
restaurantOwnerRouter.delete('/menu/:restaurantId/items/:itemId', async (c) => {
    const restaurantId = c.req.param('restaurantId')
    const itemId = c.req.param('itemId')

    try {
        // Soft delete the item to prevent foreign key errors with past orders
        await db.update(menuItems).set({ isDeleted: true }).where(eq(menuItems.id, itemId))
        return c.json({ success: true })
    } catch (error) {
        console.error('Delete menu item error:', error)
        return c.json({ error: 'Failed to delete menu item' }, 500)
    }
})

// 4. Get Restaurant Stats
restaurantOwnerRouter.get('/stats/:restaurantId', async (c) => {
    const restaurantId = c.req.param('restaurantId')
    try {
        const { orders } = await import('@grrr/database')
        const allOrders = await db.select().from(orders).where(eq(orders.restaurantId, restaurantId))
        
        const totalRevenue = allOrders
            .filter(o => o.status === 'delivered')
            .reduce((sum, o) => sum + calculateRestaurantNetRevenue(o), 0)
        const activeOrders = allOrders.filter(o => ['pending', 'accepted', 'preparing', 'ready', 'picked_up', 'out_for_delivery'].includes(o.status)).length
        const totalOrders = allOrders.length

        return c.json({ totalRevenue, activeOrders, totalOrders })
    } catch (error) {
        console.error('Stats error:', error)
        return c.json({ error: 'Failed to fetch stats' }, 500)
    }
})

// 5. Update Restaurant Location
restaurantOwnerRouter.patch('/location/:restaurantId', async (c) => {
    const restaurantId = c.req.param('restaurantId')
    try {
        const body = await c.req.json()
        const { addressLine1, city, postalCode, latitude, longitude } = body
        
        // Find main branch
        const branch = await db.select().from(branches).where(eq(branches.restaurantId, restaurantId)).then(res => res[0])
        
        if (branch) {
            await db.update(branches).set({
                addressLine1: addressLine1 || branch.addressLine1,
                city: city || branch.city,
                latitude: latitude !== undefined ? latitude : branch.latitude,
                longitude: longitude !== undefined ? longitude : branch.longitude
            }).where(eq(branches.id, branch.id))
        }

        return c.json({ success: true })
    } catch (error) {
        console.error('Update location error:', error)
        return c.json({ error: 'Failed to update location' }, 500)
    }
})

export { restaurantOwnerRouter }