//D:Grrr/apps/web/src/components/AddressManager.tsx
import React, { useState } from 'react'
import { useLocation } from '../providers/LocationProvider'

export default function AddressManager() {
    const { savedAddresses, activeAddress, detectLocation, selectAddress, addSavedAddress, deleteSavedAddress, setDefaultSavedAddress, searchAddress } = useLocation()
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [formLine1, setFormLine1] = useState('')
    const [formCity, setFormCity] = useState('')
    const [formPostal, setFormPostal] = useState('')
    const [formError, setFormError] = useState<string | null>(null)
    const [selectedSearch, setSelectedSearch] = useState<any>(null)

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try { setSearchResults(await searchAddress(searchQuery) as any[]) } catch { setFormError('Search failed') }
        setLoading(false)
    }

    const handleSelect = (item: any) => {
        setSelectedSearch(item); setSearchResults([])
        const a = item.address || {}
        setFormLine1(a.road || a.pedestrian || ''); setFormCity(a.city || a.town || ''); setFormPostal(a.postcode || '')
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formLine1 || !formCity) return setFormError('Required fields')
        setLoading(true)
        try {
            const saved = await addSavedAddress({
                title: 'Home', addressLine1: formLine1, addressLine2: null, city: formCity,
                state: selectedSearch?.address?.state || null, postalCode: formPostal || '000000',
                country: selectedSearch?.address?.country_code?.toUpperCase() || 'US',
                latitude: selectedSearch ? parseFloat(selectedSearch.lat) : null,
                longitude: selectedSearch ? parseFloat(selectedSearch.lon) : null, isDefault: false
            })
            selectAddress(saved)
            setSelectedSearch(null); setSearchQuery(''); setFormLine1(''); setFormCity(''); setFormPostal('')
        } catch (err: any) { setFormError(err.message) }
        setLoading(false)
    }

    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div className="grid-2col">
                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>📍 Active Address</h3>
                    {activeAddress ? (
                        <div style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                            <p style={{ fontWeight: 600 }}>{activeAddress.addressLine1}</p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{activeAddress.city}, {activeAddress.postalCode}</p>
                        </div>
                    ) : <p style={{ color: 'var(--text-muted)' }}>No address selected</p>}
                    <button onClick={detectLocation} disabled={loading} className="btn btn-primary btn-full">📍 Detect Location</button>
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>🏡 Saved Addresses</h3>
                    {savedAddresses.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No saved addresses</p>
                    ) : (
                        savedAddresses.map(addr => (
                            <div key={addr.id} style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <strong>{addr.title || 'Address'}</strong>
                                    <button onClick={() => deleteSavedAddress(addr.id)} style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>🗑️</button>
                                </div>
                                <p style={{ fontSize: '0.85rem' }}>{addr.addressLine1}, {addr.city}</p>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <button onClick={() => selectAddress(addr)} className="btn btn-primary" style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem' }}>Deliver Here</button>
                                    {!addr.isDefault && <button onClick={() => setDefaultSavedAddress(addr.id)} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem' }}>Set Default</button>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="card" style={{ marginTop: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>🔍 Add New Address</h3>
                {formError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{formError}</div>}
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search address..." className="form-input" style={{ flex: 1 }} />
                    <button type="submit" disabled={loading} className="btn btn-secondary">Search</button>
                </form>
                {searchResults.slice(0, 5).map((item, i) => (
                    <div key={i} onClick={() => handleSelect(item)} style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>{item.display_name}</div>
                ))}
                {selectedSearch && (
                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                        <div className="form-group"><label className="form-label">Address</label><input value={formLine1} onChange={e => setFormLine1(e.target.value)} className="form-input" required /></div>
                        <div className="grid-2col">
                            <div className="form-group"><label className="form-label">City</label><input value={formCity} onChange={e => setFormCity(e.target.value)} className="form-input" required /></div>
                            <div className="form-group"><label className="form-label">Postal Code</label><input value={formPostal} onChange={e => setFormPostal(e.target.value)} className="form-input" required /></div>
                        </div>
                        <button type="submit" disabled={loading} className="btn btn-primary btn-full">Save Address</button>
                    </form>
                )}
            </div>
        </div>
    )
}