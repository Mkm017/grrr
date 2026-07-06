//D:\Grrr\apps\web\src\components\RestaurantDetails.tsx
import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../providers/AuthProvider'
import { useCart } from '../providers/CartProvider'
import { useLocation } from '../providers/LocationProvider'
import { Restaurant, Menu, MenuItem } from '@grrr/contracts'
import CustomizationModal from './CustomizationModal'
import { getFoodImageUrl } from '../lib/foodImages'

export default function RestaurantDetails() {
    const { id } = useParams<{ id: string }>()
    const { firebaseUser } = useAuth()
    const { } = useLocation()
    const { addToCart, forceAddToCart, cartItems, cartRestaurantId, updateQuantity, removeFromCart, updateItemAddons } = useCart()

    const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
    const [menu, setMenu] = useState<Menu | null>(null)
    const [isFavorite, setIsFavorite] = useState(false)
    const [loading, setLoading] = useState(true)
    const [menuLoading, setMenuLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
    const [customizationMode, setCustomizationMode] = useState<'new' | 'customize-existing'>('new')
    const [pendingConflict, setPendingConflict] = useState<any>(null)
    const [activeCategory, setActiveCategory] = useState<string>('')

    const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

    useEffect(() => {
        if (!id) return

        let cancelled = false

        async function fetch() {
            setLoading(true)
            setMenuLoading(true)
            setError(null)
            setMenu(null)

            try {
                const [restData, menuData] = await Promise.all([
                    api.get<Restaurant>(`/restaurants/${id}`),
                    api.get<{ menu: Menu | null }>(`/restaurants/${id}/menu`),
                ])

                if (cancelled) return

                setRestaurant(restData)
                setMenu(menuData.menu)
                if (menuData.menu?.categories?.[0]) {
                    setActiveCategory(menuData.menu.categories[0].id)
                }
            } catch (err: any) {
                if (!cancelled) setError(err.message)
            } finally {
                if (!cancelled) {
                    setLoading(false)
                    setMenuLoading(false)
                }
            }

            if (firebaseUser && !cancelled) {
                try {
                    const favs = await api.get<{ favorites: Restaurant[] }>('/favorites')
                    if (!cancelled) {
                        setIsFavorite(favs.favorites.some(f => f.id === id))
                    }
                } catch { }
            }
        }

        fetch()
        return () => { cancelled = true }
    }, [id, firebaseUser])

    const formatPrice = (cents: number) => `₹${(cents / 100 * 83).toFixed(0)}` // Convert to INR

    const handleToggleFavorite = async () => {
        if (!id) return
        try {
            if (isFavorite) { await api.delete(`/favorites/${id}`); setIsFavorite(false) }
            else { await api.post('/favorites', { restaurantId: id }); setIsFavorite(true) }
        } catch (err) { console.error(err) }
    }

    const scrollToCategory = (categoryId: string) => {
        setActiveCategory(categoryId)
        categoryRefs.current[categoryId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    // Get total cart quantity for a menu item (across all customizations)
    const getItemCartQty = (menuItemId: string) => {
        if (cartRestaurantId !== id) return 0
        return cartItems
            .filter(item => item.menuItem.id === menuItemId)
            .reduce((sum, item) => sum + item.quantity, 0)
    }

    // Get the base (no variant, no addons) cart item for an item
    const getBaseCartItem = (menuItemId: string) => {
        if (cartRestaurantId !== id) return null
        return cartItems.find(ci => ci.menuItem.id === menuItemId && !ci.selectedVariant && ci.selectedAddons.length === 0) ?? null
    }

    // Quick add to cart (without customization) - plain item with no variant/addons
    const handleQuickAdd = (e: React.MouseEvent, item: MenuItem) => {
        e.stopPropagation()
        if (!restaurant || !item.isAvailable) return

        const res = addToCart(item, restaurant.id, restaurant.name, null, [], 1)
        if (res === 'PROMPT_CLEAR') {
            setPendingConflict({ item, variant: null, addons: [], quantity: 1 })
        }
    }

    // Quick increment the base cart item
    const handleQuickIncrement = (e: React.MouseEvent, item: MenuItem) => {
        e.stopPropagation()
        const baseItem = getBaseCartItem(item.id)
        if (baseItem) {
            updateQuantity(baseItem.id, baseItem.quantity + 1)
        }
    }

    // Quick decrement the base cart item
    const handleQuickDecrement = (e: React.MouseEvent, item: MenuItem) => {
        e.stopPropagation()
        const baseItem = getBaseCartItem(item.id)
        if (baseItem) {
            if (baseItem.quantity <= 1) {
                removeFromCart(baseItem.id)
            } else {
                updateQuantity(baseItem.id, baseItem.quantity - 1)
            }
        }
    }

    // Open the modal, defaulting to 'customize-existing' if item is already in cart
    const handleItemClick = (item: MenuItem) => {
        if (!item.isAvailable) return
        const isInCart = getItemCartQty(item.id) > 0 && cartRestaurantId === id
        setCustomizationMode(isInCart ? 'customize-existing' : 'new')
        setSelectedItem(item)
    }

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>
    if (error || !restaurant) return (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', maxWidth: 500, margin: '2rem auto' }}>
            <span style={{ fontSize: '3rem' }}>⚠️</span>
            <h3>Could not load restaurant</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>{error || 'The restaurant data is unavailable right now.'}</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={() => window.location.reload()}>Retry</button>
                <Link to="/" className="btn btn-primary" style={{ display: 'inline-block' }}>Back to Home</Link>
            </div>
        </div>
    )

    const cartQty = cartItems.reduce((sum, item) => sum + item.quantity, 0)
    const cartTotal = cartItems.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0)
    const isCurrentRestaurantCart = cartRestaurantId === id

    return (
        <div className="animate-fade-in">
            <Link to="/" style={{ display: 'inline-block', marginBottom: '1rem', color: 'var(--brand)', fontWeight: 600 }}>&larr; Back to Restaurants</Link>

            {/* Restaurant Header */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ width: 112, height: 112, borderRadius: '18px', overflow: 'hidden', background: 'var(--bg-hover)', boxShadow: 'var(--shadow)' }}>
                        <img
                            src={getFoodImageUrl(restaurant.cuisineType || restaurant.name)}
                            alt={restaurant.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-display)' }}>{restaurant.name}</h2>
                        <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0' }}>{restaurant.cuisineType}</p>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                            <span className="rating-badge">⭐ {restaurant.rating}</span>
                            <span>🕐 {restaurant.deliveryTime}</span>
                            {restaurant.branches?.[0] && (
                                <span>📍 {restaurant.branches[0].city}</span>
                            )}
                        </div>
                    </div>
                    {firebaseUser && (
                        <button onClick={handleToggleFavorite} className={`btn ${isFavorite ? 'btn-secondary' : 'btn-primary'}`}>
                            {isFavorite ? '❤️' : '🤍'}
                        </button>
                    )}
                </div>
            </div>

            {/* Main Layout */}
            <div className="restaurant-layout">
                {/* Sidebar - Category Navigation + Cart Summary */}
                <div className="restaurant-sidebar">
                    {/* Sticky Category Navigation */}
                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>📋 Menu Categories</h4>
                        {menuLoading ? (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading…</p>
                        ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {menu?.categories?.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => scrollToCategory(cat.id)}
                                    className={`category-pill ${activeCategory === cat.id ? 'active' : ''}`}
                                    style={{ justifyContent: 'flex-start', textAlign: 'left', width: '100%' }}
                                >
                                    {cat.name} <span style={{ marginLeft: 'auto', fontSize: '0.75rem', opacity: 0.7 }}>({cat.items?.length || 0})</span>
                                </button>
                            ))}
                        </div>
                        )}
                    </div>

                    {/* Mini Cart Summary */}
                    {isCurrentRestaurantCart && cartQty > 0 && (
                        <div className="cart-summary-mini">
                            <h3>
                                🛒 Your Order
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{cartQty} items</span>
                            </h3>
                            <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: '0.75rem' }}>
                                {cartItems.map(item => (
                                    <div key={item.id} className="cart-mini-item">
                                        <span style={{ flex: 1, fontSize: '0.8rem' }}>{item.quantity}x {item.menuItem.name}</span>
                                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{formatPrice(item.pricePerUnit * item.quantity)}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                                <span>Total</span>
                                <span>{formatPrice(cartTotal)}</span>
                            </div>
                            <Link to="/checkout" className="btn btn-primary btn-full" style={{ marginTop: '0.75rem' }}>View Cart →</Link>
                        </div>
                    )}
                </div>

                {/* Main Menu Area */}
                <div className="restaurant-main">
                    {menuLoading ? (
                        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                            <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                            <p style={{ color: 'var(--text-muted)' }}>Loading menu…</p>
                        </div>
                    ) : !menu || !menu.categories?.length ? (
                        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🍽️</span>
                            <h3 style={{ marginBottom: '0.5rem' }}>No menu published yet</h3>
                            <p style={{ color: 'var(--text-muted)' }}>This restaurant has not added menu items yet, or the menu is still being updated.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {menu.categories.map(cat => (
                                <div
                                    key={cat.id}
                                    ref={el => categoryRefs.current[cat.id] = el}
                                    className="menu-category-section"
                                >
                                    <h3 className="menu-category-title">
                                        {cat.name}
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                            ({cat.items?.length || 0} items)
                                        </span>
                                    </h3>

                                    {cat.description && (
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', marginTop: '-0.5rem' }}>
                                            {cat.description}
                                        </p>
                                    )}

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {cat.items?.map(item => {
                                            const qty = getItemCartQty(item.id)
                                            const isInCart = qty > 0
                                            const baseCartItem = getBaseCartItem(item.id)
                                            const baseQty = baseCartItem?.quantity ?? 0

                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`menu-item-card ${!item.isAvailable ? 'sold-out' : ''}`}
                                                    onClick={() => handleItemClick(item)}
                                                >
                                                    {/* Food photo */}
                                                    <div className="menu-item-emoji menu-item-photo">
                                                        <img
                                                            src={getFoodImageUrl(item.name, item.imageUrl)}
                                                            alt={item.name}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                                        />
                                                    </div>

                                                    {/* Info */}
                                                    <div className="menu-item-info">
                                                        <div className="menu-item-header">
                                                            <div>
                                                                <h4 className="menu-item-name">{item.name}</h4>
                                                                {item.isAvailable !== false && (
                                                                    <span className={`menu-item-badge ${item.isVegetarian ? 'veg' : 'non-veg'}`}>
                                                                        {item.isVegetarian ? '🟢 Veg' : '🔴 Non-Veg'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="menu-item-price">{formatPrice(item.price)}</span>
                                                        </div>

                                                        {item.description && (
                                                            <p className="menu-item-desc">{item.description}</p>
                                                        )}

                                                        <div className="menu-item-footer">
                                                            {!item.isAvailable ? (
                                                                <span style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 600 }}>Sold Out</span>
                                                            ) : isInCart && baseQty > 0 ? (
                                                                // Show quantity stepper for the base (plain) item
                                                                <div className="quantity-control" onClick={e => e.stopPropagation()}>
                                                                    <button
                                                                        className="quantity-btn"
                                                                        onClick={(e) => handleQuickDecrement(e, item)}
                                                                    >−</button>
                                                                    <span className="quantity-value">{baseQty}</span>
                                                                    <button
                                                                        className="quantity-btn"
                                                                        onClick={(e) => handleQuickIncrement(e, item)}
                                                                    >+</button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    className="add-to-cart-btn"
                                                                    onClick={(e) => handleQuickAdd(e, item)}
                                                                >
                                                                    + ADD
                                                                </button>
                                                            )}

                                                            {/* Customize label - only visible when customizable */}
                                                            {item.variants?.length > 0 || item.addonGroups?.length > 0 ? (
                                                                <span style={{ fontSize: '0.7rem', color: 'var(--brand)', fontWeight: 600 }}>
                                                                    Customize →
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    {/* NO cart-qty-badge here (removed as requested) */}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Customization Modal */}
            <CustomizationModal
                item={selectedItem}
                isOpen={selectedItem !== null}
                mode={customizationMode}
                existingVariant={selectedItem ? cartItems.find(ci => ci.menuItem.id === selectedItem.id)?.selectedVariant ?? null : null}
                existingAddons={selectedItem ? cartItems.find(ci => ci.menuItem.id === selectedItem.id)?.selectedAddons ?? [] : []}
                onClose={() => setSelectedItem(null)}
                onAdd={(config: any) => {
                    if (!restaurant) return
                    if (config.mode === 'customize-existing') {
                        // Update add-ons on the first existing cart item with this menu item
                        const existingCartItem = cartItems.find(ci => ci.menuItem.id === config.item.id)
                        if (existingCartItem) {
                            updateItemAddons(existingCartItem.id, config.selectedVariant, config.selectedAddons)
                        }
                    } else {
                        // Add as a new separate cart item
                        const res = addToCart(config.item, restaurant.id, restaurant.name, config.selectedVariant, config.selectedAddons, 1)
                        if (res === 'PROMPT_CLEAR') {
                            setPendingConflict({
                                item: config.item,
                                variant: config.selectedVariant,
                                addons: config.selectedAddons,
                                quantity: 1
                            })
                        }
                    }
                    setSelectedItem(null)
                }}
            />

            {/* Conflict Dialog */}
            {pendingConflict && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 400, textAlign: 'center' }}>
                        <div className="modal-body">
                            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🛒</span>
                            <h3>Start New Order?</h3>
                            <p style={{ color: 'var(--text-secondary)', margin: '1rem 0' }}>
                                Your cart has items from another restaurant. Clear and add from {restaurant?.name}?
                            </p>
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                                <button className="btn btn-secondary" onClick={() => setPendingConflict(null)}>Cancel</button>
                                <button className="btn btn-primary" onClick={() => {
                                    if (restaurant) {
                                        forceAddToCart(
                                            pendingConflict.item,
                                            restaurant.id,
                                            restaurant.name,
                                            pendingConflict.variant,
                                            pendingConflict.addons,
                                            pendingConflict.quantity
                                        )
                                    }
                                    setPendingConflict(null)
                                }}>Clear & Add</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}