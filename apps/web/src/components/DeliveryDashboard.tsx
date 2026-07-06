import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export default function DeliveryDashboard() {
    const formatPrice = (cents: number) => `₹${(cents / 100 * 83).toFixed(0)}`
    const [locationAllowed, setLocationAllowed] = useState(false)
    const [loading, setLoading] = useState(false)
    const [availableOrders, setAvailableOrders] = useState<any[]>([])
    const [activeAssignment, setActiveAssignment] = useState<any>(null)
    const [activeOrder, setActiveOrder] = useState<any>(null)
    const [stats, setStats] = useState<{ deliveries: number; earnings: number; rating: number } | null>(null)
    const [error, setError] = useState<string | null>(null)

    const fetchDashboardState = async () => {
        try {
            const { assignment, order } = await api.get<any>('/delivery/active-assignment')
            if (assignment && assignment.status !== 'delivered') {
                setActiveAssignment(assignment)
                setActiveOrder(order)
            } else {
                setActiveAssignment(null)
                setActiveOrder(null)
                const { orders } = await api.get<any>('/delivery/available-orders')
                setAvailableOrders(orders)
            }
            const { stats } = await api.get<any>('/delivery/stats')
            setStats(stats)
        } catch (err: any) {
            setError(err.message || 'Failed to fetch dashboard')
        }
    }

    const requestLocation = () => {
        setLoading(true)
        setError(null)
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser')
            setLoading(false)
            return
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    await api.post('/delivery/location', {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    })
                    setLocationAllowed(true)
                    fetchDashboardState()
                } catch (err: any) {
                    setError('Failed to update location on server')
                } finally {
                    setLoading(false)
                }
            },
            (err) => {
                setError('Location access denied. Please allow location to receive orders.')
                setLoading(false)
            }
        )
    }

    useEffect(() => {
        if (locationAllowed) {
            fetchDashboardState()
            const interval = setInterval(fetchDashboardState, 15000) // refresh every 15s
            return () => clearInterval(interval)
        }
    }, [locationAllowed])

    const acceptOrder = async (orderId: string) => {
        try {
            await api.post(`/delivery/accept/${orderId}`, {})
            fetchDashboardState()
        } catch (err: any) {
            setError(err.message || 'Failed to accept order')
        }
    }

    const updateStatus = async (status: string, orderStatus: string) => {
        if (!activeAssignment) return
        try {
            await api.patch(`/delivery/status/${activeAssignment.id}`, { status, orderStatus })
            fetchDashboardState()
        } catch (err: any) {
            setError(err.message || 'Failed to update status')
        }
    }

    if (!locationAllowed) {
        return (
            <div style={{ maxWidth: 600, margin: '4rem auto', textAlign: 'center' }} className="animate-fade-in card">
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📍</div>
                <h2>Share Your Location</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>We need your live location to match you with nearby delivery orders.</p>
                {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
                <button onClick={requestLocation} className="btn btn-primary" disabled={loading}>
                    {loading ? 'Locating...' : 'Allow Location Access'}
                </button>
            </div>
        )
    }

    return (
        <div style={{ maxWidth: 940, margin: '0 auto' }} className="animate-fade-in">
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, marginBottom: '1.5rem' }}>🛵 Delivery Dashboard</h1>
            
            {stats && (
                <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center', marginBottom: '1.5rem', backgroundColor: 'var(--brand)', color: 'white' }}>
                    <div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Earnings</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatPrice(stats.earnings)}</div>
                    </div>
                    <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
                        <div style={{ fontSize: '0.85rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deliveries</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.deliveries}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rating</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>⭐ {stats.rating.toFixed(1)}</div>
                    </div>
                </div>
            )}

            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

            {activeAssignment ? (
                <div className="card" style={{ border: '2px solid var(--brand)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <h2 style={{ color: 'var(--brand)', marginBottom: '0.25rem' }}>Active Delivery</h2>
                            <p style={{ color: 'var(--text-muted)' }}>Status: <strong>{activeOrder?.status.toUpperCase()}</strong></p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{formatPrice(activeOrder?.earning || 0)}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Earning</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ padding: '1rem', backgroundColor: 'var(--bg)', borderRadius: '12px' }}>
                            <h4 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>PICKUP FROM</h4>
                            <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{activeOrder?.restaurant?.name}</p>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{activeOrder?.restaurant?.branch?.addressLine1 || 'Address not available'}</p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{activeOrder?.restaurant?.branch?.city || ''}</p>
                        </div>
                        <div style={{ padding: '1rem', backgroundColor: 'var(--bg)', borderRadius: '12px' }}>
                            <h4 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>DELIVER TO</h4>
                            <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{activeOrder?.address?.addressLine1}</p>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{activeOrder?.address?.addressLine2 || 'No extra address info'}</p>
                            {activeOrder?.specialInstructions && <p style={{ fontSize: '0.85rem', color: 'var(--warning)', marginTop: '0.5rem' }}>Note: {activeOrder.specialInstructions}</p>}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {activeOrder?.status === 'accepted' || activeOrder?.status === 'preparing' ? (
                            <button className="btn btn-secondary" style={{ flex: 1, opacity: 0.6 }} disabled>
                                Waiting for Restaurant...
                            </button>
                        ) : activeOrder?.status === 'ready' ? (
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => updateStatus('picked_up', 'out_for_delivery')}>
                                Confirm Pickup 🥡
                            </button>
                        ) : activeOrder?.status === 'out_for_delivery' ? (
                            <button className="btn btn-primary" style={{ flex: 1, backgroundColor: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => updateStatus('delivered', 'delivered')}>
                                Mark Delivered ✅
                            </button>
                        ) : null}
                    </div>
                </div>
            ) : (
                <div>
                    <h3 style={{ marginBottom: '1rem' }}>📡 Searching Nearby Orders</h3>
                    {availableOrders.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                            <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                            <p style={{ color: 'var(--text-muted)' }}>No pending orders nearby right now...</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {availableOrders.map(order => (
                                <div key={order.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ marginBottom: '0.25rem' }}>{order.restaurant?.name}</h4>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>From: {order.restaurant?.branch?.addressLine1 || 'Unknown'}</p>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>To: {order.address?.addressLine1}</p>
                                        <p style={{ fontSize: '0.85rem', marginTop: '0.25rem', fontWeight: 600 }}>Earn: {formatPrice(order.earning || 0)}</p>
                                    </div>
                                    <button className="btn btn-primary" onClick={() => acceptOrder(order.id)}>Accept</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
