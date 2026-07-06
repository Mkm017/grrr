type PricingSource = {
    subtotal: number
    deliveryFee: number
    discount: number
}

const PLATFORM_COMMISSION_RATE = 0.1

export const calculatePlatformCommission = (order: PricingSource) => {
    const commissionBase = Math.max(order.subtotal - order.discount, 0)
    return Math.round(commissionBase * PLATFORM_COMMISSION_RATE)
}

export const calculateRestaurantNetRevenue = (order: PricingSource) => {
    const platformCommission = calculatePlatformCommission(order)
    return Math.max(order.subtotal - order.discount - order.deliveryFee - platformCommission, 0)
}

export const calculateDeliveryEarning = (order: Pick<PricingSource, 'deliveryFee'>) => {
    return Math.max(order.deliveryFee, 0)
}