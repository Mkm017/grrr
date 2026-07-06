//D:\Grrr\apps\web\src\components\Login.tsx
import React, { useState, useRef, useEffect } from 'react'
import { signInWithPopup, GoogleAuthProvider, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useAuth } from '../providers/AuthProvider'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

type UserRoleTab = 'user' | 'restaurant' | 'delivery'

export default function Login() {
    const { loginAsRestaurant, refreshProfile } = useAuth()
    const navigate = useNavigate()

    const [activeTab, setActiveTab] = useState<UserRoleTab>('user')
    const [phoneNumber, setPhoneNumber] = useState('')
    const [verificationCode, setVerificationCode] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [otpSent, setOtpSent] = useState(false)
    const [loading, setLoading] = useState(false)

    // Restaurant login state
    const [restaurantUser, setRestaurantUser] = useState('')
    const [restaurantPass, setRestaurantPass] = useState('')

    const confirmationRef = useRef<ConfirmationResult | null>(null)
    const recaptchaRef = useRef<RecaptchaVerifier | null>(null)

    useEffect(() => { return () => { recaptchaRef.current?.clear() } }, [])

    const handleFirebaseSuccess = async () => {
        if (activeTab === 'delivery') {
            try {
                // Ensure profile exists on the backend first
                await refreshProfile()
                // Update profile role to delivery
                const profile = await api.get<any>('/users/me')
                if (profile.role !== 'delivery') {
                    await api.put('/users/profile', {
                        name: profile.name || 'Delivery Partner',
                        role: 'delivery'
                    })
                    await refreshProfile()
                }
            } catch (err) {
                console.error('Failed to sync delivery role:', err)
            }
        } else if (activeTab === 'user') {
            try {
                // Ensure role is set back to 'user' if they sign in as customer
                await refreshProfile()
                const profile = await api.get<any>('/users/me')
                if (profile.role !== 'user') {
                    await api.put('/users/profile', {
                        name: profile.name || 'Foodie',
                        role: 'user'
                    })
                    await refreshProfile()
                }
            } catch (err) {
                console.error('Failed to sync customer role:', err)
            }
        }
    }

    const handleGoogle = async () => {
        setError(null); setLoading(true)
        try {
            await signInWithPopup(auth, new GoogleAuthProvider())
            await handleFirebaseSuccess()
            navigate('/')
        } catch (err: any) {
            setError(err.message)
        }
        setLoading(false)
    }

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault(); setError(null); setLoading(true)
        try {
            recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' })
            confirmationRef.current = await signInWithPhoneNumber(auth, phoneNumber, recaptchaRef.current)
            setOtpSent(true)
        } catch (err: any) {
            setError(err.message)
        }
        setLoading(false)
    }

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault(); setError(null); setLoading(true)
        try {
            await confirmationRef.current?.confirm(verificationCode)
            await handleFirebaseSuccess()
            navigate('/')
        } catch (err: any) {
            setError(err.message)
        }
        setLoading(false)
    }

    const handleRestaurantSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError(null); setLoading(true)
        try {
            const data = await api.post<{ success: boolean; token: string; user: any }>('/restaurant-owner/login', {
                username: restaurantUser,
                password: restaurantPass
            })
            if (data.success) {
                loginAsRestaurant(data.token, data.user)
                navigate('/dashboard')
            }
        } catch (err: any) {
            setError(err.message || 'Login failed')
        }
        setLoading(false)
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 1rem' }}>
            <div className="card" style={{ width: '100%', maxWidth: 460 }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', textAlign: 'center', marginBottom: '0.5rem' }}>Welcome to Grrr 🍔</h2>
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Choose your login option to continue</p>

                {/* Tabs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.35rem', background: 'var(--bg-hover)', padding: '0.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                    <button
                        type="button"
                        onClick={() => { setActiveTab('user'); setError(null); setOtpSent(false) }}
                        style={{
                            padding: '0.5rem', border: 'none', borderRadius: 'var(--radius-sm)',
                            fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                            background: activeTab === 'user' ? 'var(--brand)' : 'transparent',
                            color: activeTab === 'user' ? 'white' : 'var(--text-secondary)',
                            transition: 'all 0.2s'
                        }}
                    >
                        🍔 User
                    </button>
                    <button
                        type="button"
                        onClick={() => { setActiveTab('restaurant'); setError(null) }}
                        style={{
                            padding: '0.5rem', border: 'none', borderRadius: 'var(--radius-sm)',
                            fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                            background: activeTab === 'restaurant' ? 'var(--brand)' : 'transparent',
                            color: activeTab === 'restaurant' ? 'white' : 'var(--text-secondary)',
                            transition: 'all 0.2s'
                        }}
                    >
                        🏪 Partner
                    </button>
                    <button
                        type="button"
                        onClick={() => { setActiveTab('delivery'); setError(null); setOtpSent(false) }}
                        style={{
                            padding: '0.5rem', border: 'none', borderRadius: 'var(--radius-sm)',
                            fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                            background: activeTab === 'delivery' ? 'var(--brand)' : 'transparent',
                            color: activeTab === 'delivery' ? 'white' : 'var(--text-secondary)',
                            transition: 'all 0.2s'
                        }}
                    >
                        🛵 Delivery
                    </button>
                </div>

                {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

                {/* Restaurant login (Hardcoded simple ID/Pass) */}
                {activeTab === 'restaurant' ? (
                    <form onSubmit={handleRestaurantSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Restaurant ID</label>
                            <input
                                type="text"
                                placeholder="e.g. sizzle, dough, green, bites"
                                value={restaurantUser}
                                onChange={e => setRestaurantUser(e.target.value)}
                                className="form-input"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                placeholder="password123"
                                value={restaurantPass}
                                onChange={e => setRestaurantPass(e.target.value)}
                                className="form-input"
                                required
                            />
                        </div>
                        <button type="submit" disabled={loading} className="btn btn-primary btn-full" style={{ marginTop: '0.5rem' }}>
                            {loading ? 'Authenticating...' : 'Sign In as Restaurant'}
                        </button>

                        <div style={{ background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                            <strong style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>💡 Hardcoded credentials (Password: password123):</strong>
                            <ul style={{ paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                <li><code>sizzle</code> &rarr; Sizzle & Spice</li>
                                <li><code>dough</code> &rarr; The Dough Factory</li>
                                <li><code>green</code> &rarr; Green Garden Salad</li>
                                <li><code>bites</code> &rarr; Bites & Bowls</li>
                            </ul>
                        </div>
                    </form>
                ) : (
                    /* User / Delivery login (Firebase OAuth/OTP) */
                    <div>
                        <button onClick={handleGoogle} disabled={loading} className="btn btn-secondary btn-full" style={{ marginBottom: '1.5rem', background: 'white', color: '#1f2937', border: '1px solid #e5e7eb' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.186 4.114-3.52 0-6.37-2.857-6.37-6.37 0-3.514 2.85-6.371 6.37-6.371 1.629 0 3.102.618 4.227 1.629l3.1-3.1C19.16 2.38 15.93 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.898 0 10.748-4.258 10.748-11.24 0-.668-.078-1.285-.2-1.954H12.24z" /></svg>
                            Continue with Google
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>OR</span>
                            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        </div>

                        {!otpSent ? (
                            <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Phone Number</label>
                                    <input type="tel" placeholder="+16505550343" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="form-input" />
                                </div>
                                <button type="submit" disabled={loading || !phoneNumber} className="btn btn-primary btn-full">Send Code</button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Verification Code</label>
                                    <input type="text" placeholder="123456" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} className="form-input" />
                                </div>
                                <button type="submit" disabled={loading || !verificationCode} className="btn btn-primary btn-full">Verify & Sign In</button>
                                <button type="button" onClick={() => setOtpSent(false)} className="btn btn-ghost btn-full">Change Number</button>
                            </form>
                        )}
                        <div id="recaptcha-container" />
                    </div>
                )}
            </div>
        </div>
    )
}