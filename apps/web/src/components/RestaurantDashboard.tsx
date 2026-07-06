//D:\Grrr\apps\web\src\components\RestaurantDashboard.tsx
import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { getFoodImageUrl } from '../lib/foodImages'

export default function RestaurantDashboard() {
    const [restaurantId, setRestaurantId] = useState<string>('')
    const [restaurantName, setRestaurantName] = useState<string>('')
    const [orders, setOrders] = useState<any[]>([])
    const [menu, setMenu] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'menu' | 'stats' | 'settings'>('active')
    const [restaurantForm, setRestaurantForm] = useState({
        name: '',
        description: '',
        cuisineType: '',
        deliveryTime: '30-40 min',
        imageEmoji: '🍽️',
    })
    const [menuForm, setMenuForm] = useState({
        name: 'Main Menu',
        description: '',
        isActive: true,
    })
    
    // Stats & Location state
    const [stats, setStats] = useState<{ totalOrders: number, totalRevenue: number, activeOrders: number } | null>(null)
    const [addressForm, setAddressForm] = useState({ addressLine1: '', city: '', postalCode: '', latitude: 0, longitude: 0 })
    const [locationLoading, setLocationLoading] = useState(false)
    const [processingOrderId, setProcessingOrderId] = useState<string | null>(null)

    // Add Menu Item Form state
    const [itemName, setItemName] = useState('')
    const [itemDesc, setItemDesc] = useState('')
    const [itemCategory, setItemCategory] = useState('')
    const [isCustomCategory, setIsCustomCategory] = useState(false)
    const [customCategory, setCustomCategory] = useState('')
    const [itemPrice, setItemPrice] = useState('')
    const [itemEmoji, setItemEmoji] = useState('🍔')
    const [isVegetarian, setIsVegetarian] = useState(false)
    
    // Existing categories from the current menu
    const existingCategories = menu?.categories?.map(c => c.name) || []
    
    // Optional variants & addons
    const [hasVariants, setHasVariants] = useState(false)
    const [variantsList, setVariantsList] = useState([{ name: '', price: '' }])

    const [hasAddons, setHasAddons] = useState(false)
    const [addonGroupName, setAddonGroupName] = useState('')
    const [addonsList, setAddonsList] = useState([{ name: '', price: '' }])

    const [actionMessage, setActionMessage] = useState<string | null>(null)

    const fetchMenu = async (resId: string) => {
        try {
            const data = await api.get<{ menu: any }>(`/restaurants/${resId}/menu`)
            setMenu(data.menu)
        } catch (err) {
            console.error('Failed to fetch menu:', err)
        }
    }

    const fetchData = async () => {
        try {
            const { restaurants } = await api.get<{ restaurants: any[] }>('/restaurant-owner/my-restaurants')
            if (restaurants.length > 0) {
                const res = restaurants[0]
                setRestaurantId(res.id)
                setRestaurantName(res.name)
                
                const data = await api.get<{ orders: any[] }>(`/orders/restaurant/${res.id}`)
                setOrders(data.orders)
                
                await fetchMenu(res.id)
                
                // Fetch stats
                api.get<any>(`/restaurant-owner/stats/${res.id}`).then(s => setStats(s)).catch(console.error)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
        const interval = setInterval(() => {
            if (restaurantId) {
                api.get<{ orders: any[] }>(`/orders/restaurant/${restaurantId}`)
                    .then(data => setOrders(data.orders))
                    .catch(console.error)
            }
        }, 15000) // Poll orders every 15 seconds
        return () => clearInterval(interval)
    }, [restaurantId])

    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        try {
            setProcessingOrderId(orderId)
            await api.patch(`/orders/${orderId}/status`, { status: newStatus })
            // Refresh orders
            const data = await api.get<{ orders: any[] }>(`/orders/restaurant/${restaurantId}`)
            setOrders(data.orders)
        } catch (err: any) {
            alert(err.message)
        } finally {
            setProcessingOrderId(null)
        }
    }

    const handleCreateRestaurant = async (e: React.FormEvent) => {
        e.preventDefault()
        setActionMessage(null)
        try {
            await api.post('/restaurant-owner/restaurant', {
                name: restaurantForm.name,
                description: restaurantForm.description || null,
                cuisineType: restaurantForm.cuisineType,
                deliveryTime: restaurantForm.deliveryTime,
                imageEmoji: restaurantForm.imageEmoji,
                branches: [],
            })
            setActionMessage('🎉 Restaurant created successfully!')
            await fetchData()
        } catch (err: any) {
            setActionMessage(`❌ Error: ${err.message || 'Failed to create restaurant'}`)
        }
    }

    const handleSaveMenu = async (e: React.FormEvent) => {
        e.preventDefault()
        setActionMessage(null)

        if (!restaurantId) {
            setActionMessage('❌ Create a restaurant first, then create a menu.')
            return
        }

        try {
            await api.post(`/restaurant-owner/menu/${restaurantId}`, {
                name: menuForm.name,
                description: menuForm.description || null,
                isActive: menuForm.isActive,
            })
            setActionMessage('🎉 Menu saved successfully!')
            await fetchMenu(restaurantId)
        } catch (err: any) {
            setActionMessage(`❌ Error: ${err.message || 'Failed to save menu'}`)
        }
    }

    const handleAddMenuItem = async (e: React.FormEvent) => {
        e.preventDefault()
        setActionMessage(null)

        if (!restaurantId) {
            setActionMessage('❌ Create a restaurant first, then add menu items.')
            return
        }
        
        try {
            const priceInCents = Math.round((Number(itemPrice) / 83) * 100) // Convert INR to cents
            const payload: any = {
                name: itemName,
                description: itemDesc || null,
                price: priceInCents,
                imageEmoji: itemEmoji,
                imageUrl: getFoodImageUrl(itemName),
                isAvailable: true,
                isVegetarian,
                category: isCustomCategory ? customCategory : (itemCategory || existingCategories[0] || 'Popular Items'),
                variants: [],
                addonGroups: []
            }

            if (hasVariants && variantsList.length > 0) {
                payload.variants = variantsList
                    .filter(v => v.name && v.price)
                    .map(v => ({
                        name: v.name,
                        priceOverride: Math.round((Number(v.price) / 83) * 100)
                    }))
            }

            if (hasAddons && addonGroupName && addonsList.length > 0) {
                const validAddons = addonsList
                    .filter(a => a.name && a.price)
                    .map(a => ({
                        name: a.name,
                        price: Math.round((Number(a.price) / 83) * 100)
                    }))
                
                if (validAddons.length > 0) {
                    payload.addonGroups.push({
                        name: addonGroupName,
                        minSelection: 0,
                        maxSelection: validAddons.length,
                        addons: validAddons
                    })
                }
            }

            await api.post(`/restaurant-owner/menu/${restaurantId}/items`, payload)
            
            setActionMessage('🎉 Menu item added successfully!')
            setItemName('')
            setItemDesc('')
            setItemPrice('')
            setItemCategory(existingCategories[0] || 'Popular Items')
            setIsCustomCategory(false)
            setCustomCategory('')
            setIsVegetarian(false)
            setVariantsList([{ name: '', price: '' }])
            setAddonsList([{ name: '', price: '' }])
            setAddonGroupName('')
            setHasVariants(false)
            setHasAddons(false)

            await fetchMenu(restaurantId)
        } catch (err: any) {
            setActionMessage(`❌ Error: ${err.message || 'Failed to add item'}`)
        }
    }

    const handleDeleteMenuItem = async (itemId: string) => {
        if (!window.confirm("Are you sure you want to delete this menu item?")) return
        try {
            await api.delete(`/restaurant-owner/menu/${restaurantId}/items/${itemId}`)
            // Refresh menu
            await fetchMenu(restaurantId)
        } catch (err: any) {
            alert(err.message)
        }
    }

    const activeOrders = orders.filter(o => !['delivered', 'cancelled', 'rejected'].includes(o.status))
    const completedOrders = orders.filter(o => ['delivered', 'cancelled', 'rejected'].includes(o.status))

    const handleGetLocation = () => {
        setLocationLoading(true)
        if (!navigator.geolocation) {
            alert('Geolocation not supported')
            setLocationLoading(false)
            return
        }
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                let addressLine1 = '';
                let city = '';
                let postalCode = '';

                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=en`);
                    const data = await res.json();
                    if (data && data.address) {
                        addressLine1 = data.address.road || data.address.pedestrian || data.address.suburb || data.display_name.split(',')[0] || '';
                        city = data.address.city || data.address.town || data.address.village || data.address.county || '';
                        postalCode = data.address.postcode || '';
                    }
                } catch (err) {
                    console.error('Reverse geocoding failed:', err);
                }

                setAddressForm(prev => ({ 
                    ...prev, 
                    latitude: lat, 
                    longitude: lon,
                    addressLine1: addressLine1 || prev.addressLine1,
                    city: city || prev.city,
                    postalCode: postalCode || prev.postalCode
                }))
                setLocationLoading(false)
            },
            (err) => {
                alert('Location access denied')
                setLocationLoading(false)
            }
        )
    }

    const handleSaveLocation = async () => {
        try {
            await api.patch(`/restaurant-owner/location/${restaurantId}`, addressForm)
            alert('Location updated successfully!')
        } catch (err: any) {
            alert(err.message)
        }
    }

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>

    const formatPrice = (cents: number) => `₹${(cents / 100 * 83).toFixed(0)}`

    const statusActions: Record<string, { label: string; nextStatus: string; color: string }[]> = {
        'pending': [
            { label: 'Accept', nextStatus: 'accepted', color: 'var(--success)' },
            { label: 'Reject', nextStatus: 'rejected', color: 'var(--danger)' }
        ],
        'accepted': [
            { label: 'Start Preparing', nextStatus: 'preparing', color: 'var(--warning)' }
        ],
        'preparing': [
            { label: 'Mark Ready', nextStatus: 'ready', color: 'var(--success)' }
        ],
    }

    return (
        <div style={{ maxWidth: 940, margin: '0 auto' }} className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800 }}>🏪 Restaurant Dashboard</h1>
                    {restaurantName && <p style={{ color: 'var(--brand)', fontWeight: 700, fontSize: '1rem' }}>Managing: {restaurantName}</p>}
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', overflowX: 'auto' }}>
                <button onClick={() => setActiveTab('active')} className={`filter-toggle ${activeTab === 'active' ? 'active' : ''}`}>
                    🔴 Active Orders ({activeOrders.length})
                </button>
                <button onClick={() => setActiveTab('completed')} className={`filter-toggle ${activeTab === 'completed' ? 'active' : ''}`}>
                    ✅ Completed Orders ({completedOrders.length})
                </button>
                <button onClick={() => setActiveTab('menu')} className={`filter-toggle ${activeTab === 'menu' ? 'active' : ''}`}>
                    📋 Menu & Catalog
                </button>
                <button onClick={() => setActiveTab('stats')} className={`filter-toggle ${activeTab === 'stats' ? 'active' : ''}`}>
                    📊 Stats
                </button>
                <button onClick={() => setActiveTab('settings')} className={`filter-toggle ${activeTab === 'settings' ? 'active' : ''}`}>
                    ⚙️ Settings
                </button>
            </div>

            {!restaurantId && (
                <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(59,130,246,0.25)' }}>
                    <h3 className="card-title">Create Your Restaurant</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Set up the restaurant first, then add a menu and items.</p>
                    <form onSubmit={handleCreateRestaurant} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <input className="form-input" placeholder="Restaurant name" value={restaurantForm.name} onChange={e => setRestaurantForm({ ...restaurantForm, name: e.target.value })} required />
                        <input className="form-input" placeholder="Cuisine type" value={restaurantForm.cuisineType} onChange={e => setRestaurantForm({ ...restaurantForm, cuisineType: e.target.value })} required />
                        <input className="form-input" placeholder="Delivery time" value={restaurantForm.deliveryTime} onChange={e => setRestaurantForm({ ...restaurantForm, deliveryTime: e.target.value })} required />
                        <select className="filter-select" value={restaurantForm.imageEmoji} onChange={e => setRestaurantForm({ ...restaurantForm, imageEmoji: e.target.value })}>
                            <option value="🍽️">🍽️ Plate</option>
                            <option value="🍔">🍔 Burger</option>
                            <option value="🍕">🍕 Pizza</option>
                            <option value="🥗">🥗 Salad</option>
                            <option value="🍛">🍛 Curry</option>
                            <option value="🍰">🍰 Dessert</option>
                        </select>
                        <textarea className="form-input" rows={2} placeholder="Description" value={restaurantForm.description} onChange={e => setRestaurantForm({ ...restaurantForm, description: e.target.value })} style={{ gridColumn: '1 / -1' }} />
                        <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1' }}>Create Restaurant</button>
                    </form>
                </div>
            )}

            {activeTab === 'stats' ? (
                <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', textAlign: 'center' }}>
                    <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📈</div>
                        <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Orders</h3>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats?.totalOrders || 0}</div>
                    </div>
                    <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💰</div>
                        <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Net Revenue</h3>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatPrice(stats?.totalRevenue || 0)}</div>
                    </div>
                    <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔥</div>
                        <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Active Orders</h3>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats?.activeOrders || 0}</div>
                    </div>
                </div>
            ) : activeTab === 'settings' ? (
                <div className="card" style={{ maxWidth: 600 }}>
                    <h3 className="card-title">📍 Location Settings</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Address Line 1</label>
                            <input type="text" className="form-input" value={addressForm.addressLine1} onChange={e => setAddressForm({ ...addressForm, addressLine1: e.target.value })} placeholder="123 Main St" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">City</label>
                            <input type="text" className="form-input" value={addressForm.city} onChange={e => setAddressForm({ ...addressForm, city: e.target.value })} placeholder="City" />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Latitude</label>
                                <input type="number" className="form-input" value={addressForm.latitude} onChange={e => setAddressForm({ ...addressForm, latitude: parseFloat(e.target.value) })} />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Longitude</label>
                                <input type="number" className="form-input" value={addressForm.longitude} onChange={e => setAddressForm({ ...addressForm, longitude: parseFloat(e.target.value) })} />
                            </div>
                        </div>
                        <button onClick={handleGetLocation} className="btn btn-secondary" disabled={locationLoading}>
                            {locationLoading ? 'Fetching...' : '🎯 Auto-detect GPS Coordinates'}
                        </button>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>* Note: Auto-detect only sets coordinates. Please manually type Address Line 1 and City.</p>
                        <button onClick={handleSaveLocation} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                            💾 Save Location Settings
                        </button>
                    </div>
                </div>
            ) : activeTab === 'menu' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem' }} className="grid-2col">
                    {/* Left - Menu List */}
                    <div>
                        <div className="card">
                            <h3 className="card-title">Current Menu Items</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                {menu ? `Menu: ${menu.name}` : 'No menu created yet. Create one below.'}
                            </p>
                            {!menu || !menu.categories || menu.categories.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>No categories or items found.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    {menu.categories.map((cat: any) => (
                                        <div key={cat.id}>
                                            <h4 style={{ borderBottom: '1.5px solid var(--brand)', paddingBottom: '0.25rem', marginBottom: '0.75rem', fontSize: '0.95rem' }}>{cat.name}</h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {cat.items?.map((item: any) => (
                                                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid var(--border)' }}>
                                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                            <div style={{ width: 52, height: 52, borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-hover)', flexShrink: 0 }}>
                                                                <img
                                                                    src={getFoodImageUrl(item.name, item.imageUrl)}
                                                                    alt={item.name}
                                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                                                />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.name}</div>
                                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{item.description || 'No description'}</div>
                                                                <button 
                                                                    className="btn btn-secondary" 
                                                                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', marginTop: '0.25rem', background: 'var(--danger)', color: 'white' }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleDeleteMenuItem(item.id)
                                                                    }}
                                                                >
                                                                    🗑️ Delete
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{formatPrice(item.price)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="card" style={{ marginTop: '1rem' }}>
                            <h3 className="card-title">Menu Settings</h3>
                            <form onSubmit={handleSaveMenu} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <input className="form-input" placeholder="Menu name" value={menuForm.name} onChange={e => setMenuForm({ ...menuForm, name: e.target.value })} required />
                                <textarea className="form-input" rows={2} placeholder="Menu description" value={menuForm.description} onChange={e => setMenuForm({ ...menuForm, description: e.target.value })} />
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input type="checkbox" checked={menuForm.isActive} onChange={e => setMenuForm({ ...menuForm, isActive: e.target.checked })} />
                                    <span>Menu is active</span>
                                </label>
                                <button type="submit" className="btn btn-secondary">Save Menu</button>
                            </form>
                        </div>
                    </div>

                    {/* Right - Add New Menu Item Form */}
                    <div>
                        <div className="card">
                            <h3 className="card-title">➕ Add New Menu Item</h3>
                            {actionMessage && (
                                <div className={`alert ${actionMessage.includes('❌') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '1rem' }}>
                                    {actionMessage}
                                </div>
                            )}
                            <form onSubmit={handleAddMenuItem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Item Name *</label>
                                    <input type="text" placeholder="e.g. Spicy Chicken Zinger" value={itemName} onChange={e => setItemName(e.target.value)} className="form-input" required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea placeholder="e.g. Crispy fried double patty with melted cheddar cheese..." value={itemDesc} onChange={e => setItemDesc(e.target.value)} className="form-input" rows={2} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Category</label>
                                        <select 
                                            value={isCustomCategory ? 'custom' : itemCategory}
                                            onChange={(e) => {
                                                if (e.target.value === 'custom') {
                                                    setIsCustomCategory(true)
                                                } else {
                                                    setIsCustomCategory(false)
                                                    setItemCategory(e.target.value)
                                                }
                                            }}
                                            className="filter-select"
                                            style={{ width: '100%', height: '40px', marginBottom: isCustomCategory ? '0.5rem' : '0' }}
                                        >
                                            {existingCategories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                            <option value="custom">➕ Other (Create New)</option>
                                        </select>
                                        {isCustomCategory && (
                                            <input 
                                                type="text" 
                                                placeholder="New Category Name" 
                                                value={customCategory} 
                                                onChange={e => setCustomCategory(e.target.value)} 
                                                className="form-input" 
                                                required 
                                            />
                                        )}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Price (INR) *</label>
                                        <input type="number" placeholder="250" value={itemPrice} onChange={e => setItemPrice(e.target.value)} className="form-input" required />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Type</label>
                                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                                                <input type="radio" name="veg" checked={isVegetarian} onChange={() => setIsVegetarian(true)} />
                                                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--success)' }}></span> Veg
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                                                <input type="radio" name="veg" checked={!isVegetarian} onChange={() => setIsVegetarian(false)} />
                                                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--danger)' }}></span> Non-Veg
                                            </label>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Emoji Icon</label>
                                        <select value={itemEmoji} onChange={e => setItemEmoji(e.target.value)} className="filter-select" style={{ width: '100%', height: '40px' }}>
                                            <option value="🍔">🍔 Burger</option>
                                            <option value="🍕">🍕 Pizza</option>
                                            <option value="🍟">🍟 Fries</option>
                                            <option value="🥗">🥗 Salad</option>
                                            <option value="🍛">🍛 Curry</option>
                                            <option value="🍝">🍝 Pasta</option>
                                            <option value="🍰">🍰 Dessert</option>
                                            <option value="🥤">🥤 Drink</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Variants Section */}
                                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={hasVariants} onChange={e => setHasVariants(e.target.checked)} />
                                        <span>Add Variant Option (e.g. Size override)</span>
                                    </label>
                                    {hasVariants && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            {variantsList.map((v, idx) => (
                                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                    <input type="text" placeholder="Size Name (e.g. Large)" value={v.name} onChange={e => { const newV = [...variantsList]; newV[idx].name = e.target.value; setVariantsList(newV) }} className="form-input" style={{ fontSize: '0.8rem' }} />
                                                    <input type="number" placeholder="Variant Price (INR)" value={v.price} onChange={e => { const newV = [...variantsList]; newV[idx].price = e.target.value; setVariantsList(newV) }} className="form-input" style={{ fontSize: '0.8rem' }} />
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => setVariantsList([...variantsList, { name: '', price: '' }])} className="btn" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', alignSelf: 'flex-start' }}>+ Add Another Variant</button>
                                        </div>
                                    )}
                                </div>

                                {/* Addons Section */}
                                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={hasAddons} onChange={e => setHasAddons(e.target.checked)} />
                                        <span>Add Addon group option (e.g. Toppings)</span>
                                    </label>
                                    {hasAddons && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            <input type="text" placeholder="Group Name (e.g. Extra toppings)" value={addonGroupName} onChange={e => setAddonGroupName(e.target.value)} className="form-input" style={{ fontSize: '0.8rem' }} />
                                            {addonsList.map((a, idx) => (
                                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                    <input type="text" placeholder="Addon Name (e.g. Cheese)" value={a.name} onChange={e => { const newA = [...addonsList]; newA[idx].name = e.target.value; setAddonsList(newA) }} className="form-input" style={{ fontSize: '0.8rem' }} />
                                                    <input type="number" placeholder="Addon Price (INR)" value={a.price} onChange={e => { const newA = [...addonsList]; newA[idx].price = e.target.value; setAddonsList(newA) }} className="form-input" style={{ fontSize: '0.8rem' }} />
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => setAddonsList([...addonsList, { name: '', price: '' }])} className="btn" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', alignSelf: 'flex-start' }}>+ Add Another Addon</button>
                                        </div>
                                    )}
                                </div>

                                <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '0.5rem' }}>
                                    Add Item to Menu
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            ) : (
                /* Orders List */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {(activeTab === 'active' ? activeOrders : completedOrders).map(order => (
                        <div key={order.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div>
                                    <strong>Order #{order.id.slice(0, 8)}</strong>
                                    <span style={{ marginLeft: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        {new Date(order.createdAt).toLocaleTimeString('en-IN')}
                                    </span>
                                </div>
                                <span className={`status-badge ${order.status === 'pending' ? 'unavailable' : 'available'}`}>
                                    {order.status.toUpperCase()}
                                </span>
                            </div>

                            {/* Items */}
                            {order.items?.map((item: any) => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                                    <span>{item.quantity}x {item.itemName}</span>
                                    <span>{formatPrice(item.pricePerUnit * item.quantity)}</span>
                                </div>
                            ))}

                            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong>Total: {formatPrice(order.total)}</strong>

                                {/* Action Buttons */}
                                {statusActions[order.status] && (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {statusActions[order.status].map(action => (
                                            <button
                                                key={action.nextStatus}
                                                onClick={() => updateOrderStatus(order.id, action.nextStatus)}
                                                className="btn"
                                                disabled={processingOrderId === order.id}
                                                style={{ background: action.color, color: 'white' }}
                                            >
                                                {processingOrderId === order.id ? '...' : action.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {((activeTab === 'active' ? activeOrders : completedOrders)).length === 0 && (
                        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                            <p style={{ color: 'var(--text-muted)' }}>No {activeTab} orders</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}