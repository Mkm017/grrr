import { db } from './index';
import {
    restaurants,
    branches,
    businessHours,
    menus,
    menuCategories,
    menuItems,
    itemVariants,
    addonGroups,
    addons
} from './schema';

const IMG = {
    burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900',
    chickenBurger: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=900',
    veggieBurger: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=900',
    baconBurger: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=900',
    fries: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=900',
    onionRings: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=900',
    wings: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=900',
    milkshake: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900',
    cola: 'https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=900',
    lemonade: 'https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=900',
    brownie: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=900',
    margherita: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=900',
    pepperoni: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=900',
    bbqPizza: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900',
    fourCheese: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900',
    carbonara: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=900',
    arrabiata: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=900',
    pestoPasta: 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=900',
    bruschetta: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=900',
    garlicBread: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=900',
    limonata: 'https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=900',
    tiramisu: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=900',
    avocadoSalad: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=900',
    buddhaBowl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900',
    quinoaBowl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=900',
    caesarSalad: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=900',
    warmBowl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=900',
    greenJuice: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=900',
    orangeJuice: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900',
    berrySmoothie: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=900',
    poke: 'https://images.unsplash.com/photo-1546069901-d5bfd2cbfb1f?w=900',
    salmonPoke: 'https://images.unsplash.com/photo-1546069901-d5bfd2cbfb1f?w=900',
    veggiePoke: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=900',
    sushi: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=900',
    dragonRoll: 'https://images.unsplash.com/photo-1617196034183-421b4917c92d?w=900',
    ramen: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=900',
    spicyRamen: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=900',
    misoRamen: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=900',
    gyoza: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=900',
    edamame: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=900',
};

