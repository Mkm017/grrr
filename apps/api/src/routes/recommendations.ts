import { Hono } from 'hono';
import { db, users, orders, restaurants, branches, menuItems, menuCategories, menus, orderItems } from '@grrr/database';
import { eq, desc, inArray } from 'drizzle-orm';
import { authMiddleware, AuthVariables } from '../middleware/auth';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { env } from '../env';
import { GEMINI_MODEL } from '../lib/gemini';

const recommendationsApp = new Hono<{ Variables: AuthVariables }>();
const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

recommendationsApp.use('/*', authMiddleware);

recommendationsApp.get('/', async (c) => {
    try {
        const userId = c.get('userId');
        const latStr = c.req.query('lat');
        const lngStr = c.req.query('lng');

        const lat = latStr ? parseFloat(latStr) : undefined;
        const lng = lngStr ? parseFloat(lngStr) : undefined;

        // 1. Fetch user order history without relations block
        const userOrdersRaw = await db.select({
            orderId: orders.id,
            createdAt: orders.createdAt,
            restaurantName: restaurants.name,
            itemName: orderItems.itemName
        })
        .from(orders)
        .innerJoin(restaurants, eq(orders.restaurantId, restaurants.id))
        .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
        .where(eq(orders.userId, userId))
        .orderBy(desc(orders.createdAt))
        .limit(30);

        const groupedOrders = userOrdersRaw.reduce((acc, row) => {
            if (!acc[row.orderId]) {
                acc[row.orderId] = {
                    createdAt: row.createdAt,
                    restaurantName: row.restaurantName,
                    items: []
                };
            }
            acc[row.orderId].items.push(row.itemName);
            return acc;
        }, {} as Record<string, { createdAt: Date, restaurantName: string, items: string[] }>);

        const historyContext = Object.values(groupedOrders).map(o => {
            return `Ordered ${o.items.join(', ')} from ${o.restaurantName} at ${new Date(o.createdAt).toLocaleTimeString()}`;
        }).join('\n');

        // 2. Fetch restaurants within 15km
        const allBranches = await db.select({
            id: restaurants.id,
            name: restaurants.name,
            cuisineType: restaurants.cuisineType,
            rating: restaurants.rating,
            latitude: branches.latitude,
            longitude: branches.longitude
        }).from(branches).innerJoin(restaurants, eq(branches.restaurantId, restaurants.id)).where(eq(restaurants.isActive, true));

        let availableRestaurants = allBranches;
        if (lat !== undefined && lng !== undefined) {
            availableRestaurants = allBranches.filter(r => {
                if (r.latitude === null || r.longitude === null) return false;
                return calculateDistanceKm(lat, lng, r.latitude, r.longitude) <= 15;
            });
        }

        if (availableRestaurants.length === 0) {
            return c.json({ recommendations: [] });
        }

        // 3. Fetch top menu items for these restaurants
        const restaurantIds = availableRestaurants.map(r => r.id);
        const availableItems = await db.select({
            id: menuItems.id,
            name: menuItems.name,
            restaurantId: restaurants.id,
            restaurantName: restaurants.name
        })
        .from(menuItems)
        .innerJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
        .innerJoin(menus, eq(menuCategories.menuId, menus.id))
        .innerJoin(restaurants, eq(menus.restaurantId, restaurants.id))
        .where(
            inArray(restaurants.id, restaurantIds)
        )
        .limit(50); // limit to avoid massive prompts

        const itemsContext = availableItems.map(i => 
            `- ID: ${i.id} | Item: ${i.name} | Restaurant: ${i.restaurantName}`
        ).join('\n');

        // 4. AI Processing
        const currentTime = new Date().toLocaleTimeString();
        
        const systemInstruction = `
You are an advanced food recommendation engine.
Current local time: ${currentTime}
User's past order history:
${historyContext || 'No past orders.'}

Available Menu Items (choose from these IDs ONLY):
${itemsContext}

Based on the user's order history patterns (cuisines, timings) and the current time of day, select the top 3 best menu items for them right now.
Provide a highly personalized 'reason' string for each recommendation (e.g. "Since you often order spicy food on Friday nights, you'll love these Signature Wings.").

CRITICAL RULES:
1. You MUST select items from AT LEAST 2 DIFFERENT RESTAURANTS. Do not recommend 3 items from the exact same restaurant. Diversify the options!
2. Return ONLY valid JSON matching the schema.
`;

        const responseSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                recommendations: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            itemId: { type: Type.STRING },
                            reason: { type: Type.STRING }
                        },
                        required: ["itemId", "reason"]
                    }
                }
            },
            required: ["recommendations"]
        };

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: "Generate my recommendations",
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema,
                temperature: 0.3,
            }
        });

        const text = response.text;
        if (!text) {
            return c.json({ recommendations: [] });
        }
        
        const data = JSON.parse(text) as { recommendations: { itemId: string, reason: string }[] };
        const recommendedIds = data.recommendations.map(r => r.itemId).filter(id => id);

        if (recommendedIds.length === 0) {
            return c.json({ recommendations: [] });
        }

        // 5. Fetch full item details for the frontend
        const fullItemsRaw = await db.select({
            item: menuItems,
            restaurant: restaurants
        })
        .from(menuItems)
        .innerJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
        .innerJoin(menus, eq(menuCategories.menuId, menus.id))
        .innerJoin(restaurants, eq(menus.restaurantId, restaurants.id))
        .where(inArray(menuItems.id, recommendedIds));

        const formattedRecommendations = data.recommendations.map(rec => {
            const match = fullItemsRaw.find(row => row.item.id === rec.itemId);
            if (!match) return null;
            return {
                item: {
                    id: match.item.id,
                    name: match.item.name,
                    description: match.item.description,
                    price: match.item.price,
                    imageEmoji: match.item.imageEmoji,
                    isVegetarian: match.item.isVegetarian,
                },
                restaurant: {
                    id: match.restaurant.id,
                    name: match.restaurant.name,
                    rating: match.restaurant.rating,
                    cuisineType: match.restaurant.cuisineType
                },
                reason: rec.reason
            };
        }).filter(Boolean);

        return c.json({ recommendations: formattedRecommendations });
    } catch (error) {
        console.error('Recommendation Engine Error:', error);
        return c.json({ recommendations: [] });
    }
});

export default recommendationsApp;
