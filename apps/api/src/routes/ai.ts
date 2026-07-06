import { Hono } from 'hono';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { env } from '../env';
import { db, menuItems } from '@grrr/database';
import { eq, inArray, and } from 'drizzle-orm';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { GEMINI_MODEL } from '../lib/gemini';
import { estimateNutritionLocally } from '../lib/nutrition-fallback';

const aiApp = new Hono();

// Initialize the Google GenAI SDK
const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const analyzeRequestSchema = z.object({
    restaurantId: z.string().uuid(),
    cartItems: z.array(z.object({
        name: z.string(),
        quantity: z.number(),
        variant: z.string().optional().nullable(),
        addons: z.array(z.string()).optional()
    }))
});

aiApp.post('/analyze-nutrition', zValidator('json', analyzeRequestSchema), async (c) => {
    try {
        const { restaurantId, cartItems } = c.req.valid('json');

        // Fetch all active items from the same restaurant's menu for context
        // To find all menu items for the restaurant, we would normally go: restaurant -> menus -> categories -> items
        // For simplicity in the prompt, let's just get the restaurant name if possible, or all items.
        // Let's import menus, menuCategories from database if we want to filter by restaurant.
        const { menus, menuCategories } = await import('@grrr/database');
        
        const restaurantMenus = await db.select().from(menus).where(eq(menus.restaurantId, restaurantId));
        let allAvailableItems: string[] = [];
        
        if (restaurantMenus.length > 0) {
            const categories = await db.select().from(menuCategories).where(inArray(menuCategories.menuId, restaurantMenus.map(m => m.id)));
            if (categories.length > 0) {
                const items = await db.select().from(menuItems).where(
                    and(
                        inArray(menuItems.categoryId, categories.map(c => c.id)),
                        eq(menuItems.isDeleted, false)
                    )
                );
                allAvailableItems = items.map(i => i.name);
            }
        }

const prompt = `
You are an expert AI Nutrition Assistant.
Analyze the following user's food order and estimate the total nutritional values. 
Order items:
${JSON.stringify(cartItems, null, 2)}

Provide one concise "Health Insight" about this order (e.g. "Swap Fries -> Salad to save ~280 kcal.").
Also, recommend exactly one "Better Alternative" from the restaurant's menu if possible, and provide a brief reason why it's a better option (e.g. "Lower in saturated fat and higher in protein").

CRITICAL RULE:
- Do NOT recommend a "Better Alternative" that is already present in the user's order items. The alternative MUST be a new item from the available menu list below.

Here are the available items on the restaurant's menu:
${allAvailableItems.join(', ')}

Return ONLY JSON matching the provided schema. No markdown, no explanations.
`;

        const responseSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                calories: { type: Type.INTEGER, description: "Total estimated calories in kcal" },
                protein: { type: Type.INTEGER, description: "Total estimated protein in grams" },
                carbs: { type: Type.INTEGER, description: "Total estimated carbohydrates in grams" },
                fat: { type: Type.INTEGER, description: "Total estimated fat in grams" },
                healthInsight: { type: Type.STRING, description: "A concise health insight about the order" },
                betterAlternative: { type: Type.STRING, description: "A recommended alternative item from the available menu" },
                alternativeReason: { type: Type.STRING, description: "A brief explanation of why this alternative is healthier" },
            },
            required: ["calories", "protein", "carbs", "fat", "healthInsight", "betterAlternative", "alternativeReason"],
        };

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
                temperature: 0.2,
            }
        });

        const text = response.text;
        if (!text) {
            throw new Error("No response from AI");
        }
        
        const data = JSON.parse(text);
        return c.json(data);
    } catch (error) {
        console.error('AI Analysis Error:', error);

        try {
            const { restaurantId, cartItems } = c.req.valid('json');
            const { menus, menuCategories } = await import('@grrr/database');

            const restaurantMenus = await db.select().from(menus).where(eq(menus.restaurantId, restaurantId));
            let allAvailableItems: string[] = [];

            if (restaurantMenus.length > 0) {
                const categories = await db.select().from(menuCategories).where(inArray(menuCategories.menuId, restaurantMenus.map(m => m.id)));
                if (categories.length > 0) {
                    const items = await db.select().from(menuItems).where(
                        and(
                            inArray(menuItems.categoryId, categories.map(cat => cat.id)),
                            eq(menuItems.isDeleted, false)
                        )
                    );
                    allAvailableItems = items.map(i => i.name);
                }
            }

            const fallback = estimateNutritionLocally(cartItems, allAvailableItems);
            return c.json({ ...fallback, source: 'estimated' });
        } catch (fallbackError) {
            console.error('Nutrition fallback error:', fallbackError);
            return c.json({ error: 'Failed to analyze nutrition' }, 500);
        }
    }
});

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

