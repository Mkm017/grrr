// D:\Grrr\apps\web\src\components\OrderHistory.tsx
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../providers/AuthProvider'
import { api } from '../lib/api'

type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'rejected'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    pending: { label: 'Pending', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', icon: '📋' },
    accepted: { label: 'Accepted', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: '✅' },
    preparing: { label: 'Preparing', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: '👨‍🍳' },
    ready: { label: 'Ready', color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: '📦' },
    picked_up: { label: 'Picked Up', color: '#06B6D4', bg: 'rgba(6,182,212,0.12)', icon: '🏃' },
    out_for_delivery: { label: 'On the Way', color: '#FF4C29', bg: 'rgba(255,76,41,0.12)', icon: '🛵' },
    delivered: { label: 'Delivered', color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: '✅' },
    cancelled: { label: 'Cancelled', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', icon: '✕' },
    rejected: { label: 'Rejected', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', icon: '✕' },
}

function formatPrice(cents: number): string {
    return `₹${(cents / 100 * 83).toFixed(0)}`
}

function timeAgo(isoString: string): string {
    const diff = (Date.now() - new Date(isoString).getTime()) / 1000
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
}

interface OrderItem {
    id: string
    itemName: string
    variantName?: string | null
    quantity: number
    pricePerUnit: number
    addonsJson?: { name: string; price: number }[]
    menuItem?: { imageEmoji?: string; imageUrl?: string | null }
}

interface Order {
    id: string
    restaurantId: string
    restaurant?: { name: string; imageEmoji: string; imageUrl?: string | null }
    status: OrderStatus
    subtotal: number
    deliveryFee: number
    taxes: number
    discount: number
    total: number
    paymentMethod: string
    couponCode?: string | null
    specialInstructions?: string | null
    estimatedDeliveryTime?: string | null
    actualDeliveryTime?: string | null
    createdAt: string
    items?: OrderItem[]
    address?: { addressLine1: string; city: string; postalCode: string }
    deliveryAgent?: { name: string; phoneNumber: string } | null
}

const OrderHistory: React.FC = () => {
    const { firebaseUser } = useAuth()
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [trackingOrder, setTrackingOrder] = useState<Order | null>(null)
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all')

    useEffect(() => {
        if (!firebaseUser) {
            setLoading(false)
            return
        }

        async function fetchOrders() {
            try {
                setLoading(true)
                setError(null)
                const data = await api.get<{ orders: Order[] }>('/orders/my-orders')
                setOrders(data.orders || [])
            } catch (err: any) {
                console.error('Failed to fetch orders:', err)
                setError(err.message || 'Failed to load orders')
            } finally {
                setLoading(false)
            }
        }

        fetchOrders()
        const interval = setInterval(fetchOrders, 30000)
        return () => clearInterval(interval)
    }, [firebaseUser])

    if (!firebaseUser) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', maxWidth: 500, margin: '2rem auto' }}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🔒</span>
                <h2>Sign in to see your orders</h2>
                <Link to="/login" className="btn btn-primary" style={{ marginTop: '1.5rem', display: 'inline-block' }}>Sign In</Link>
            </div>
        )
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                <div className="spinner" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', maxWidth: 500, margin: '2rem auto' }}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>⚠️</span>
                <h3>Error loading orders</h3>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>{error}</p>
                <button onClick={() => window.location.reload()} className="btn btn-primary" style={{ marginTop: '1rem' }}>Try Again</button>
            </div>
        )
    }

    const filteredOrders = orders.filter(o => {
        if (filterStatus === 'active') return ['pending', 'accepted', 'preparing', 'ready', 'picked_up', 'out_for_delivery'].includes(o.status)
        if (filterStatus === 'completed') return ['delivered', 'cancelled', 'rejected'].includes(o.status)
        return true
    })

    const activeCount = orders.filter(o => ['pending', 'accepted', 'preparing', 'ready', 'picked_up', 'out_for_delivery'].includes(o.status)).length

    return (
        <div className="animate-fade-in" style={{ maxWidth: 720, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800 }}>📦 My Orders</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                        {orders.length} orders • {activeCount > 0 ? `${activeCount} active` : 'No active orders'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {(['all', 'active', 'completed'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilterStatus(f)}
                            className={`filter-toggle ${filterStatus === f ? 'active' : ''}`}
                            style={{ textTransform: 'capitalize', fontSize: '0.8rem' }}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {filteredOrders.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🥡</span>
                    <h3>No {filterStatus !== 'all' ? filterStatus : ''} orders</h3>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Time to order something delicious!</p>
                    <Link to="/" className="btn btn-primary" style={{ marginTop: '1.5rem', display: 'inline-block' }}>Browse Restaurants</Link>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filteredOrders.map(order => {
                        const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
                        const isActive = ['pending', 'accepted', 'preparing', 'ready', 'picked_up', 'out_for_delivery'].includes(order.status)
                        return (
                            <div key={order.id} className={`order-history-card ${isActive ? 'active-order' : ''}`}>
                                <div className="order-card-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: 52, height: 52, borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-hover)' }}>
                                            <img
                                                src={order.restaurant?.imageUrl || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=500&q=80'}
                                                alt={order.restaurant?.name || 'Restaurant'}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                            />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{order.restaurant?.name || 'Restaurant'}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                #{order.id.slice(0, 8)} • {timeAgo(order.createdAt)}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="order-status-pill" style={{ background: cfg.bg, color: cfg.color }}>
                                        {cfg.icon} {cfg.label}
                                    </span>
                                </div>

                                {order.items && order.items.length > 0 ? (
                                    <div className="order-items-preview">
                                        {order.items.slice(0, 2).map((item, i) => {
                                            const totalItemsCount = order.items?.length || 0;
                                            return (
                                                <span key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                    {item.quantity}× {item.itemName}
                                                    {i < Math.min(totalItemsCount, 2) - 1 && ', '}
                                                </span>
                                            );
                                        })}
                                        {order.items.length > 2 && (
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                +{order.items.length - 2} more
                                            </span>
                                        )}
                                    </div>
                                ) : null}

                                <div className="order-card-footer">
                                    <div>
                                        <span style={{ fontWeight: 800, fontSize: '1rem' }}>{formatPrice(order.total)}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                                            {order.items?.reduce((s, it) => s + it.quantity, 0) || 0} items
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}
                                            onClick={() => setTrackingOrder(order)}
                                        >
                                            👁 View
                                        </button>
                                        {order.status === 'delivered' && (
                                            <Link
                                                to="/"
                                                className="btn btn-primary"
                                                style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}
                                            >
                                                🔄 Reorder
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Order Detail Modal */}
            {trackingOrder && (
                <div className="modal-overlay" onClick={() => setTrackingOrder(null)}>
                    <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Order Details</h2>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>#{trackingOrder.id.slice(0, 8)}</span>
                            </div>
                            <button className="modal-close" onClick={() => setTrackingOrder(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            {/* Items */}
                            {trackingOrder.items?.map((item: OrderItem) => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                                    <div>
                                        <span style={{ fontWeight: 600 }}>{item.quantity}× {item.itemName}</span>
                                        {item.variantName && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}> ({item.variantName})</span>}
                                    </div>
                                    <span style={{ fontWeight: 600 }}>{formatPrice(item.pricePerUnit * item.quantity)}</span>
                                </div>
                            ))}

                            {/* Price Breakdown */}
                            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.9rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Subtotal</span><span>{formatPrice(trackingOrder.subtotal)}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Delivery</span><span>{trackingOrder.deliveryFee === 0 ? 'FREE' : formatPrice(trackingOrder.deliveryFee)}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Tax</span><span>{formatPrice(trackingOrder.taxes)}</span></div>
                                {trackingOrder.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}><span>Discount</span><span>-{formatPrice(trackingOrder.discount)}</span></div>}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                                    <span>Total</span><span>{formatPrice(trackingOrder.total)}</span>
                                </div>
                            </div>

                            {trackingOrder.address && (
                                <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    📍 {trackingOrder.address.addressLine1}, {trackingOrder.address.city}, {trackingOrder.address.postalCode}
                                </div>
                            )}
                            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                💳 {trackingOrder.paymentMethod}
                            </div>
                            
                            {trackingOrder.deliveryAgent && (
                                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>Delivery Partner</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '1.25rem' }}>🛵</span>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{trackingOrder.deliveryAgent.name}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{trackingOrder.deliveryAgent.phoneNumber}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default OrderHistory