import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useLocation } from '../providers/LocationProvider';
import { useAuth } from '../providers/AuthProvider';
import { useCart } from '../providers/CartProvider';
import { MenuItem } from '@grrr/contracts';
import { getFoodImageUrl } from '../lib/foodImages';

interface Recommendation {
    item: {
        id: string;
        name: string;
        description: string;
        price: number;
        imageEmoji: string | null;
        imageUrl?: string | null;
        isVegetarian: boolean;
    };
    restaurant: {
        id: string;
        name: string;
        rating: number;
        cuisineType: string;
    };
    reason: string;
}

export default function PersonalizedRecommendations() {
    const { activeAddress } = useLocation();
    const { dbUser, loading: authLoading } = useAuth();
    const { addToCart, forceAddToCart, cartItems, cartRestaurantId, updateQuantity, removeFromCart } = useCart();
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(true);

    const formatPrice = (cents: number) => `₹${(cents / 100 * 83).toFixed(0)}`;

    const handleAdd = (rec: Recommendation) => {
        const item = {
            id: rec.item.id,
            name: rec.item.name,
            description: rec.item.description || '',
            price: rec.item.price,
            imageEmoji: rec.item.imageEmoji || null,
            imageUrl: rec.item.imageUrl || null,
            isAvailable: true,
            isVegetarian: rec.item.isVegetarian
        } as MenuItem;

        const result = addToCart(item, rec.restaurant.id, rec.restaurant.name, null, [], 1);
        if (result === 'PROMPT_CLEAR') {
            if (window.confirm(`This item is from ${rec.restaurant.name}, but you have items from another restaurant in your cart. Start a new order?`)) {
                forceAddToCart(item, rec.restaurant.id, rec.restaurant.name, null, [], 1);
            }
        }
    };

    const getBaseCartItem = (menuItemId: string, restId: string) => {
        if (cartRestaurantId !== restId) return null;
        return cartItems.find(ci => ci.menuItem.id === menuItemId && !ci.selectedVariant && ci.selectedAddons.length === 0) ?? null;
    };

    const getItemCartQty = (menuItemId: string, restId: string) => {
        if (cartRestaurantId !== restId) return 0;
        return cartItems.filter(ci => ci.menuItem.id === menuItemId).reduce((sum, ci) => sum + ci.quantity, 0);
    };

    const handleIncrement = (menuItemId: string, restId: string) => {
        const baseItem = getBaseCartItem(menuItemId, restId);
        if (baseItem) {
            updateQuantity(baseItem.id, baseItem.quantity + 1);
        }
    };

    const handleDecrement = (menuItemId: string, restId: string) => {
        const baseItem = getBaseCartItem(menuItemId, restId);
        if (baseItem) {
            if (baseItem.quantity <= 1) {
                removeFromCart(baseItem.id);
            } else {
                updateQuantity(baseItem.id, baseItem.quantity - 1);
            }
        }
    };

    useEffect(() => {
        if (authLoading) return;
        
        // Hide from guests
        if (!dbUser) {
            setLoading(false);
            return;
        }

        async function fetchRecs() {
            try {
                let url = '/recommendations';
                if (activeAddress) {
                    url += `?lat=${activeAddress.latitude}&lng=${activeAddress.longitude}`;
                }
                const data = await api.get<{ recommendations: Recommendation[] }>(url);
                setRecommendations(data.recommendations);
            } catch (error) {
                console.error("Failed to fetch recommendations", error);
            } finally {
                setLoading(false);
            }
        }
        
        fetchRecs();
    }, [activeAddress, dbUser, authLoading]);

    if (loading) {
        return (
            <div className="section recommendations-section">
                <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '1rem 0' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="card pulse" style={{ width: 300, height: 180, flexShrink: 0, borderRadius: 'var(--radius-lg)' }} />
                    ))}
                </div>
            </div>
        );
    }

    if (!dbUser || recommendations.length === 0) {
        return null; // Don't show if not logged in or no recs available
    }

    return (
        <div className="section recommendations-section">
            <div className="section-header">
                <h2 className="section-title">✨ Recommended For You</h2>
            </div>
            
            <div className="recommendations-carousel">
                {recommendations.map((rec, idx) => {
                    const qty = getItemCartQty(rec.item.id, rec.restaurant.id);
                    return (
                    <div key={idx} className="recommendation-card">
                        <div className="rec-image">
                            <img
                                src={getFoodImageUrl(rec.item.name, rec.item.imageUrl)}
                                alt={rec.item.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                        </div>
                        <div className="rec-content">
                            <div className="rec-header">
                                <div>
                                    <h3 className="rec-item-name">
                                        {rec.item.name} 
                                        {rec.item.isVegetarian && <span className="veg-badge" title="Vegetarian">🟢</span>}
                                    </h3>
                                    <p className="rec-restaurant-name">from {rec.restaurant.name}</p>
                                </div>
                                <span className="rec-price">{formatPrice(rec.item.price)}</span>
                            </div>
                            
                            <div className="rec-reason-box">
                                <span className="ai-sparkles">✨</span>
                                <p className="rec-reason">{rec.reason}</p>
                            </div>
                            
                            <div className="rec-add-btn-container" style={{ marginTop: 'auto' }}>
                                {qty > 0 ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--brand)', color: 'white', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', fontWeight: 600 }}>
                                        <button 
                                            onClick={() => handleDecrement(rec.item.id, rec.restaurant.id)} 
                                            style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}
                                        >-</button>
                                        <span>{qty}</span>
                                        <button 
                                            onClick={() => handleIncrement(rec.item.id, rec.restaurant.id)} 
                                            style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}
                                        >+</button>
                                    </div>
                                ) : (
                                    <button 
                                        className="btn btn-primary rec-add-btn"
                                        onClick={() => handleAdd(rec)}
                                        style={{ width: '100%' }}
                                    >
                                        Add to Cart
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    );
                })}
            </div>
        </div>
    );
}