async function main() {
    console.log('--- Database Seeding Started ---');

    try {
        console.log('Clearing existing catalog tables...');
        const { orderItems, orders, favorites, deliveryAssignments } = await import('./schema');
        await db.delete(deliveryAssignments);
        await db.delete(orderItems);
        await db.delete(orders);
        await db.delete(favorites);

        await db.delete(addons);
        await db.delete(addonGroups);
        await db.delete(itemVariants);
        await db.delete(menuItems);
        await db.delete(menuCategories);
        await db.delete(menus);
        await db.delete(businessHours);
        await db.delete(branches);
        await db.delete(restaurants);
        console.log('Tables cleared successfully.');

        console.log('Inserting restaurants...');
        const [sizzle, dough, green, bites] = await db.insert(restaurants).values([
            {
                name: 'Sizzle & Spice',
                description: 'Juicy, flame-grilled craft burgers and crispy gourmet fries.',
                cuisineType: 'Burgers, Fast Food',
                rating: 4.8,
                deliveryTime: '20-30 min',
                imageEmoji: '🍔',
                isActive: true
            },
            {
                name: 'The Dough Factory',
                description: 'Authentic wood-fired Neapolitan pizzas and freshly prepared pasta.',
                cuisineType: 'Pizza, Italian',
                rating: 4.6,
                deliveryTime: '25-35 min',
                imageEmoji: '🍕',
                isActive: true
            },
            {
                name: 'Green Garden Salad',
                description: 'Healthy organic green salads, custom grain bowls, and sugar-free juices.',
                cuisineType: 'Healthy, Salads, Vegan',
                rating: 4.5,
                deliveryTime: '30-40 min',
                imageEmoji: '🥗',
                isActive: true
            },
            {
                name: 'Bites & Bowls',
                description: 'Traditional Hawaiian poke bowls, fresh ramen, and sushi rolls.',
                cuisineType: 'Healthy, Poke Bowls, Asian',
                rating: 4.4,
                deliveryTime: '40-50 min',
                imageEmoji: '🍲',
                isActive: true
            }
        ]).returning();

        console.log('Inserting restaurant branches...');
        const [sizzleBranch, doughBranch, greenBranch, bitesBranch] = await db.insert(branches).values([
            {
                restaurantId: sizzle.id,
                name: 'Sizzle & Spice - C-Scheme',
                addressLine1: 'MI Road, C-Scheme',
                city: 'Jaipur',
                latitude: 26.9167,
                longitude: 75.8057,
                phoneNumber: '+911412345601'
            },
            {
                restaurantId: dough.id,
                name: 'The Dough Factory - Malviya Nagar',
                addressLine1: 'Calgiri Marg, Malviya Nagar',
                city: 'Jaipur',
                latitude: 26.8546,
                longitude: 75.8142,
                phoneNumber: '+911412345602'
            },
            {
                restaurantId: green.id,
                name: 'Green Garden Salad - Vaishali Nagar',
                addressLine1: 'Gandhi Path, Vaishali Nagar',
                city: 'Jaipur',
                latitude: 26.9038,
                longitude: 75.7340,
                phoneNumber: '+911412345603'
            },
            {
                restaurantId: bites.id,
                name: 'Bites & Bowls - Mansarovar',
                addressLine1: 'Shipra Path, Mansarovar',
                city: 'Jaipur',
                latitude: 26.8736,
                longitude: 75.7700,
                phoneNumber: '+911412345604'
            }
        ]).returning();

        console.log('Inserting branch operating hours...');
        const operatingHoursData = [];
        const branchIds = [sizzleBranch.id, doughBranch.id, greenBranch.id, bitesBranch.id];
        for (const branchId of branchIds) {
            for (let day = 0; day <= 6; day++) {
                operatingHoursData.push({
                    branchId,
                    dayOfWeek: day,
                    openTime: '08:00',
                    closeTime: '23:00'
                });
            }
        }
        await db.insert(businessHours).values(operatingHoursData);

        console.log('Inserting menus...');
        const [sizzleMenu, doughMenu, greenMenu, bitesMenu] = await db.insert(menus).values([
            { restaurantId: sizzle.id, name: 'Sizzle Craft Catalog', description: 'Standard signature burgers and sides menu.' },
            { restaurantId: dough.id, name: 'Artisan Dough Menu', description: 'Gourmet hand-tossed pizzas and Italian specialties.' },
            { restaurantId: green.id, name: 'Organic Garden Catalog', description: 'Clean eating fresh bowls, juices, and vegan catalog.' },
            { restaurantId: bites.id, name: 'Pacific Bowl Catalog', description: 'Hawaiian poke bowls, ramen, and raw starters.' }
        ]).returning();

        console.log('Inserting menu categories...');
        const [sizzleCatBurgers, sizzleCatChicken, sizzleCatSides, sizzleCatDrinks, sizzleCatDesserts] = await db.insert(menuCategories).values([
            { menuId: sizzleMenu.id, name: 'Signature Burgers', sortOrder: 1 },
            { menuId: sizzleMenu.id, name: 'Chicken & Crispy', sortOrder: 2 },
            { menuId: sizzleMenu.id, name: 'Sides & Fries', sortOrder: 3 },
            { menuId: sizzleMenu.id, name: 'Beverages', sortOrder: 4 },
            { menuId: sizzleMenu.id, name: 'Desserts', sortOrder: 5 }
        ]).returning();

        const [doughCatPizza, doughCatPasta, doughCatStarters, doughCatDrinks, doughCatDesserts] = await db.insert(menuCategories).values([
            { menuId: doughMenu.id, name: 'Woodfired Pizzas', sortOrder: 1 },
            { menuId: doughMenu.id, name: 'Fresh Pasta', sortOrder: 2 },
            { menuId: doughMenu.id, name: 'Italian Starters', sortOrder: 3 },
            { menuId: doughMenu.id, name: 'Cold Drinks', sortOrder: 4 },
            { menuId: doughMenu.id, name: 'Dolci', sortOrder: 5 }
        ]).returning();

        const [greenCatBowls, greenCatWarm, greenCatJuices, greenCatSmoothies] = await db.insert(menuCategories).values([
            { menuId: greenMenu.id, name: 'Superfood Bowls', sortOrder: 1 },
            { menuId: greenMenu.id, name: 'Warm Grain Bowls', sortOrder: 2 },
            { menuId: greenMenu.id, name: 'Cold-Pressed Juices', sortOrder: 3 },
            { menuId: greenMenu.id, name: 'Smoothies', sortOrder: 4 }
        ]).returning();

        const [bitesCatPoke, bitesCatSushi, bitesCatRamen, bitesCatStarters] = await db.insert(menuCategories).values([
            { menuId: bitesMenu.id, name: 'Custom Poke Bowls', sortOrder: 1 },
            { menuId: bitesMenu.id, name: 'Sushi Rolls', sortOrder: 2 },
            { menuId: bitesMenu.id, name: 'Hot Ramen', sortOrder: 3 },
            { menuId: bitesMenu.id, name: 'Asian Starters', sortOrder: 4 }
        ]).returning();

        console.log('Inserting menu items...');

        // ── Sizzle & Spice ──────────────────────────────────────────────
        const [sizzleB1, sizzleB2, sizzleB3, sizzleB4] = await db.insert(menuItems).values([
            {
                categoryId: sizzleCatBurgers.id,
                name: 'The Classic Beast',
                description: 'Flame-grilled double beef patty, cheddar, pickle, and secret beast sauce.',
                price: 899,
                imageEmoji: '🍔',
                imageUrl: IMG.burger,
                isVegetarian: false,
                sortOrder: 1
            },
            {
                categoryId: sizzleCatBurgers.id,
                name: 'Smoky Bacon Melt',
                description: 'Angus beef, crispy smoked bacon, caramelized onions, and aged cheddar on brioche.',
                price: 949,
                imageEmoji: '🍔',
                imageUrl: IMG.baconBurger,
                isVegetarian: false,
                sortOrder: 2
            },
            {
                categoryId: sizzleCatBurgers.id,
                name: 'Garden Veggie Stack',
                description: 'Grilled portobello, avocado, roasted peppers, and herb aioli on a whole-wheat bun.',
                price: 699,
                imageEmoji: '🍔',
                imageUrl: IMG.veggieBurger,
                isVegetarian: true,
                sortOrder: 3
            },
            {
                categoryId: sizzleCatBurgers.id,
                name: 'Truffle Mushroom Deluxe',
                description: 'Beef patty topped with sautéed wild mushrooms, truffle mayo, and gruyère.',
                price: 1049,
                imageEmoji: '🍔',
                imageUrl: IMG.burger,
                isVegetarian: false,
                sortOrder: 4
            }
        ]).returning();

        const [sizzleC1, sizzleC2] = await db.insert(menuItems).values([
            {
                categoryId: sizzleCatChicken.id,
                name: 'Spicy Firehouse Chicken',
                description: 'Crispy fried breast fillet, spicy buffalo sauce, jalapeños, and pepper jack.',
                price: 749,
                imageEmoji: '🍗',
                imageUrl: IMG.chickenBurger,
                isVegetarian: false,
                sortOrder: 1
            },
            {
                categoryId: sizzleCatChicken.id,
                name: 'Nashville Hot Wings (8pc)',
                description: 'Crispy wings tossed in Nashville hot spice blend with blue cheese dip.',
                price: 599,
                imageEmoji: '🍗',
                imageUrl: IMG.wings,
                isVegetarian: false,
                sortOrder: 2
            }
        ]).returning();

        const [sizzleS1, sizzleS2, sizzleS3] = await db.insert(menuItems).values([
            {
                categoryId: sizzleCatSides.id,
                name: 'Truffle Parmesan Fries',
                description: 'Golden fries tossed with black truffle oil and freshly grated parmesan.',
                price: 449,
                imageEmoji: '🍟',
                imageUrl: IMG.fries,
                isVegetarian: true,
                sortOrder: 1
            },
            {
                categoryId: sizzleCatSides.id,
                name: 'Crispy Onion Rings',
                description: 'Beer-battered sweet onion rings with chipotle ranch dipping sauce.',
                price: 399,
                imageEmoji: '🍟',
                imageUrl: IMG.onionRings,
                isVegetarian: true,
                sortOrder: 2
            },
            {
                categoryId: sizzleCatSides.id,
                name: 'Loaded Cheese Fries',
                description: 'Fries smothered in melted cheddar, jalapeños, sour cream, and spring onions.',
                price: 499,
                imageEmoji: '🍟',
                imageUrl: IMG.fries,
                isVegetarian: true,
                sortOrder: 3
            }
        ]).returning();

        const [sizzleD1, sizzleD2, sizzleD3] = await db.insert(menuItems).values([
            {
                categoryId: sizzleCatDrinks.id,
                name: 'Craft Strawberry Milkshake',
                description: 'Rich strawberry milkshake made with fresh fruit coulis and real vanilla bean.',
                price: 399,
                imageEmoji: '🥤',
                imageUrl: IMG.milkshake,
                isVegetarian: true,
                sortOrder: 1
            },
            {
                categoryId: sizzleCatDrinks.id,
                name: 'Classic Cola Float',
                description: 'Ice-cold cola topped with a scoop of vanilla bean ice cream.',
                price: 299,
                imageEmoji: '🥤',
                imageUrl: IMG.cola,
                isVegetarian: true,
                sortOrder: 2
            },
            {
                categoryId: sizzleCatDrinks.id,
                name: 'Fresh Mint Lemonade',
                description: 'House-made lemonade with fresh mint and a hint of honey.',
                price: 249,
                imageEmoji: '🥤',
                imageUrl: IMG.lemonade,
                isVegetarian: true,
                sortOrder: 3
            }
        ]).returning();

        const [sizzleDe1] = await db.insert(menuItems).values([
            {
                categoryId: sizzleCatDesserts.id,
                name: 'Warm Chocolate Brownie',
                description: 'Fudgy dark chocolate brownie served warm with vanilla ice cream.',
                price: 349,
                imageEmoji: '🍰',
                imageUrl: IMG.brownie,
                isVegetarian: true,
                sortOrder: 1
            }
        ]).returning();

        // ── The Dough Factory ───────────────────────────────────────────
        const [doughP1, doughP2, doughP3, doughP4] = await db.insert(menuItems).values([
            {
                categoryId: doughCatPizza.id,
                name: 'Margherita Classica',
                description: 'San Marzano tomato base, fresh buffalo mozzarella, fresh basil, and extra virgin olive oil.',
                price: 1199,
                imageEmoji: '🍕',
                imageUrl: IMG.margherita,
                isVegetarian: true,
                sortOrder: 1
            },
            {
                categoryId: doughCatPizza.id,
                name: 'Double Truffle Pepperoni',
                description: 'Premium cured pepperoni, spicy honey, wild mushrooms, and truffle cream.',
                price: 1449,
                imageEmoji: '🍕',
                imageUrl: IMG.pepperoni,
                isVegetarian: false,
                sortOrder: 2
            },
            {
                categoryId: doughCatPizza.id,
                name: 'BBQ Chicken Supreme',
                description: 'Smoky BBQ base, grilled chicken, red onion, cilantro, and mozzarella blend.',
                price: 1349,
                imageEmoji: '🍕',
                imageUrl: IMG.bbqPizza,
                isVegetarian: false,
                sortOrder: 3
            },
            {
                categoryId: doughCatPizza.id,
                name: 'Quattro Formaggi',
                description: 'Four-cheese blend of mozzarella, gorgonzola, parmesan, and fontina on garlic oil base.',
                price: 1299,
                imageEmoji: '🍕',
                imageUrl: IMG.fourCheese,
                isVegetarian: true,
                sortOrder: 4
            }
        ]).returning();

        const [doughPa1, doughPa2, doughPa3] = await db.insert(menuItems).values([
            {
                categoryId: doughCatPasta.id,
                name: 'Creamy Carbonara',
                description: 'Spaghetti with pancetta, egg yolk, pecorino romano, and cracked black pepper.',
                price: 999,
                imageEmoji: '🍝',
                imageUrl: IMG.carbonara,
                isVegetarian: false,
                sortOrder: 1
            },
            {
                categoryId: doughCatPasta.id,
                name: 'Penne Arrabbiata',
                description: 'Penne in a fiery tomato sauce with garlic, chili flakes, and fresh parsley.',
                price: 849,
                imageEmoji: '🍝',
                imageUrl: IMG.arrabiata,
                isVegetarian: true,
                sortOrder: 2
            },
            {
                categoryId: doughCatPasta.id,
                name: 'Basil Pesto Linguine',
                description: 'Fresh linguine tossed in house-made basil pesto with pine nuts and parmesan.',
                price: 899,
                imageEmoji: '🍝',
                imageUrl: IMG.pestoPasta,
                isVegetarian: true,
                sortOrder: 3
            }
        ]).returning();

        const [doughSt1, doughSt2] = await db.insert(menuItems).values([
            {
                categoryId: doughCatStarters.id,
                name: 'Tomato Bruschetta',
                description: 'Toasted ciabatta topped with marinated cherry tomatoes, basil, and balsamic glaze.',
                price: 449,
                imageEmoji: '🥖',
                imageUrl: IMG.bruschetta,
                isVegetarian: true,
                sortOrder: 1
            },
            {
                categoryId: doughCatStarters.id,
                name: 'Garlic Herb Focaccia',
                description: 'Wood-fired focaccia with roasted garlic, rosemary, and sea salt.',
                price: 399,
                imageEmoji: '🥖',
                imageUrl: IMG.garlicBread,
                isVegetarian: true,
                sortOrder: 2
            }
        ]).returning();

        const [doughD1, doughD2] = await db.insert(menuItems).values([
            {
                categoryId: doughCatDrinks.id,
                name: 'Italian Limonata Soda',
                description: 'Sparkling organic soda brewed with fresh Sicilian lemons.',
                price: 299,
                imageEmoji: '🍋',
                imageUrl: IMG.limonata,
                isVegetarian: true,
                sortOrder: 1
            },
            {
                categoryId: doughCatDrinks.id,
                name: 'Sparkling Blood Orange',
                description: 'Refreshing Italian blood orange sparkling water with a citrus twist.',
                price: 279,
                imageEmoji: '🍊',
                imageUrl: IMG.lemonade,
                isVegetarian: true,
                sortOrder: 2
            }
        ]).returning();

        const [doughDe1] = await db.insert(menuItems).values([
            {
                categoryId: doughCatDesserts.id,
                name: 'Classic Tiramisu',
                description: 'Layers of espresso-soaked ladyfingers and mascarpone cream dusted with cocoa.',
                price: 449,
                imageEmoji: '🍰',
                imageUrl: IMG.tiramisu,
                isVegetarian: true,
                sortOrder: 1
            }
        ]).returning();

        // ── Green Garden Salad ──────────────────────────────────────────
        const [greenB1, greenB2, greenB3, greenB4] = await db.insert(menuItems).values([
            {
                categoryId: greenCatBowls.id,
                name: 'Keto Avocado Crunch',
                description: 'Crisp kale, organic avocado, roasted walnuts, edamame, and herb vinaigrette.',
                price: 999,
                imageEmoji: '🥗',
                imageUrl: IMG.avocadoSalad,
                isVegetarian: true,
                sortOrder: 1
            },
            {
                categoryId: greenCatBowls.id,
                name: 'Rainbow Buddha Bowl',
                description: 'Roasted sweet potato, chickpeas, shredded cabbage, beets, and tahini dressing.',
                price: 899,
                imageEmoji: '🥗',
                imageUrl: IMG.buddhaBowl,
                isVegetarian: true,
                sortOrder: 2
            },
            {
                categoryId: greenCatBowls.id,
                name: 'Mediterranean Quinoa Bowl',
                description: 'Tri-color quinoa, cucumber, cherry tomatoes, feta, olives, and lemon herb dressing.',
                price: 949,
                imageEmoji: '🥗',
                imageUrl: IMG.quinoaBowl,
                isVegetarian: true,
                sortOrder: 3
            },
            {
                categoryId: greenCatBowls.id,
                name: 'Classic Caesar Greens',
                description: 'Romaine hearts, parmesan crisps, house caesar dressing, and garlic croutons.',
                price: 799,
                imageEmoji: '🥗',
                imageUrl: IMG.caesarSalad,
                isVegetarian: true,
                sortOrder: 4
            }
        ]).returning();

        const [greenW1, greenW2] = await db.insert(menuItems).values([
            {
                categoryId: greenCatWarm.id,
                name: 'Roasted Veggie Power Bowl',
                description: 'Brown rice, roasted seasonal vegetables, hummus, and za\'atar dressing.',
                price: 849,
                imageEmoji: '🍲',
                imageUrl: IMG.warmBowl,
                isVegetarian: true,
                sortOrder: 1
            },
            {
                categoryId: greenCatWarm.id,
                name: 'Teriyaki Tofu Bowl',
                description: 'Jasmine rice, glazed teriyaki tofu, steamed broccoli, and sesame seeds.',
                price: 899,
                imageEmoji: '🍲',
                imageUrl: IMG.warmBowl,
                isVegetarian: true,
                sortOrder: 2
            }
        ]).returning();

        const [greenJ1, greenJ2, greenJ3] = await db.insert(menuItems).values([
            {
                categoryId: greenCatJuices.id,
                name: 'Detox Emerald Glow',
                description: 'Cold-pressed green juice with celery, cucumber, green apple, spinach, and ginger.',
                price: 549,
                imageEmoji: '🍹',
                imageUrl: IMG.greenJuice,
                isVegetarian: true,
                sortOrder: 1
            },
            {
                categoryId: greenCatJuices.id,
                name: 'Sunrise Citrus Boost',
                description: 'Fresh orange, grapefruit, and carrot juice with a turmeric kick.',
                price: 499,
                imageEmoji: '🍹',
                imageUrl: IMG.orangeJuice,
                isVegetarian: true,
                sortOrder: 2
            },
            {
                categoryId: greenCatJuices.id,
                name: 'Beetroot Vitality Shot',
                description: 'Concentrated beetroot, apple, and ginger wellness shot.',
                price: 349,
                imageEmoji: '🍹',
                imageUrl: IMG.greenJuice,
                isVegetarian: true,
                sortOrder: 3
            }
        ]).returning();

        const [greenSm1, greenSm2] = await db.insert(menuItems).values([
            {
                categoryId: greenCatSmoothies.id,
                name: 'Berry Antioxidant Blend',
                description: 'Mixed berries, banana, almond milk, chia seeds, and a touch of honey.',
                price: 599,
                imageEmoji: '🥤',
                imageUrl: IMG.berrySmoothie,
                isVegetarian: true,
                sortOrder: 1
            },
            {
                categoryId: greenCatSmoothies.id,
                name: 'Tropical Green Smoothie',
                description: 'Spinach, mango, pineapple, coconut water, and lime.',
                price: 549,
                imageEmoji: '🥤',
                imageUrl: IMG.berrySmoothie,
                isVegetarian: true,
                sortOrder: 2
            }
        ]).returning();

        // ── Bites & Bowls ───────────────────────────────────────────────
        const [bitesP1, bitesP2, bitesP3] = await db.insert(menuItems).values([
            {
                categoryId: bitesCatPoke.id,
                name: 'Signature Shaka Poke',
                description: 'Diced sushi-grade yellowfin tuna, sweet onion, cucumber, mango, and classic sesame soy.',
                price: 1299,
                imageEmoji: '🍲',
                imageUrl: IMG.poke,
                isVegetarian: false,
                sortOrder: 1
            },
            {
                categoryId: bitesCatPoke.id,
                name: 'Salmon Sunset Bowl',
                description: 'Atlantic salmon, avocado, edamame, pickled ginger, and spicy mayo over sushi rice.',
                price: 1399,
                imageEmoji: '🍲',
                imageUrl: IMG.salmonPoke,
                isVegetarian: false,
                sortOrder: 2
            },
            {
                categoryId: bitesCatPoke.id,
                name: 'Veggie Zen Poke',
                description: 'Marinated tofu, seaweed salad, cucumber, carrot, and ginger sesame dressing.',
                price: 1099,
                imageEmoji: '🍲',
                imageUrl: IMG.veggiePoke,
                isVegetarian: true,
                sortOrder: 3
            }
        ]).returning();

        const [bitesSu1, bitesSu2] = await db.insert(menuItems).values([
            {
                categoryId: bitesCatSushi.id,
                name: 'California Dream Roll (8pc)',
                description: 'Crab, avocado, and cucumber roll topped with toasted sesame seeds.',
                price: 899,
                imageEmoji: '🍣',
                imageUrl: IMG.sushi,
                isVegetarian: false,
                sortOrder: 1
            },
            {
                categoryId: bitesCatSushi.id,
                name: 'Dragon Eel Roll (8pc)',
                description: 'Grilled eel, cucumber, and avocado with unagi glaze and tobiko.',
                price: 1199,
                imageEmoji: '🍣',
                imageUrl: IMG.dragonRoll,
                isVegetarian: false,
                sortOrder: 2
            }
        ]).returning();

        const [bitesR1, bitesR2, bitesR3] = await db.insert(menuItems).values([
            {
                categoryId: bitesCatRamen.id,
                name: 'Spicy Shoyu Tofu Ramen',
                description: 'Slow-simmered vegetable broth, fresh wheat noodles, organic tofu, soft egg, and chili oil.',
                price: 1099,
                imageEmoji: '🍜',
                imageUrl: IMG.ramen,
                isVegetarian: true,
                sortOrder: 1
            },
            {
                categoryId: bitesCatRamen.id,
                name: 'Tonkotsu Pork Ramen',
                description: 'Rich 12-hour pork bone broth, chashu pork, soft egg, nori, and bamboo shoots.',
                price: 1249,
                imageEmoji: '🍜',
                imageUrl: IMG.spicyRamen,
                isVegetarian: false,
                sortOrder: 2
            },
            {
                categoryId: bitesCatRamen.id,
                name: 'Miso Chicken Ramen',
                description: 'Savory miso broth, grilled chicken thigh, corn, bean sprouts, and spring onion.',
                price: 1149,
                imageEmoji: '🍜',
                imageUrl: IMG.misoRamen,
                isVegetarian: false,
                sortOrder: 3
            }
        ]).returning();

        const [bitesSt1, bitesSt2] = await db.insert(menuItems).values([
            {
                categoryId: bitesCatStarters.id,
                name: 'Pan-Fried Gyoza (6pc)',
                description: 'Crispy-bottomed pork and vegetable dumplings with ponzu dipping sauce.',
                price: 549,
                imageEmoji: '🥟',
                imageUrl: IMG.gyoza,
                isVegetarian: false,
                sortOrder: 1
            },
            {
                categoryId: bitesCatStarters.id,
                name: 'Steamed Edamame',
                description: 'Young soybeans steamed with sea salt and a squeeze of lime.',
                price: 349,
                imageEmoji: '🫛',
                imageUrl: IMG.edamame,
                isVegetarian: true,
                sortOrder: 2
            }
        ]).returning();

        console.log('Inserting item variants...');

        await db.insert(itemVariants).values([
            { itemId: sizzleB1.id, name: 'Single Patty Base', priceOverride: 899 },
            { itemId: sizzleB1.id, name: 'Double Patty Monster', priceOverride: 1149 },
            { itemId: sizzleB2.id, name: 'Regular', priceOverride: 949 },
            { itemId: sizzleB2.id, name: 'Extra Bacon', priceOverride: 1099 },
        ]);

        await db.insert(itemVariants).values([
            { itemId: doughP1.id, name: 'Regular 10"', priceOverride: 1199 },
            { itemId: doughP1.id, name: 'Large 14"', priceOverride: 1699 },
            { itemId: doughP2.id, name: 'Regular 10"', priceOverride: 1449 },
            { itemId: doughP2.id, name: 'Large 14"', priceOverride: 1999 },
            { itemId: doughP3.id, name: 'Regular 10"', priceOverride: 1349 },
            { itemId: doughP3.id, name: 'Large 14"', priceOverride: 1849 },
        ]);

        await db.insert(itemVariants).values([
            { itemId: bitesP1.id, name: 'Classic Ahi Tuna', priceOverride: 1299 },
            { itemId: bitesP1.id, name: 'Atlantic Salmon Blend', priceOverride: 1399 },
            { itemId: bitesR1.id, name: 'Regular', priceOverride: 1099 },
            { itemId: bitesR1.id, name: 'Extra Noodles', priceOverride: 1249 },
        ]);

        console.log('Inserting addon groups and addons...');

        const [burgerExtraGroup] = await db.insert(addonGroups).values([
            { itemId: sizzleB1.id, name: 'Add Extras to Burger', minSelection: 0, maxSelection: 3 }
        ]).returning();
        await db.insert(addons).values([
            { groupId: burgerExtraGroup.id, name: 'Aged Cheddar Slice', price: 100 },
            { groupId: burgerExtraGroup.id, name: 'Crisp Smoked Bacon', price: 150 },
            { groupId: burgerExtraGroup.id, name: 'Sautéed Wild Mushrooms', price: 125 }
        ]);

        const [chickenExtraGroup] = await db.insert(addonGroups).values([
            { itemId: sizzleC1.id, name: 'Choose Cheese Option', minSelection: 0, maxSelection: 1 }
        ]).returning();
        await db.insert(addons).values([
            { groupId: chickenExtraGroup.id, name: 'Extra Pepper Jack', price: 75 },
            { groupId: chickenExtraGroup.id, name: 'Melted Mozzarella', price: 75 }
        ]);

        const [pizzaExtraGroup] = await db.insert(addonGroups).values([
            { itemId: doughP1.id, name: 'Choose Extra Toppings', minSelection: 0, maxSelection: 4 }
        ]).returning();
        await db.insert(addons).values([
            { groupId: pizzaExtraGroup.id, name: 'Extra Buffalo Mozzarella', price: 200 },
            { groupId: pizzaExtraGroup.id, name: 'Salami Chips', price: 175 },
            { groupId: pizzaExtraGroup.id, name: 'Kalamata Olives', price: 100 }
        ]);

        const [saladExtraGroup] = await db.insert(addonGroups).values([
            { itemId: greenB1.id, name: 'Add Extra Proteins', minSelection: 0, maxSelection: 2 }
        ]).returning();
        await db.insert(addons).values([
            { groupId: saladExtraGroup.id, name: 'Grilled Herb Tofu', price: 200 },
            { groupId: saladExtraGroup.id, name: 'Chilled Atlantic Prawns', price: 350 }
        ]);

        const [pokeExtraGroup] = await db.insert(addonGroups).values([
            { itemId: bitesP1.id, name: 'Extra Toppings', minSelection: 0, maxSelection: 3 }
        ]).returning();
        await db.insert(addons).values([
            { groupId: pokeExtraGroup.id, name: 'Extra Avocado', price: 150 },
            { groupId: pokeExtraGroup.id, name: 'Spicy Mayo Drizzle', price: 75 },
            { groupId: pokeExtraGroup.id, name: 'Crispy Wonton Strips', price: 100 }
        ]);

        console.log('--- Database Seeding Completed Successfully ---');
    } catch (error) {
        console.error('Database Seeding Failed with error:', error);
        process.exit(1);
    }
}

main();
