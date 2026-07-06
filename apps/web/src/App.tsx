//D:\Grrr\apps\web\src\App.tsx
import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { useAuth } from './providers/AuthProvider'
import { useLocation } from './providers/LocationProvider'
import { useTheme } from './providers/ThemeProvider'
import { useCart } from './providers/CartProvider'
import { api } from './lib/api'
import { Restaurant } from '@grrr/contracts'
import Login from './components/Login'
import AddressManager from './components/AddressManager'
import ProfileEditor from './components/ProfileEditor'
import LocationModal from './components/LocationModal'
import RestaurantDetails from './components/RestaurantDetails'
import CartDrawer from './components/CartDrawer'
import Checkout from './components/Checkout'
import OrderHistory from './components/OrderHistory'
import CalorieDashboard from './components/CalorieDashboard'
import RestaurantDashboard from './components/RestaurantDashboard'
import DeliveryDashboard from './components/DeliveryDashboard'
import HomeChatAssistant from './components/HomeChatAssistant'
import PersonalizedRecommendations from './components/PersonalizedRecommendations'
import { getFoodImageUrl } from './lib/foodImages'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { firebaseUser, dbUser, loading } = useAuth()
    if (loading) return null
    if (!firebaseUser && !dbUser) return <Navigate to="/login" replace />
    return <>{children}</>
}

function GuestRoute({ children }: { children: React.ReactNode }) {
    const { firebaseUser, dbUser, loading } = useAuth()
    if (loading) return null
    if (firebaseUser || dbUser) return <Navigate to="/" replace />
    return <>{children}</>
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
    return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1))
}

function getCuisineEmoji(cuisine: string): string {
    const c = cuisine.toLowerCase()
    if (c.includes('burger')) return '🍔'
    if (c.includes('pizza') || c.includes('italian')) return '🍕'
    if (c.includes('salad') || c.includes('vegan') || c.includes('healthy')) return '🥗'
    if (c.includes('dessert') || c.includes('cake') || c.includes('sweet')) return '🍰'
    if (c.includes('sushi') || c.includes('ramen') || c.includes('asian')) return '🥢'
    if (c.includes('indian') || c.includes('curry')) return '🍛'
    if (c.includes('taco') || c.includes('mexican')) return '🌮'
    if (c.includes('chicken')) return '🍗'
    if (c.includes('seafood')) return '🦞'
    if (c.includes('breakfast')) return '🥞'
    if (c.includes('coffee') || c.includes('drink')) return '☕'
    return '🍽️'
}

