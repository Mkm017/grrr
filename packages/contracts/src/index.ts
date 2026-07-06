//D:\Grrr\packages\contracts\src\index.ts
import { z } from "zod";

export const PingResponseSchema = z.object({
    status: z.string(),
    timestamp: z.string(),
});

export type PingResponse = z.infer<typeof PingResponseSchema>;

// --- NEW DB CONTRACT ---
export const UserSchema = z.object({
    id: z.string(),
    email: z.string().nullable(),
    createdAt: z.string(),
});

export const UsersResponseSchema = z.object({
    users: z.array(UserSchema),
});

export type UsersResponse = z.infer<typeof UsersResponseSchema>;

// --- GET /users/me CONTRACT ---
export const UserMeResponseSchema = z.object({
    id: z.string(),
    firebaseUid: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    phoneNumber: z.string().nullable(),
    role: z.string().default('user'),
    createdAt: z.string(),
});

export type UserMeResponse = z.infer<typeof UserMeResponseSchema>;

export const UpdateProfileRequestSchema = z.object({
    name: z.string().min(1, "Name must be at least 1 character"),
    email: z.string().email("Invalid email format").optional().nullable(),
    phoneNumber: z.string().optional().nullable(),
    role: z.string().optional(),
});

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

// --- ADDRESS SYSTEM CONTRACTS ---
export const AddressSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    title: z.string().nullable(),
    addressLine1: z.string(),
    addressLine2: z.string().nullable(),
    city: z.string(),
    state: z.string().nullable(),
    postalCode: z.string(),
    country: z.string(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    isDefault: z.boolean(),
    createdAt: z.string(),
});

export type Address = z.infer<typeof AddressSchema>;

export const CreateAddressRequestSchema = z.object({
    title: z.string().optional().nullable(),
    addressLine1: z.string().min(1, "Address Line 1 is required"),
    addressLine2: z.string().optional().nullable(),
    city: z.string().min(1, "City is required"),
    state: z.string().optional().nullable(),
    postalCode: z.string().min(1, "Postal code is required"),
    country: z.string().optional().default("US"),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    isDefault: z.boolean().optional().default(false),
});

export type CreateAddressRequest = z.infer<typeof CreateAddressRequestSchema>;

export const AddressesResponseSchema = z.object({
    addresses: z.array(AddressSchema),
});

export type AddressesResponse = z.infer<typeof AddressesResponseSchema>;

// --- RESTAURANT & CATALOG SCHEMAS (Phase 4) ---

export const BranchSchema = z.object({
    id: z.string().uuid(),
    restaurantId: z.string().uuid(),
    name: z.string(),
    addressLine1: z.string(),
    addressLine2: z.string().nullable(),
    city: z.string(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    phoneNumber: z.string().nullable(),
});

export const RestaurantSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    cuisineType: z.string(),
    rating: z.number(),
    deliveryTime: z.string(),
    imageEmoji: z.string(),
    isActive: z.boolean(),
    branches: z.array(BranchSchema).optional(),
    createdAt: z.string(),
});

export const RestaurantsResponseSchema = z.object({
    restaurants: z.array(RestaurantSchema),
});

export type Branch = z.infer<typeof BranchSchema>;
export type Restaurant = z.infer<typeof RestaurantSchema>;
export type RestaurantsResponse = z.infer<typeof RestaurantsResponseSchema>;

// Nested Menu Structure Contracts

export const AddonSchema = z.object({
    id: z.string().uuid(),
    groupId: z.string().uuid(),
    name: z.string(),
    price: z.number(), // in cents
    isAvailable: z.boolean(),
    createdAt: z.string(),
});

export const AddonGroupSchema = z.object({
    id: z.string().uuid(),
    itemId: z.string().uuid(),
    name: z.string(),
    minSelection: z.number(),
    maxSelection: z.number(),
    addons: z.array(AddonSchema),
    createdAt: z.string(),
});

export const ItemVariantSchema = z.object({
    id: z.string().uuid(),
    itemId: z.string().uuid(),
    name: z.string(),
    priceOverride: z.number().nullable(), // in cents
    isAvailable: z.boolean(),
    createdAt: z.string(),
});

export const MenuItemSchema = z.object({
    id: z.string().uuid(),
    categoryId: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    price: z.number(), // base price in cents
    imageEmoji: z.string().nullable(),
    imageUrl: z.string().nullable().optional(),
    isVegetarian: z.boolean().default(true),
    isAvailable: z.boolean(),
    sortOrder: z.number(),
    variants: z.array(ItemVariantSchema),
    addonGroups: z.array(AddonGroupSchema),
    createdAt: z.string(),
});

export const MenuCategorySchema = z.object({
    id: z.string().uuid(),
    menuId: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    sortOrder: z.number(),
    items: z.array(MenuItemSchema),
    createdAt: z.string(),
});

export const MenuSchema = z.object({
    id: z.string().uuid(),
    restaurantId: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    isActive: z.boolean(),
    categories: z.array(MenuCategorySchema),
    createdAt: z.string(),
});

export const RestaurantMenuResponseSchema = z.object({
    menu: MenuSchema.nullable(),
});

export type Addon = z.infer<typeof AddonSchema>;
export type AddonGroup = z.infer<typeof AddonGroupSchema>;
export type ItemVariant = z.infer<typeof ItemVariantSchema>;
export type MenuItem = z.infer<typeof MenuItemSchema>;
export type MenuCategory = z.infer<typeof MenuCategorySchema>;
export type Menu = z.infer<typeof MenuSchema>;
export type RestaurantMenuResponse = z.infer<typeof RestaurantMenuResponseSchema>;

// --- FAVORITES SCHEMAS (Phase 5) ---

export const FavoriteResponseSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    restaurantId: z.string().uuid(),
    createdAt: z.string(),
});

export const CreateFavoriteRequestSchema = z.object({
    restaurantId: z.string().uuid(),
});

export const FavoritesListResponseSchema = z.object({
    favorites: z.array(RestaurantSchema),
});

export type FavoriteResponse = z.infer<typeof FavoriteResponseSchema>;
export type CreateFavoriteRequest = z.infer<typeof CreateFavoriteRequestSchema>;
export type FavoritesListResponse = z.infer<typeof FavoritesListResponseSchema>;