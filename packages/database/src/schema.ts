import { pgTable, uuid, text, integer, doublePrecision, boolean, timestamp, uniqueIndex, index, check } from 'drizzle-orm/pg-core';

// Existing tables...
export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    firebaseUid: text('firebase_uid').notNull().unique(),
    email: text('email'),
    phoneNumber: text('phone_number'),
    name: text('name'),
    role: text('role').default('user').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const addresses = pgTable('addresses', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title'),
    addressLine1: text('address_line1').notNull(),
    addressLine2: text('address_line2'),
    city: text('city').notNull(),
    state: text('state'),
    postalCode: text('postal_code').notNull(),
    country: text('country').default('US').notNull(),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    isDefault: boolean('is_default').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const restaurants = pgTable('restaurants', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description'),
    cuisineType: text('cuisine_type').notNull(),
    rating: doublePrecision('rating').default(0).notNull(),
    deliveryTime: text('delivery_time').notNull(),
    imageEmoji: text('image_emoji').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const branches = pgTable('restaurant_branches', {
    id: uuid('id').primaryKey().defaultRandom(),
    restaurantId: uuid('restaurant_id').notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    addressLine1: text('address_line1').notNull(),
    addressLine2: text('address_line2'),
    city: text('city').notNull(),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    phoneNumber: text('phone_number'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const menus = pgTable('menus', {
    id: uuid('id').primaryKey().defaultRandom(),
    restaurantId: uuid('restaurant_id').notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const menuCategories = pgTable('menu_categories', {
    id: uuid('id').primaryKey().defaultRandom(),
    menuId: uuid('menu_id').notNull().references(() => menus.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const menuItems = pgTable('menu_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id').notNull().references(() => menuCategories.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    price: integer('price').notNull(),
    imageEmoji: text('image_emoji'),
    imageUrl: text('image_url'),
    isVegetarian: boolean('is_vegetarian').default(false).notNull(),
    isAvailable: boolean('is_available').default(true).notNull(),
    isDeleted: boolean('is_deleted').default(false).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const itemVariants = pgTable('item_variants', {
    id: uuid('id').primaryKey().defaultRandom(),
    itemId: uuid('item_id').notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    priceOverride: integer('price_override'),
    isAvailable: boolean('is_available').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const addonGroups = pgTable('addon_groups', {
    id: uuid('id').primaryKey().defaultRandom(),
    itemId: uuid('item_id').notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    minSelection: integer('min_selection').default(0).notNull(),
    maxSelection: integer('max_selection').default(1).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const addons = pgTable('addons', {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id').notNull().references(() => addonGroups.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    price: integer('price').notNull(),
    isAvailable: boolean('is_available').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const favorites = pgTable('favorites', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    restaurantId: uuid('restaurant_id').notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    userRestaurantUnique: uniqueIndex('user_restaurant_unique').on(table.userId, table.restaurantId),
}));

// ============================================================================
// NEW: ORDERS SYSTEM
// ============================================================================
export const orders = pgTable('orders', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id),
    restaurantId: uuid('restaurant_id').notNull().references(() => restaurants.id),
    addressId: uuid('address_id').notNull().references(() => addresses.id),
    status: text('status').notNull().default('pending'),
    subtotal: integer('subtotal').notNull(),
    deliveryFee: integer('delivery_fee').notNull().default(0),
    taxes: integer('taxes').notNull().default(0),
    discount: integer('discount').notNull().default(0),
    total: integer('total').notNull(),
    couponCode: text('coupon_code'),
    paymentMethod: text('payment_method').notNull().default('card'),
    specialInstructions: text('special_instructions'),
    estimatedDeliveryTime: timestamp('estimated_delivery_time'),
    actualDeliveryTime: timestamp('actual_delivery_time'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    userIdIdx: index('idx_orders_user_id').on(table.userId),
    restaurantIdIdx: index('idx_orders_restaurant_id').on(table.restaurantId),
    statusIdx: index('idx_orders_status').on(table.status),
}));

export const orderItems = pgTable('order_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    menuItemId: uuid('menu_item_id').notNull().references(() => menuItems.id),
    itemName: text('item_name').notNull(),
    variantName: text('variant_name'),
    quantity: integer('quantity').notNull().default(1),
    pricePerUnit: integer('price_per_unit').notNull(),
    addonsJson: text('addons_json').default('[]'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// NEW: DELIVERY AGENTS SYSTEM
// ============================================================================
export const deliveryAgents = pgTable('delivery_agents', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().unique().references(() => users.id),
    name: text('name').notNull(),
    phoneNumber: text('phone_number').notNull(),
    vehicleType: text('vehicle_type').notNull().default('bike'),
    isAvailable: boolean('is_available').default(true).notNull(),
    currentLatitude: doublePrecision('current_latitude'),
    currentLongitude: doublePrecision('current_longitude'),
    rating: doublePrecision('rating').default(5.0),
    totalDeliveries: integer('total_deliveries').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    availableIdx: index('idx_delivery_agents_available').on(table.isAvailable),
}));

export const deliveryAssignments = pgTable('delivery_assignments', {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').notNull().unique().references(() => orders.id),
    agentId: uuid('agent_id').notNull().references(() => deliveryAgents.id),
    status: text('status').notNull().default('assigned'),
    pickupTime: timestamp('pickup_time'),
    deliveryTime: timestamp('delivery_time'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    agentIdx: index('idx_delivery_assignments_agent').on(table.agentId),
}));

export const businessHours = pgTable('business_hours', {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
    dayOfWeek: integer('day_of_week').notNull(),
    openTime: text('open_time').notNull(),
    closeTime: text('close_time').notNull(),
});