function App() {
    const { firebaseUser, dbUser, loading, error, logout } = useAuth()
    const { activeAddress } = useLocation()
    const { theme, cycle } = useTheme()
    const { cartItems } = useCart()

    const [showLocationModal, setShowLocationModal] = useState(false)
    const [showCartDrawer, setShowCartDrawer] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [restaurants, setRestaurants] = useState<Restaurant[]>([])
    const [fetchingRestaurants, setFetchingRestaurants] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [filterServiceable, setFilterServiceable] = useState(false)
    const [filterHighRating, setFilterHighRating] = useState(false)
    const [sortBy, setSortBy] = useState<'rating' | 'distance'>('rating')

    const totalCartItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
    const themeIcon = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '💻'

    useEffect(() => {
        async function load() {
            try {
                setFetchingRestaurants(true)
                const data = await api.get<{ restaurants: Restaurant[] }>('/restaurants')
                setRestaurants(data.restaurants)
            } catch (err) {
                console.error('Failed to load restaurants:', err)
            } finally {
                setFetchingRestaurants(false)
            }
        }
        load()
    }, [])

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner" />
                <p className="loading-text">Loading Grrr…</p>
            </div>
        )
    }

    const dynamicCuisines = Array.from(new Set(restaurants.map(r => r.cuisineType.split(',').flat().map(c => c.trim())))).flat()
    const categoriesList = dynamicCuisines.map(c => ({ label: c, emoji: getCuisineEmoji(c) }))

    const getRestaurantDistance = (r: Restaurant): number => {
        if (!activeAddress?.latitude || !activeAddress?.longitude || !r.branches?.length) return 0
        const distances = r.branches.map(b => {
            if (b.latitude === null || b.longitude === null) return Infinity
            return calculateDistanceKm(Number(activeAddress.latitude), Number(activeAddress.longitude), b.latitude, b.longitude)
        })
        return Math.min(...distances) === Infinity ? 0 : Math.min(...distances)
    }

    const processedRestaurants = restaurants
        .map(r => {
            const distance = getRestaurantDistance(r)
            return { ...r, computedDistance: distance, isServiceable: !activeAddress || distance <= 15 }
        })
        .filter(r => {
            const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.cuisineType.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesCategory = !selectedCategory ||
                r.cuisineType.toLowerCase().includes(selectedCategory.toLowerCase())
            const matchesServiceable = !filterServiceable || r.isServiceable
            const matchesRating = !filterHighRating || r.rating >= 4.5
            return matchesSearch && matchesCategory && matchesServiceable && matchesRating
        })
        .sort((a, b) => sortBy === 'rating' ? b.rating - a.rating : a.computedDistance - b.computedDistance)

    return (
        <div className="app-container">
            {/* HEADER */}
            <header className="app-header">
                <div className="header-inner">
                    <Link to={dbUser?.role === 'restaurant' ? "/dashboard" : "/"} className="brand">
                        <div className="brand-logo">🍔</div>
                        <span className="brand-text">Grrr</span>
                    </Link>

                    {dbUser?.role !== 'restaurant' && dbUser?.role !== 'delivery' && (
                        <button onClick={() => setShowLocationModal(true)} className="location-btn">
                            📍 <span>{activeAddress ? activeAddress.addressLine1 : 'Set delivery address'}</span>
                        </button>
                    )}

                    {/* Desktop Nav */}
                    <nav className="desktop-nav">
                        {dbUser?.role === 'restaurant' ? (
                            <>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                                    Hi, <strong style={{ color: 'var(--text)' }}>{dbUser?.name}</strong>
                                </span>
                                <Link to="/dashboard" className="nav-link active">🏪 Dashboard</Link>
                                <button onClick={logout} className="nav-link" style={{ color: 'var(--danger)', marginLeft: '0.5rem' }}>Sign Out</button>
                            </>
                        ) : dbUser?.role === 'delivery' ? (
                            <>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                                    Hi, <strong style={{ color: 'var(--text)' }}>{dbUser?.name?.split(' ')[0]}</strong>
                                </span>
                                <Link to="/delivery-dashboard" className="nav-link active">🛵 Dashboard</Link>
                                <Link to="/profile" className="nav-link">👤 Profile</Link>
                                <button onClick={logout} className="nav-link" style={{ color: 'var(--danger)', marginLeft: '0.5rem' }}>Sign Out</button>
                            </>
                        ) : firebaseUser || dbUser ? (
                            <>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                                    Hi, <strong style={{ color: 'var(--text)' }}>{dbUser?.name?.split(' ')[0] || 'Foodie'}</strong>
                                </span>
                                <button className="nav-link" onClick={() => setShowCartDrawer(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                                    🛒 Cart {totalCartItems > 0 ? `(${totalCartItems})` : ''}
                                </button>
                                <Link to="/orders" className="nav-link">📦 Orders</Link>
                                <Link to="/insights" className="nav-link">📈 Insights</Link>
                                <Link to="/addresses" className="nav-link">📍</Link>
                                <Link to="/profile" className="nav-link">👤</Link>
                                <button onClick={logout} className="nav-link" style={{ color: 'var(--danger)' }}>Sign Out</button>
                            </>
                        ) : (
                            <Link to="/login" className="nav-link active">Sign In</Link>
                        )}
                        <button onClick={cycle} className="theme-btn" title={`Theme: ${theme}`}>{themeIcon}</button>
                    </nav>

                    {/* Mobile Menu Toggle */}
                    <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        {mobileMenuOpen ? '✕' : '☰'}
                    </button>
                </div>

                {/* Mobile Nav */}
                {mobileMenuOpen && (
                    <div className="mobile-nav open">
                        {dbUser?.role === 'restaurant' ? (
                            <>
                                <Link to="/dashboard" className="nav-link" onClick={() => setMobileMenuOpen(false)}>🏪 Dashboard</Link>
                                <button className="nav-link" onClick={() => { logout(); setMobileMenuOpen(false) }} style={{ color: 'var(--danger)' }}>Sign Out</button>
                            </>
                        ) : dbUser?.role === 'delivery' ? (
                            <>
                                <Link to="/delivery-dashboard" className="nav-link" onClick={() => setMobileMenuOpen(false)}>🛵 Dashboard</Link>
                                <Link to="/profile" className="nav-link" onClick={() => setMobileMenuOpen(false)}>👤 Profile</Link>
                                <button className="nav-link" onClick={() => { logout(); setMobileMenuOpen(false) }} style={{ color: 'var(--danger)' }}>Sign Out</button>
                            </>
                        ) : firebaseUser || dbUser ? (
                            <>
                                <Link to="/" className="nav-link" onClick={() => setMobileMenuOpen(false)}>🏠 Home</Link>
                                <button className="nav-link" onClick={() => { setShowCartDrawer(true); setMobileMenuOpen(false) }}>
                                    🛒 Cart ({totalCartItems})
                                </button>
                                <Link to="/orders" className="nav-link" onClick={() => setMobileMenuOpen(false)}>📦 My Orders</Link>
                                <Link to="/insights" className="nav-link" onClick={() => setMobileMenuOpen(false)}>📈 Insights</Link>
                                <Link to="/addresses" className="nav-link" onClick={() => setMobileMenuOpen(false)}>📍 Addresses</Link>
                                <Link to="/profile" className="nav-link" onClick={() => setMobileMenuOpen(false)}>👤 Profile</Link>
                                <button className="nav-link" onClick={() => { logout(); setMobileMenuOpen(false) }} style={{ color: 'var(--danger)' }}>Sign Out</button>
                            </>
                        ) : (
                            <>
                                <Link to="/" className="nav-link" onClick={() => setMobileMenuOpen(false)}>🏠 Home</Link>
                                <Link to="/login" className="nav-link active" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
                            </>
                        )}
                    </div>
                )}
            </header>

            {/* Modals */}
            <LocationModal isOpen={showLocationModal} onClose={() => setShowLocationModal(false)} />
            <CartDrawer isOpen={showCartDrawer} onClose={() => setShowCartDrawer(false)} />

            {/* Main Content */}
            <main className="main-content">
                {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>⚠️ {error}</div>}

                <Routes>
                    <Route path="/" element={
                        dbUser?.role === 'restaurant' ? (
                            <Navigate to="/dashboard" replace />
                        ) : dbUser?.role === 'delivery' ? (
                            <Navigate to="/delivery-dashboard" replace />
                        ) : (
                            <div className="animate-fade-in">
                            <HomeChatAssistant />
                            {/* Hero */}
                            <div className="hero">
                                <div className="hero-content">
                                    <div className="hero-badge">🚀 Fast Delivery</div>
                                    <h1 className="hero-title">{dbUser ? `Hungry, ${dbUser.name?.split(' ')[0]}?` : 'Satisfy Your Cravings'}</h1>
                                    <p className="hero-subtitle">Order from the best local restaurants with delivery in 30 minutes or less.</p>
                                    <div className="hero-actions">
                                        <button onClick={() => document.getElementById('restaurants')?.scrollIntoView({ behavior: 'smooth' })} className="hero-btn-primary">🍽️ Browse Restaurants</button>
                                        <button onClick={() => setShowLocationModal(true)} className="hero-btn-secondary">📍 Set Location</button>
                                    </div>
                                </div>
                                <div className="hero-illustration">🍕</div>
                            </div>
                            
                            {/* Recommendations Carousel */}
                            <PersonalizedRecommendations />

                            {/* Categories */}
                            {categoriesList.length > 0 && (
                                <div className="section">
                                    <div className="section-header">
                                        <h2 className="section-title">What are you craving?</h2>
                                        {selectedCategory && <button onClick={() => setSelectedCategory(null)} style={{ color: 'var(--brand)', fontWeight: 600, fontSize: '0.85rem' }}>Clear ✕</button>}
                                    </div>
                                    <div className="categories-scroll">
                                        {categoriesList.map((c, i) => (
                                            <div key={i} className={`category-card ${selectedCategory === c.label ? 'active' : ''}`} onClick={() => setSelectedCategory(prev => prev === c.label ? null : c.label)}>
                                                <span className="category-emoji">{c.emoji}</span>
                                                <span className="category-label">{c.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Filters + Restaurant Grid */}
                            <div className="section" id="restaurants">
                                <div className="filters-bar">
                                    <div className="search-wrapper">
                                        <span className="search-icon">🔍</span>
                                        <input type="text" placeholder="Search restaurants or cuisines..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="search-input" />
                                    </div>
                                    <div className="filters-row">
                                        <select value={sortBy} onChange={e => setSortBy(e.target.value as 'rating' | 'distance')} className="filter-select">
                                            <option value="rating">⭐ Highest Rated</option>
                                            <option value="distance">📍 Closest First</option>
                                        </select>
                                        <button onClick={() => setFilterServiceable(!filterServiceable)} className={`filter-toggle ${filterServiceable ? 'active' : ''}`}>📍 Serviceable Only</button>
                                        <button onClick={() => setFilterHighRating(!filterHighRating)} className={`filter-toggle ${filterHighRating ? 'active' : ''}`}>⭐ Top Rated (4.5+)</button>
                                    </div>
                                </div>

                                {fetchingRestaurants ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}><div className="spinner" /></div>
                                ) : processedRestaurants.length === 0 ? (
                                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                                        <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🔍</span>
                                        <h3>No restaurants found</h3>
                                        <p style={{ color: 'var(--text-muted)' }}>Try adjusting your filters</p>
                                    </div>
                                ) : (
                                    <div className="restaurant-grid">
                                        {processedRestaurants.map(r => (
                                            <Link to={`/restaurants/${r.id}`} key={r.id} className="restaurant-card">
                                                <div className="restaurant-image">
                                                    <img
                                                        src={getFoodImageUrl(`${r.name} ${r.cuisineType}`)}
                                                        alt={r.name}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                                    />
                                                    {r.rating >= 4.5 && <div className="restaurant-badge">🔥 Popular</div>}
                                                </div>
                                                <div className="restaurant-info">
                                                    <div className="restaurant-name-row">
                                                        <h3 className="restaurant-name">{r.name}</h3>
                                                        <div className="rating-badge">⭐ {r.rating.toFixed(1)}</div>
                                                    </div>
                                                    <p className="restaurant-cuisine">{r.cuisineType}</p>
                                                    <div className="restaurant-meta">
                                                        <span>🕐 {r.deliveryTime}</span>
                                                        <span className="meta-dot" />
                                                        <span>📍 {activeAddress ? `${r.computedDistance} km` : 'Set location'}</span>
                                                    </div>
                                                    <span className={`status-badge ${r.isServiceable ? 'available' : 'unavailable'}`}>
                                                        {r.isServiceable ? '● Available' : '● Too far'}
                                                    </span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        )
                    } />

                    <Route path="/restaurants/:id" element={<RestaurantDetails />} />
                    <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><ProfileEditor /></ProtectedRoute>} />
                    <Route path="/addresses" element={<ProtectedRoute>{dbUser?.role === 'delivery' ? <Navigate to="/delivery-dashboard" /> : <AddressManager />}</ProtectedRoute>} />
                    <Route path="/checkout" element={<ProtectedRoute>{dbUser?.role === 'delivery' ? <Navigate to="/delivery-dashboard" /> : <Checkout />}</ProtectedRoute>} />
                    <Route path="/orders" element={<ProtectedRoute>{dbUser?.role === 'delivery' ? <Navigate to="/delivery-dashboard" /> : <OrderHistory />}</ProtectedRoute>} />
                    <Route path="/calories" element={<ProtectedRoute>{dbUser?.role === 'delivery' ? <Navigate to="/delivery-dashboard" /> : dbUser?.role === 'restaurant' ? <Navigate to="/dashboard" /> : <CalorieDashboard />}</ProtectedRoute>} />
                    <Route path="/insights" element={<ProtectedRoute>{dbUser?.role === 'delivery' ? <Navigate to="/delivery-dashboard" /> : dbUser?.role === 'restaurant' ? <Navigate to="/dashboard" /> : <CalorieDashboard />}</ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute><RestaurantDashboard /></ProtectedRoute>} />
                    <Route path="/delivery-dashboard" element={<ProtectedRoute><DeliveryDashboard /></ProtectedRoute>} />
                </Routes>
            </main>
        </div>
    )
}

export default App