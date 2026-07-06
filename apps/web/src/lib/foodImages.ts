const FOOD_IMAGE_FALLBACKS: Array<{ keywords: string[]; url: string }> = [
    {
        keywords: ['burger', 'sandwich', 'zinger', 'wrap'],
        url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900',
    },
    {
        keywords: ['pizza', 'flatbread'],
        url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900',
    },
    {
        keywords: ['fries', 'chips', 'snack'],
        url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=900',
    },
    {
        keywords: ['salad', 'healthy', 'vegan'],
        url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=900',
    },
    {
        keywords: ['curry', 'biryani', 'thali', 'rice'],
        url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=900',
    },
    {
        keywords: ['pasta', 'noodle'],
        url: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=900',
    },
    {
        keywords: ['cake', 'dessert', 'sweet', 'ice cream'],
        url: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=900',
    },
    {
        keywords: ['drink', 'coffee', 'tea', 'juice', 'soda', 'lemonade', 'smoothie', 'milkshake'],
        url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900',
    },
    {
        keywords: ['ramen', 'noodle soup', 'tonkotsu', 'miso'],
        url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=900',
    },
    {
        keywords: ['poke', 'sushi', 'roll', 'gyoza', 'edamame'],
        url: 'https://images.unsplash.com/photo-1546069901-d5bfd2cbfb1f?w=900',
    },
    {
        keywords: ['wing', 'chicken'],
        url: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=900',
    },
    {
        keywords: ['bowl', 'quinoa', 'buddha'],
        url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900',
    },
]

export function getFoodImageUrl(name: string, imageUrl?: string | null): string {
    if (imageUrl) return imageUrl
    const lowerName = name.toLowerCase()
    const match = FOOD_IMAGE_FALLBACKS.find(entry => entry.keywords.some(keyword => lowerName.includes(keyword)))
    return match?.url || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=900'
}