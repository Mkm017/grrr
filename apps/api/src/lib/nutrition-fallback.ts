type CartItemInput = {
    name: string;
    quantity: number;
    variant?: string | null;
    addons?: string[];
};

type NutritionResult = {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    healthInsight: string;
    betterAlternative: string;
    alternativeReason: string;
};

const PROFILES: Array<{ keywords: string[]; cal: number; protein: number; carbs: number; fat: number }> = [
    { keywords: ['burger', 'patty', 'bacon', 'beef'], cal: 680, protein: 32, carbs: 42, fat: 40 },
    { keywords: ['chicken', 'wing'], cal: 520, protein: 38, carbs: 28, fat: 26 },
    { keywords: ['pizza'], cal: 780, protein: 28, carbs: 72, fat: 34 },
    { keywords: ['pasta', 'carbonara', 'linguine', 'penne'], cal: 620, protein: 22, carbs: 68, fat: 28 },
    { keywords: ['fries', 'rings', 'snack'], cal: 380, protein: 5, carbs: 48, fat: 18 },
    { keywords: ['salad', 'bowl', 'poke', 'quinoa', 'buddha'], cal: 420, protein: 18, carbs: 38, fat: 16 },
    { keywords: ['ramen', 'noodle', 'sushi', 'roll', 'gyoza'], cal: 560, protein: 24, carbs: 62, fat: 20 },
    { keywords: ['juice', 'smoothie', 'lemonade', 'soda', 'milkshake', 'drink'], cal: 180, protein: 3, carbs: 38, fat: 2 },
    { keywords: ['brownie', 'tiramisu', 'dessert', 'cake'], cal: 320, protein: 4, carbs: 42, fat: 16 },
];

const DEFAULT_PROFILE = { cal: 450, protein: 15, carbs: 40, fat: 18 };

function profileForName(name: string) {
    const lower = name.toLowerCase();
    return PROFILES.find(p => p.keywords.some(k => lower.includes(k))) ?? DEFAULT_PROFILE;
}

function isAlreadyOrdered(menuName: string, cartItems: CartItemInput[]) {
    const menuLower = menuName.toLowerCase();
    return cartItems.some(item => {
        const itemLower = item.name.toLowerCase();
        return menuLower.includes(itemLower) || itemLower.includes(menuLower);
    });
}

export function estimateNutritionLocally(
    cartItems: CartItemInput[],
    availableMenuItems: string[]
): NutritionResult {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    for (const item of cartItems) {
        const profile = profileForName(item.name);
        const addonBoost = (item.addons?.length ?? 0) * 70;
        const qty = item.quantity;

        calories += (profile.cal + addonBoost) * qty;
        protein += (profile.protein + addonBoost * 0.1) * qty;
        carbs += (profile.carbs + addonBoost * 0.2) * qty;
        fat += (profile.fat + addonBoost * 0.15) * qty;
    }

    const healthier = availableMenuItems.filter(name => {
        if (isAlreadyOrdered(name, cartItems)) return false;
        const lower = name.toLowerCase();
        return /salad|bowl|juice|smoothie|veggie|tofu|avocado|greens|edamame/i.test(lower);
    });

    const betterAlternative =
        healthier[0] ??
        availableMenuItems.find(name => !isAlreadyOrdered(name, cartItems)) ??
        'A lighter item from the menu';

    let healthInsight: string;
    if (calories > 1400) {
        healthInsight = 'This order is high in calories. Consider swapping a fried side for a salad or juice to cut roughly 250–350 kcal.';
    } else if (fat > 70) {
        healthInsight = 'Fat content is on the higher side. Grilled or bowl-based options typically have less saturated fat.';
    } else if (protein < 25) {
        healthInsight = 'Protein is relatively low for this meal size. Adding a lean protein bowl can help balance macros.';
    } else {
        healthInsight = 'This is a moderately balanced order. Pairing with a fresh juice or salad can add fiber and micronutrients.';
    }

    return {
        calories: Math.round(calories),
        protein: Math.round(protein),
        carbs: Math.round(carbs),
        fat: Math.round(fat),
        healthInsight,
        betterAlternative,
        alternativeReason: 'Usually lower in calories and higher in fiber, vitamins, and lean protein.',
    };
}
