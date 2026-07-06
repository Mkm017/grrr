//D:\Grrr\apps\web\src\components\LocationModal.tsx
import React, { useState } from 'react'
import { useLocation } from '../providers/LocationProvider'
import { useAuth } from '../providers/AuthProvider'
import { CreateAddressRequest } from '@grrr/contracts'

interface LocationModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function LocationModal({ isOpen, onClose }: LocationModalProps) {
    const { firebaseUser, dbUser } = useAuth()
    const { savedAddresses, activeAddress, detectLocation, selectAddress, addSavedAddress, searchAddress } = useLocation()

    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [searchLoading, setSearchLoading] = useState(false)
    const [selectedSearch, setSelectedSearch] = useState<any>(null)
    const [formLine1, setFormLine1] = useState('')
    const [formCity, setFormCity] = useState('')
    const [formPostal, setFormPostal] = useState('')
    const [formError, setFormError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    if (!isOpen) return null

    const handleDetect = async () => {
        setLoading(true)
        try { 
            if (!navigator.geolocation) {
                throw new Error('Geolocation not supported');
            }
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const lat = pos.coords.latitude;
                    const lon = pos.coords.longitude;
                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=en`);
                        const data = await res.json();
                        if (data && data.address) {
                            setFormLine1(data.address.road || data.address.pedestrian || data.address.suburb || data.display_name.split(',')[0] || '');
                            setFormCity(data.address.city || data.address.town || data.address.village || data.address.county || '');
                            setFormPostal(data.address.postcode || '');
                        }
                    } catch (err) {
                        console.error('Reverse geocoding failed:', err);
                    }
                    
                    // We also call the context to let it know the coords
                    await detectLocation(); 
                },
                (err) => {
                    setFormError('Location access denied');
                }
            );
        } catch { 
            setFormError('Failed to detect') 
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        setSearchLoading(true)
        try { setSearchResults(await searchAddress(searchQuery) as any[]) } catch { setFormError('Search failed') }
        setSearchLoading(false)
    }

    const handleSelectSearch = (item: any) => {
        setSelectedSearch(item)
        setSearchResults([])
        const addr = item.address || {}
        setFormLine1(addr.road || addr.pedestrian || addr.suburb || '')
        setFormCity(addr.city || addr.town || addr.village || '')
        setFormPostal(addr.postcode || '')
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formLine1 || !formCity) { setFormError('Fill required fields'); return }
        setLoading(true)
        try {
            const req: CreateAddressRequest = {
                title: 'Home',
                addressLine1: formLine1,
                addressLine2: null,
                city: formCity,
                state: selectedSearch?.address?.state || null,
                postalCode: formPostal || '000000',
                country: selectedSearch?.address?.country_code?.toUpperCase() || 'US',
                latitude: selectedSearch ? parseFloat(selectedSearch.lat) : null,
                longitude: selectedSearch ? parseFloat(selectedSearch.lon) : null,
                isDefault: true,
            }
            if (firebaseUser && dbUser) {
                const saved = await addSavedAddress(req)
                selectAddress(saved)
            }
            onClose()
        } catch (err: any) { setFormError(err.message) }
        setLoading(false)
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">📍 Set Delivery Address</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    {formError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{formError}</div>}

                    <button onClick={handleDetect} disabled={loading} className="btn btn-primary btn-full" style={{ marginBottom: '1rem' }}>
                        {loading ? 'Detecting…' : '📍 Detect My Location'}
                    </button>

                    {firebaseUser && savedAddresses.length > 0 && (
                        <div style={{ marginBottom: '1rem' }}>
                            <p style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>Saved Addresses</p>
                            {savedAddresses.map(addr => (
                                <button key={addr.id} onClick={() => { selectAddress(addr); onClose() }} className="btn btn-secondary btn-full" style={{ justifyContent: 'flex-start', marginBottom: '0.5rem', textAlign: 'left' }}>
                                    <span>{addr.title || 'Address'}: {addr.addressLine1}, {addr.city}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <input type="text" placeholder="Search address..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="form-input" style={{ flex: 1 }} />
                        <button type="submit" disabled={searchLoading} className="btn btn-secondary">Search</button>
                    </form>

                    {searchResults.slice(0, 5).map((item, i) => (
                        <div key={i} onClick={() => handleSelectSearch(item)} style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>{item.display_name}</div>
                    ))}

                    {selectedSearch && (
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                            <div className="form-group"><label className="form-label">Address</label><input value={formLine1} onChange={e => setFormLine1(e.target.value)} className="form-input" required /></div>
                            <div className="grid-2col">
                                <div className="form-group"><label className="form-label">City</label><input value={formCity} onChange={e => setFormCity(e.target.value)} className="form-input" required /></div>
                                <div className="form-group"><label className="form-label">Postal Code</label><input value={formPostal} onChange={e => setFormPostal(e.target.value)} className="form-input" required /></div>
                            </div>
                            <button type="submit" disabled={loading} className="btn btn-primary btn-full">{loading ? 'Saving…' : 'Confirm Location'}</button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}