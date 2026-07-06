//D:\Grrr\apps\web\src\providers\CartProvider.tsx
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { MenuItem, ItemVariant, Addon } from '@grrr/contracts';

export interface CartItem {
    id: string; // Unique combination key: item_id-variant_id-addon1_id-addon2_id
    menuItem: MenuItem;
    selectedVariant: ItemVariant | null;
    selectedAddons: Addon[];
    quantity: number;
    pricePerUnit: number; // in cents
}

interface CartContextType {
    cartItems: CartItem[];
    cartRestaurantId: string | null;
    cartRestaurantName: string | null;
    addToCart: (
        item: MenuItem,
        restaurantId: string,
        restaurantName: string,
        variant: ItemVariant | null,
        addons: Addon[],
        quantity: number
    ) => boolean | 'PROMPT_CLEAR';
    forceAddToCart: (
        item: MenuItem,
        restaurantId: string,
        restaurantName: string,
        variant: ItemVariant | null,
        addons: Addon[],
        quantity: number
    ) => void;
    removeFromCart: (cartItemId: string) => void;
    updateQuantity: (cartItemId: string, quantity: number) => void;
    /** Update the variant + addons of an existing cart item (for "customize current" flow) */
    updateItemAddons: (cartItemId: string, variant: ItemVariant | null, addons: Addon[]) => void;
    clearCart: () => void;
    subtotal: number; // in cents
    deliveryFee: number; // in cents
    taxes: number; // in cents
    discount: number; // in cents
    total: number; // in cents
    appliedCoupon: string | null;
    applyCoupon: (code: string) => { success: boolean; message: string };
    removeCoupon: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [cartRestaurantId, setCartRestaurantId] = useState<string | null>(null);
    const [cartRestaurantName, setCartRestaurantName] = useState<string | null>(null);
    const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

    // 1. Load initial cart from localStorage
    useEffect(() => {
        try {
            const storedItems = localStorage.getItem('grrr_cart_items');
            const storedId = localStorage.getItem('grrr_cart_restaurant_id');
            const storedName = localStorage.getItem('grrr_cart_restaurant_name');
            const storedCoupon = localStorage.getItem('grrr_cart_coupon');

            if (storedItems) setCartItems(JSON.parse(storedItems));
            if (storedId) setCartRestaurantId(storedId);
            if (storedName) setCartRestaurantName(storedName);
            if (storedCoupon) setAppliedCoupon(storedCoupon);
        } catch (err) {
            console.error('Failed to load cart from localStorage:', err);
        }
    }, []);

    // Helper: Generate unique cart item combination key
    const generateKey = (item: MenuItem, variant: ItemVariant | null, addons: Addon[]): string => {
        const variantPart = variant ? variant.id : 'default';
        const sortedAddonIds = [...addons].map(a => a.id).sort().join('_');
        return `${item.id}-${variantPart}-${sortedAddonIds || 'none'}`;
    };

    // Helper: Save state to localStorage
    const saveCart = (items: CartItem[], resId: string | null, resName: string | null) => {
        setCartItems(items);
        setCartRestaurantId(resId);
        setCartRestaurantName(resName);

        if (resId) {
            localStorage.setItem('grrr_cart_items', JSON.stringify(items));
            localStorage.setItem('grrr_cart_restaurant_id', resId);
            localStorage.setItem('grrr_cart_restaurant_name', resName || '');
        } else {
            localStorage.removeItem('grrr_cart_items');
            localStorage.removeItem('grrr_cart_restaurant_id');
            localStorage.removeItem('grrr_cart_restaurant_name');
            localStorage.removeItem('grrr_cart_coupon');
            setAppliedCoupon(null);
        }
    };

    // 2. Add to Cart with verification
    const addToCart = (
        item: MenuItem,
        restaurantId: string,
        restaurantName: string,
        variant: ItemVariant | null,
        addons: Addon[],
        quantity: number
    ): boolean | 'PROMPT_CLEAR' => {
        // Enforce single restaurant rule
        if (cartRestaurantId && cartRestaurantId !== restaurantId) {
            return 'PROMPT_CLEAR';
        }

        forceAddToCart(item, restaurantId, restaurantName, variant, addons, quantity);
        return true;
    };

    // 3. Clear cart and add (force add)
    const forceAddToCart = (
        item: MenuItem,
        restaurantId: string,
        restaurantName: string,
        variant: ItemVariant | null,
        addons: Addon[],
        quantity: number
    ) => {
        const key = generateKey(item, variant, addons);
        const basePrice = variant && variant.priceOverride !== null
            ? variant.priceOverride
            : item.price;
        const addonsTotal = addons.reduce((sum, a) => sum + a.price, 0); // addons in cents
        const pricePerUnit = basePrice + addonsTotal;

        let newItems = [...cartItems];
        const existingIdx = newItems.findIndex(x => x.id === key);

        // If restaurant ID was different, clear previous items completely
        const activeResId = cartRestaurantId === restaurantId ? restaurantId : restaurantId;
        const activeResName = cartRestaurantId === restaurantId ? restaurantName : restaurantName;
        if (cartRestaurantId !== restaurantId) {
            newItems = [];
        }

        if (existingIdx > -1) {
            newItems[existingIdx].quantity += quantity;
        } else {
            newItems.push({
                id: key,
                menuItem: item,
                selectedVariant: variant,
                selectedAddons: addons,
                quantity,
                pricePerUnit
            });
        }

        saveCart(newItems, activeResId, activeResName);
    };

