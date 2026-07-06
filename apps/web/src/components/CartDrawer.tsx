//D:\Grrr\apps\web\src\components\CartDrawer.tsx
import React, { useState } from 'react'
import { useCart } from '../providers/CartProvider'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { getFoodImageUrl } from '../lib/foodImages'

interface CartDrawerProps {
    isOpen: boolean
    onClose: () => void
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
    const { cartItems, cartRestaurantId, cartRestaurantName, removeFromCart, updateQuantity, subtotal, deliveryFee, taxes, discount, total, appliedCoupon, applyCoupon, removeCoupon } = useCart()
    const navigate = useNavigate()
    const [couponCode, setCouponCode] = useState('')
    const [couponFeedback, setCouponFeedback] = useState<{ success: boolean; message: string } | null>(null)
    
    // Nutrition Analysis State
    const [nutritionData, setNutritionData] = useState<any>(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [analysisError, setAnalysisError] = useState<string | null>(null)

    if (!isOpen) return null

    const formatPrice = (cents: number) => `₹${(cents / 100 * 83).toFixed(0)}`

    const handleApplyCoupon = (e: React.FormEvent) => {
        e.preventDefault()
        if (!couponCode.trim()) return
        const res = applyCoupon(couponCode)
        setCouponFeedback(res)
        if (res.success) setCouponCode('')
    }

    const handleAnalyzeNutrition = async () => {
        if (cartItems.length === 0) return;
        setIsAnalyzing(true);
        setAnalysisError(null);
        try {
            const resId = cartRestaurantId;
            if (!resId) throw new Error('No restaurant ID found for the cart');
            const simplifiedItems = cartItems.map(item => ({
                name: item.menuItem.name,
                quantity: item.quantity,
                variant: item.selectedVariant?.name || null,
                addons: item.selectedAddons.map(a => a.name)
            }));
            
            const data = await api.post<any>('/ai/analyze-nutrition', { 
                restaurantId: resId, 
                cartItems: simplifiedItems 
            });
            
            setNutritionData(data);
        } catch (err: any) {
            setAnalysisError('Could not analyze nutrition at this time.');
            console.error(err);
        } finally {
            setIsAnalyzing(false);
        }
    }

    return (
        <div className="drawer-overlay" onClick={onClose}>
            {/* Left side panel for AI Nutrition Assistant */}
            {(isAnalyzing || nutritionData || analysisError) && (
                <div className="nutrition-side-panel animate-slide-in-left" onClick={e => e.stopPropagation()}>
                    <div className="drawer-header" style={{ borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(16,185,129,0.1))' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--brand)' }}>✨ AI Nutrition Assistant</h3>
                    </div>
                    
                    <div className="drawer-body" style={{ padding: '1.5rem' }}>
                        {isAnalyzing && (
                            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                                <div className="spinner" style={{ margin: '0 auto 1rem', width: '40px', height: '40px', borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
                                <p style={{ color: 'var(--brand)', fontWeight: 600, fontSize: '1rem' }}>Analyzing macros and ingredients...</p>
                            </div>
                        )}
                        
                        {analysisError && (
                            <div className="alert alert-error" style={{ fontSize: '0.9rem' }}>{analysisError}</div>
                        )}

                        {nutritionData && (() => {
                            const totalMacros = (nutritionData.protein || 0) + (nutritionData.carbs || 0) + (nutritionData.fat || 0);
                            const pPct = totalMacros > 0 ? (nutritionData.protein / totalMacros) * 100 : 0;
                            const cPct = totalMacros > 0 ? (nutritionData.carbs / totalMacros) * 100 : 0;
                            const donutGradient = `conic-gradient(#3b82f6 0% ${pPct}%, #10b981 ${pPct}% ${pPct + cPct}%, #ef4444 ${pPct + cPct}% 100%)`;

                            return (
                                <div className="nutrition-dashboard animate-fade-in" style={{ marginTop: 0, background: 'transparent', padding: 0, border: 'none' }}>
                                    <div className="nutrition-grid">
                                        <div>
                                            <div className="nutrition-donut-container" style={{ background: donutGradient }}>
                                                <div className="nutrition-donut-inner">
                                                    <div className="nutrition-donut-value">{nutritionData.calories}</div>
                                                    <div className="nutrition-donut-label">kcal</div>
                                                </div>
                                            </div>
                                            
                                            <div className="nutrition-bars">
                                                <div className="nutrition-bar-row">
                                                    <span className="nutrition-bar-label">Pro</span>
                                                    <div className="nutrition-bar-track">
                                                        <div className="nutrition-bar-fill protein" style={{ width: `${Math.min(100, (nutritionData.protein / 150) * 100)}%` }}></div>
                                                    </div>
                                                    <span className="nutrition-bar-value">{nutritionData.protein}g</span>
                                                </div>
                                                <div className="nutrition-bar-row">
                                                    <span className="nutrition-bar-label">Carbs</span>
                                                    <div className="nutrition-bar-track">
                                                        <div className="nutrition-bar-fill carbs" style={{ width: `${Math.min(100, (nutritionData.carbs / 300) * 100)}%` }}></div>
                                                    </div>
                                                    <span className="nutrition-bar-value">{nutritionData.carbs}g</span>
                                                </div>
                                                <div className="nutrition-bar-row">
                                                    <span className="nutrition-bar-label">Fat</span>
                                                    <div className="nutrition-bar-track">
                                                        <div className="nutrition-bar-fill fat" style={{ width: `${Math.min(100, (nutritionData.fat / 100) * 100)}%` }}></div>
                                                    </div>
                                                    <span className="nutrition-bar-value">{nutritionData.fat}g</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <div className="nutrition-cards" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <div className="nutrition-insight-card">
                                                    <div className="nutrition-insight-label">HEALTH INSIGHT</div>
                                                    <div className="nutrition-insight-text">{nutritionData.healthInsight}</div>
                                                </div>
                                                
                                                {nutritionData.betterAlternative && (
                                                    <div className="nutrition-insight-card" style={{ borderLeftColor: '#10b981' }}>
                                                        <div className="nutrition-insight-label" style={{ color: '#047857' }}>BETTER ALTERNATIVE</div>
                                                        <div className="nutrition-insight-text">Swap to: {nutritionData.betterAlternative}</div>
                                                        {nutritionData.alternativeReason && (
                                                            <div style={{ color: '#065f46', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                                                {nutritionData.alternativeReason}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            <div className="drawer" onClick={e => e.stopPropagation()}>
                <div className="drawer-header">
                    <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>🛒 Your Order</h3>
                        {cartRestaurantName && <span style={{ fontSize: '0.8rem', color: 'var(--brand)', fontWeight: 600 }}>From {cartRestaurantName}</span>}
                    </div>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="drawer-body">
                    {cartItems.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🥡</span>
                            <p style={{ fontWeight: 600 }}>Your cart is empty</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {cartItems.map(item => (
                                <div key={item.id} className="cart-drawer-item">
                                    {/* Item photo */}
                                    <div className="cart-item-emoji-box">
                                        <img
                                            src={getFoodImageUrl(item.menuItem.name, item.menuItem.imageUrl)}
                                            alt={item.menuItem.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                        />
                                    </div>

                                    {/* Item details */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.menuItem.name}</span>
                                            <span style={{ fontWeight: 800 }}>{formatPrice(item.pricePerUnit * item.quantity)}</span>
                                        </div>

                                        {/* Variant as sub-label */}
                                        {item.selectedVariant && (
                                            <div className="cart-item-customizations">
                                                <span className="cart-addon-chip">📐 {item.selectedVariant.name}</span>
                                            </div>
                                        )}

                                        {/* Add-ons shown as sub-chips (not separate line items) */}
                                        {item.selectedAddons.length > 0 && (
                                            <div className="cart-item-customizations">
                                                {item.selectedAddons.map(addon => (
                                                    <span key={addon.id} className="cart-addon-chip">
                                                        + {addon.name} <span style={{ opacity: 0.7 }}>({formatPrice(addon.price)})</span>
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Quantity + Remove */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                                            <div className="quantity-control">
                                                <button className="quantity-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                                                <span className="quantity-value">{item.quantity}</span>
                                                <button className="quantity-btn" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                                            </div>
                                            <button onClick={() => removeFromCart(item.id)} style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.8rem' }}>Remove</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                                   <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                                <button 
                                    className="btn btn-secondary btn-full" 
                                    onClick={handleAnalyzeNutrition}
                                    style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(16,185,129,0.1))', border: '1px solid rgba(59,130,246,0.2)', color: 'var(--brand)' }}
                                >
                                    ✨ Analyze Nutrition
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {cartItems.length > 0 && (
                    <div className="drawer-footer">
                        <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <input type="text" placeholder="Coupon code (e.g. GRRR10)" value={couponCode} onChange={e => setCouponCode(e.target.value)} className="form-input" style={{ flex: 1, fontSize: '0.85rem' }} />
                            <button type="submit" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>Apply</button>
                        </form>

                        {appliedCoupon && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.75rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>
                                <span>🎫 {appliedCoupon} applied</span>
                                <button onClick={removeCoupon} style={{ color: 'var(--danger)', fontWeight: 700 }}>Remove</button>
                            </div>
                        )}

                        {couponFeedback && !appliedCoupon && (
                            <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem', fontSize: '0.8rem', color: couponFeedback.success ? 'var(--success)' : 'var(--danger)', background: couponFeedback.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
                                {couponFeedback.message}
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Delivery</span><span>{deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Tax</span><span>{formatPrice(taxes)}</span></div>
                            {discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}><span>Discount</span><span>-{formatPrice(discount)}</span></div>}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                                <span>Total</span><span>{formatPrice(total)}</span>
                            </div>
                        </div>

                        <button onClick={() => { onClose(); navigate('/checkout') }} className="btn btn-primary btn-full">Proceed to Checkout</button>
                    </div>
                )}
            </div>
        </div>
    )
}