const chatRequestSchema = z.object({
    messages: z.array(z.object({
        role: z.enum(['user', 'model']),
        text: z.string()
    })),
    lat: z.number().optional(),
    lng: z.number().optional()
});

aiApp.post('/chat', zValidator('json', chatRequestSchema), async (c) => {
    try {
        const { messages, lat, lng } = c.req.valid('json');

        const { restaurants, branches, users, orders } = await import('@grrr/database');
        const { eq, desc } = await import('drizzle-orm');

        // Fetch all restaurants with their branch locations
        const allBranches = await db.select({
            id: restaurants.id,
            name: restaurants.name,
            cuisineType: restaurants.cuisineType,
            rating: restaurants.rating,
            latitude: branches.latitude,
            longitude: branches.longitude
        }).from(branches).innerJoin(restaurants, eq(branches.restaurantId, restaurants.id)).where(eq(restaurants.isActive, true));
        
        let availableRestaurants = allBranches;
        
        // Filter by 15km radius if location is provided
        if (lat !== undefined && lng !== undefined) {
            availableRestaurants = allBranches.filter(r => {
                if (r.latitude === null || r.longitude === null) return false;
                const dist = calculateDistanceKm(lat, lng, r.latitude, r.longitude);
                return dist <= 15;
            });
        }

        const restaurantContext = availableRestaurants.map(r => 
            `- ${r.name} (${r.cuisineType}, Rating: ${r.rating})`
        ).join('\n');

        let orderHistoryContext = '';
        const authHeader = c.req.header('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.substring(7);
                const { adminAuth } = await import('../lib/firebase');
                let uid = '';
                
                // Decode token depending on if it is a mock token or real Firebase token
                if (token.startsWith('mock-')) {
                    uid = token;
                } else {
                    const decoded = await adminAuth.verifyIdToken(token);
                    uid = decoded.uid;
                }
                
                const dbUser = await db.query.users.findFirst({ where: eq(users.firebaseUid, uid) });
                
                if (dbUser) {
                    const userOrdersRaw = await db.select({
                        orderId: orders.id,
                        restaurantName: restaurants.name,
                        status: orders.status,
                        total: orders.total,
                        createdAt: orders.createdAt
                    })
                    .from(orders)
                    .innerJoin(restaurants, eq(orders.restaurantId, restaurants.id))
                    .where(eq(orders.userId, dbUser.id))
                    .orderBy(desc(orders.createdAt))
                    .limit(5);
                    
                    if (userOrdersRaw.length > 0) {
                        orderHistoryContext = `\nUser's Recent Order History:\n` + userOrdersRaw.map(o => `- Order at ${o.restaurantName} (Status: ${o.status}, Total: $${(o.total/100).toFixed(2)})`).join('\n');
                    } else {
                        orderHistoryContext = `\nUser has no order history yet.`;
                    }
                }
            } catch(e) {
                // Ignore if auth fails, they just don't get order history
            }
        }

        const systemInstruction = `
You are the official AI Assistant for the Grrr Food Delivery App.
Your ONLY purpose is to help users with food delivery, discovering restaurants, recommending dishes, and answering questions about the Grrr platform.

CRITICAL RULES (GUARDRAILS):
1. If the user asks about ANYTHING unrelated to food, restaurants, or the Grrr app (e.g., coding, politics, general knowledge, math, history), you MUST politely refuse to answer and redirect them to food delivery.
2. If a complex question occurs about the platform, or if the user wants to give feedback or complain, you MUST provide the customer care contact email: support@grrr.com.
3. Be concise, friendly, and helpful.

Available Restaurants in the user's area:
${restaurantContext || 'No restaurants currently available in this area.'}
${orderHistoryContext}
`;

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: messages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            })),
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
            }
        });

        const text = response.text;
        if (!text) {
            throw new Error("No response from AI");
        }
        
        return c.json({ reply: text });
    } catch (error) {
        console.error('AI Chat Error:', error);
        return c.json({ error: 'Failed to chat' }, 500);
    }
});

export default aiApp;