    // 4. Remove from Cart
    const removeFromCart = (cartItemId: string) => {
        const newItems = cartItems.filter(x => x.id !== cartItemId);
        if (newItems.length === 0) {
            saveCart([], null, null);
        } else {
            saveCart(newItems, cartRestaurantId, cartRestaurantName);
        }
    };

    // 5. Update Quantity
    const updateQuantity = (cartItemId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(cartItemId);
            return;
        }
        const newItems = cartItems.map(x => {
            if (x.id === cartItemId) {
                return { ...x, quantity };
            }
            return x;
        });
        saveCart(newItems, cartRestaurantId, cartRestaurantName);
    };

    // 6. Update item addons (for "customize current" flow - updates variant + addons on existing item)
    const updateItemAddons = (cartItemId: string, variant: ItemVariant | null, addons: Addon[]) => {
        const existingItem = cartItems.find(x => x.id === cartItemId);
        if (!existingItem) return;

        const newKey = generateKey(existingItem.menuItem, variant, addons);
        const basePrice = variant && variant.priceOverride !== null
            ? variant.priceOverride
            : existingItem.menuItem.price;
        const addonsTotal = addons.reduce((sum, a) => sum + a.price, 0);
        const pricePerUnit = basePrice + addonsTotal;

        // Check if a cart item with the new key already exists (different customization)
        const conflictIdx = cartItems.findIndex(x => x.id === newKey && x.id !== cartItemId);
        let newItems: CartItem[];

        if (conflictIdx > -1) {
            // Merge quantities into the existing one and remove current
            newItems = cartItems
                .filter(x => x.id !== cartItemId)
                .map(x => x.id === newKey ? { ...x, quantity: x.quantity + existingItem.quantity } : x);
        } else {
            // Update the item in place with new key + addons
            newItems = cartItems.map(x =>
                x.id === cartItemId
                    ? { ...x, id: newKey, selectedVariant: variant, selectedAddons: addons, pricePerUnit }
                    : x
            );
        }

        saveCart(newItems, cartRestaurantId, cartRestaurantName);
    };

    // 7. Clear Cart
    const clearCart = () => {
        saveCart([], null, null);
    };

    // 8. Pricing Math
    const subtotal = useMemo(() => {
        return cartItems.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
    }, [cartItems]);

    const deliveryFee = useMemo(() => {
        if (subtotal === 0) return 0;
        // Standard delivery fee: $0.50 (50 cents) ~ ₹41
        // Free delivery on orders above $30.00 (3000 cents)
        if (subtotal >= 3000 || appliedCoupon === 'FREEDEL') return 0;
        return 50;
    }, [subtotal, appliedCoupon]);

    const taxes = useMemo(() => {
        if (subtotal === 0) return 0;
        // 5% tax rate
        return Math.round(subtotal * 0.05);
    }, [subtotal]);

    const discount = useMemo(() => {
        if (subtotal === 0) return 0;
        if (appliedCoupon === 'GRRR10') {
            // 10% off subtotal
            return Math.round(subtotal * 0.1);
        }
        if (appliedCoupon === 'FREE5') {
            // $5.00 off if subtotal is >= $15.00 (1500 cents)
            if (subtotal >= 1500) {
                return 500;
            }
        }
        return 0;
    }, [subtotal, appliedCoupon]);

    const total = useMemo(() => {
        if (subtotal === 0) return 0;
        const net = subtotal + deliveryFee + taxes - discount;
        return net < 0 ? 0 : net;
    }, [subtotal, deliveryFee, taxes, discount]);

    // 9. Coupon Code Engine
    const applyCoupon = (code: string): { success: boolean; message: string } => {
        const cleanCode = code.trim().toUpperCase();
        if (cleanCode === 'GRRR10') {
            setAppliedCoupon('GRRR10');
            localStorage.setItem('grrr_coupon', 'GRRR10');
            return { success: true, message: 'Coupon GRRR10 applied (10% off subtotal)!' };
        }
        if (cleanCode === 'FREE5') {
            if (subtotal < 1500) {
                return { success: false, message: 'Coupon FREE5 requires a minimum order subtotal of $15.00.' };
            }
            setAppliedCoupon('FREE5');
            localStorage.setItem('grrr_coupon', 'FREE5');
            return { success: true, message: 'Coupon FREE5 applied ($5.00 off order subtotal)!' };
        }
        if (cleanCode === 'FREEDEL') {
            setAppliedCoupon('FREEDEL');
            localStorage.setItem('grrr_coupon', 'FREEDEL');
            return { success: true, message: 'Coupon FREEDEL applied (free delivery)!' };
        }
        return { success: false, message: 'Invalid or expired coupon code.' };
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
        localStorage.removeItem('grrr_coupon');
    };

    return (
        <CartContext.Provider value={{
            cartItems,
            cartRestaurantId,
            cartRestaurantName,
            addToCart,
            forceAddToCart,
            removeFromCart,
            updateQuantity,
            updateItemAddons,
            clearCart,
            subtotal,
            deliveryFee,
            taxes,
            discount,
            total,
            appliedCoupon,
            applyCoupon,
            removeCoupon
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
