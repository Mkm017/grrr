//D:\Grrr\apps\web\src\components\ProfileEditor.tsx
import React, { useState, useEffect } from 'react'
import { useAuth } from '../providers/AuthProvider'
import { useLocation } from '../providers/LocationProvider'
import { api } from '../lib/api'
import { Link } from 'react-router-dom'

export default function ProfileEditor() {
    const { dbUser, refreshProfile } = useAuth()
    const { savedAddresses } = useLocation()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (dbUser) { setName(dbUser.name || ''); setEmail(dbUser.email || ''); setPhone(dbUser.phoneNumber || '') }
    }, [dbUser])

    if (!dbUser) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError(null); setSuccess(null); setLoading(true)
        try {
            await api.put('/users/profile', { name, email, phoneNumber: phone })
            await refreshProfile()
            setSuccess('Profile updated!')
        } catch (err: any) { setError(err.message) }
        setLoading(false)
    }

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div className="grid-2col">
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem', fontFamily: 'var(--font-display)' }}>Edit Profile</h3>
                    {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
                    {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group"><label className="form-label">Name</label><input value={name} onChange={e => setName(e.target.value)} className="form-input" required /></div>
                        <div className="form-group"><label className="form-label">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input" /></div>
                        <div className="form-group"><label className="form-label">Phone</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="form-input" /></div>
                        <button type="submit" disabled={loading} className="btn btn-primary btn-full">{loading ? 'Saving…' : 'Save Changes'}</button>
                    </form>
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem', fontFamily: 'var(--font-display)' }}>Account Info</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>ID</span><code>{dbUser.id.slice(0, 8)}…</code></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Member since</span><span>{new Date(dbUser.createdAt).toLocaleDateString()}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Saved Addresses</span><span>{savedAddresses.length}</span></div>
                    </div>
                    <Link to="/addresses" className="btn btn-secondary btn-full" style={{ marginTop: '2rem' }}>🗺️ Manage Addresses</Link>
                    <Link to="/insights" className="btn btn-primary btn-full" style={{ marginTop: '0.75rem' }}>📈 View Monthly Insights</Link>
                </div>
            </div>
        </div>
    )
}