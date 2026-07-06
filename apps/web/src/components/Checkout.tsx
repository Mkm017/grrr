//D:\Grrr\apps\web\src\components\Checkout.tsx
import React, { useState } from 'react'
import { useCart } from '../providers/CartProvider'
import { useLocation } from '../providers/LocationProvider'
import { useAuth } from '../providers/AuthProvider'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export default function Checkout() {
    const { cartItems, cartRestaurantId, cartRestaurantName, subtotal, deliveryFee, taxes, discount, total, appliedCoupon, applyCoupon, removeCoupon, clearCart } = useCart()
    const { activeAddress, savedAddresses } = useLocation()
    const { dbUser } = useAuth()
    const navigate = useNavigate()

    const [couponInput, setCouponInput] = useState('')

    const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card')
    const [specialInstructions, setSpecialInstructions] = useState('')
    const [selectedAddressId, setSelectedAddressId] = useState(activeAddress?.id || '')
    const [placing, setPlacing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [orderPlaced, setOrderPlaced] = useState(false)

    const formatPrice = (cents: number) => `₹${(cents / 100 * 83).toFixed(0)}`

    const handlePlaceOrder = async () => {
        if (!cartRestaurantId || cartItems.length === 0) {
            setError('Your cart is empty')
            return
        }
        if (!selectedAddressId) {
            setError('Please select a delivery address')
            return
        }

        const selAddressObj = savedAddresses.find(a => a.id === selectedAddressId)
        if (selAddressObj && (!selAddressObj.addressLine1 || !selAddressObj.city)) {
            setError('Your selected address is incomplete. Please update it with a full address line and city in the Addresses tab.')
            return
        }

        setPlacing(true)
        setError(null)

        try {
            await api.post('/orders', {
                restaurantId: cartRestaurantId,
                addressId: selectedAddressId,
                items: cartItems.map(item => ({
                    menuItemId: item.menuItem.id,
                    itemName: item.menuItem.name,
                    variantName: item.selectedVariant?.name || null,
                    quantity: item.quantity,
                    pricePerUnit: item.pricePerUnit,
                    addons: item.selectedAddons.map(a => ({ name: a.name, price: a.price }))
                })),
                subtotal,
                deliveryFee,
                taxes,
                discount,
                total,
                couponCode: appliedCoupon || null,
                paymentMethod,
                specialInstructions: specialInstructions || null
            })

            setOrderPlaced(true)
            clearCart()

            setTimeout(() => {
                navigate('/orders')
            }, 2000)
        } catch (err: any) {
            setError(err.message || 'Failed to place order. Please try again.')
        } finally {
            setPlacing(false)
        }
    }

    if (orderPlaced) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', maxWidth: 500, margin: '2rem auto' }}>
                <span style={{ fontSize: '4rem', display: 'block', marginBottom: '1rem' }}>🎉</span>
                <h2>Order Placed!</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Redirecting to orders...
                </p>
            </div>
        )
    }

    if (cartItems.length === 0) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', maxWidth: 500, margin: '2rem auto' }}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🛒</span>
                <h2>Cart is empty</h2>
                <button onClick={() => navigate('/')} className="btn btn-primary" style={{ marginTop: '1rem' }}>Browse Restaurants</button>
            </div>
        )
    }

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }} className="animate-fade-in">
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: '1.5rem' }}>Checkout</h1>

            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

            <div className="grid-2col">
                <div>
                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <h3 className="card-title">📍 Delivery Address</h3>
                        {savedAddresses.length > 0 ? (
                            savedAddresses.map(addr => (
                                <label key={addr.id} style={{
                                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                                    padding: '0.75rem', border: `2px solid ${selectedAddressId === addr.id ? 'var(--brand)' : 'var(--border)'}`,
                                    borderRadius: 'var(--radius-md)', cursor: 'pointer', marginBottom: '0.5rem',
                                    background: selectedAddressId === addr.id ? 'var(--brand-glow)' : 'transparent'
                                }}>
                                    <input type="radio" name="address" checked={selectedAddressId === addr.id} onChange={() => setSelectedAddressId(addr.id)} />
                                    <div>
                                        <p style={{ fontWeight: 600 }}>{addr.addressLine1}</p>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{addr.city}, {addr.postalCode}</p>
                                    </div>
                                </label>
                            ))
                        ) : (
                            <p style={{ color: 'var(--text-muted)' }}>No saved addresses</p>
                        )}
                    </div>

                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <h3 className="card-title">💳 Payment</h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => setPaymentMethod('card')} className={`btn ${paymentMethod === 'card' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }}>💳 Card</button>
                            <button onClick={() => setPaymentMethod('cash')} className={`btn ${paymentMethod === 'cash' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }}>💵 Cash</button>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="card-title">📝 Instructions</h3>
                        <textarea value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} placeholder="Any special requests?" className="form-input" rows={3} style={{ resize: 'vertical', width: '100%' }} />
                    </div>

                    <div className="card" style={{ marginTop: '1rem' }}>
                        <h3 className="card-title">🎟️ Apply Coupon</h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="text" value={couponInput} onChange={e => setCouponInput(e.target.value.toUpperCase())} placeholder="e.g. GRRR10" className="form-input" style={{ flex: 1 }} disabled={!!appliedCoupon} />
                            {appliedCoupon ? (
                                <button onClick={() => { removeCoupon(); setCouponInput('') }} className="btn btn-secondary">Remove</button>
                            ) : (
                                <button onClick={() => {
                                    const res = applyCoupon(couponInput)
                                    if (!res.success) setError(res.message)
                                    else setError(null)
                                }} className="btn btn-primary" disabled={!couponInput}>Apply</button>
                            )}
                        </div>
                    </div>
                </div>

                <div>
                    <div className="card" style={{ position: 'sticky', top: '5rem' }}>
                        <h3 className="card-title">📋 Order from {cartRestaurantName}</h3>
                        {cartItems.map(item => (
                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                                <span>{item.quantity}x {item.menuItem.name}</span>
                                <span style={{ fontWeight: 600 }}>{formatPrice(item.pricePerUnit * item.quantity)}</span>
                            </div>
                        ))}
                        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Delivery</span><span>{deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Tax</span><span>{formatPrice(taxes)}</span></div>
                            {discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}><span>Discount</span><span>-{formatPrice(discount)}</span></div>}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                                <span>Total</span><span>{formatPrice(total)}</span>
                            </div>
                        </div>
                        <button onClick={handlePlaceOrder} disabled={placing || !selectedAddressId} className="btn btn-primary btn-full" style={{ marginTop: '1.5rem', padding: '1rem' }}>
                            {placing ? 'Placing Order...' : `Place Order • ${formatPrice(total)}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}