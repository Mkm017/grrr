//D:\Grrr\apps\web\src\components\OnboardingGate.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useLocation } from '../providers/LocationProvider';
import { api } from '../lib/api';
import { UserMeResponse, CreateAddressRequest } from '@grrr/contracts';

interface OsmAddress {
    road?: string; pedestrian?: string; suburb?: string;
    house_number?: string; city?: string; town?: string;
    village?: string; county?: string; state?: string;
    postcode?: string; country_code?: string;
}

interface OsmSearchResult {
    address?: OsmAddress;
    display_name: string;
    lat: string;
    lon: string;
}

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
    const { firebaseUser, dbUser, refreshProfile } = useAuth();
    const { activeAddress, detectLocation, addSavedAddress, selectAddress, searchAddress, savedAddresses } = useLocation();

    const [name, setName] = useState('');
    const [step, setStep] = useState(1);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<OsmSearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedSearch, setSelectedSearch] = useState<OsmSearchResult | null>(null);

    const [formLine1, setFormLine1] = useState('');
    const [formCity, setFormCity] = useState('');
    const [formPostal, setFormPostal] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (dbUser) {
            setName(dbUser.name || firebaseUser?.displayName || '');
        }
    }, [dbUser, firebaseUser]);

    if (!firebaseUser || !dbUser) return <>{children}</>;

    const needsName = !dbUser.name;
    // Check if user has any real saved addresses (not temp- ones)
    const hasSavedAddress = savedAddresses.length > 0;
    const needsAddress = !hasSavedAddress;

    const currentStep = step === 1 && !needsName ? 2 : step;

    if (!needsName && !needsAddress) return <>{children}</>;

    const handleSaveName = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { setFormError('Please enter your name'); return; }
        setFormError(null);
        setLoading(true);
        try {
            await api.put<UserMeResponse>('/users/profile', { name: name.trim() });
            await refreshProfile();
            setStep(2);
        } catch (err) {
            console.error(err);
            setFormError(err instanceof Error ? err.message : 'Failed to save name');
        } finally {
            setLoading(false);
        }
    };

    const handleDetectLocation = async () => {
        setFormError(null);
        setLoading(true);
        try {
            await detectLocation();
        } catch (err) {
            console.error(err);
            setFormError('Could not detect location. Please search manually.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDetectedLocation = async () => {
        if (!activeAddress) return;
        setLoading(true);
        setFormError(null);
        try {
            const req: CreateAddressRequest = {
                title: 'Home',
                addressLine1: activeAddress.addressLine1 || 'My Location',
                addressLine2: activeAddress.addressLine2,
                city: activeAddress.city || 'Unknown',
                state: activeAddress.state,
                postalCode: activeAddress.postalCode || '000000',
                country: activeAddress.country || 'US',
                latitude: activeAddress.latitude,
                longitude: activeAddress.longitude,
                isDefault: true,
            };
            const saved = await addSavedAddress(req);
            // Update active address to the real DB record (not temp-)
            selectAddress(saved);
            await refreshProfile();
        } catch (err) {
            console.error(err);
            setFormError(err instanceof Error ? err.message : 'Failed to save address');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setSearchLoading(true);
        setFormError(null);
        try {
            const results = await searchAddress(searchQuery) as OsmSearchResult[];
            setSearchResults(results);
        } catch (err) {
            console.error(err);
            setFormError('Search failed');
        } finally {
            setSearchLoading(false);
        }
    };

    const handleSelectSearchItem = (item: OsmSearchResult) => {
        setSelectedSearch(item);
        setSearchResults([]);

        const addr = item.address || {};
        const road = addr.road || addr.pedestrian || addr.suburb || '';
        const houseNo = addr.house_number || '';
        const displayParts = item.display_name.split(',').map(p => p.trim());

        // 1. Line 1: prefer road/house_number, fallback to first segment of display name
        const line1Fallback = displayParts[0] || 'My Location';
        const line1Val = houseNo ? `${houseNo} ${road}` : road || line1Fallback;
        setFormLine1(line1Val);

        // 2. City: try city/town/village/county/state, fallback to first segment
        const cityVal = addr.city || addr.town || addr.village || addr.county || addr.state || displayParts[0] || 'Unknown City';
        setFormCity(cityVal);

        // 3. Postal Code: try postcode, fallback to extracting postal-like string, otherwise default to 000000
        let postalVal = addr.postcode || '';
        if (!postalVal) {
            for (const part of displayParts) {
                if (/^\d{5,6}$/.test(part) || /^[A-Z0-9]{3,4}\s?[A-Z0-9]{3,4}$/i.test(part)) {
                    postalVal = part;
                    break;
                }
            }
        }
        setFormPostal(postalVal || '000000');
    };

    const handleSaveManualAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formLine1 || !formCity || !formPostal) {
            setFormError('Fill address line, city, and postal code');
            return;
        }
        setLoading(true);
        setFormError(null);
        try {
            const lat = selectedSearch ? parseFloat(selectedSearch.lat) : null;
            const lon = selectedSearch ? parseFloat(selectedSearch.lon) : null;
            const req: CreateAddressRequest = {
                title: 'Home',
                addressLine1: formLine1,
                addressLine2: null,
                city: formCity,
                state: selectedSearch?.address?.state || null,
                postalCode: formPostal,
                country: selectedSearch?.address?.country_code?.toUpperCase() || 'US',
                latitude: lat,
                longitude: lon,
                isDefault: true,
            };
            const saved = await addSavedAddress(req);
            selectAddress(saved);
            await refreshProfile();
        } catch (err) {
            console.error(err);
            setFormError(err instanceof Error ? err.message : 'Failed to save address');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="overlay">
            <div className="modal animate-in">
                {currentStep === 1 ? (
                    <form onSubmit={handleSaveName} className="form">
                        <h2 className="modal-title">Welcome to Grrr! 🍔</h2>
                        <p className="modal-subtitle">What should we call you?</p>

                        {formError && <div className="alert alert-error">{formError}</div>}

                        <div className="input-group">
                            <label className="input-label">Your Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Mitanshu"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input"
                                required
                                disabled={loading}
                            />
                        </div>

                        <button type="submit" disabled={loading || !name.trim()} className="btn btn-primary btn-full">
                            {loading ? 'Saving…' : 'Continue →'}
                        </button>
                    </form>
                ) : (
                    <div className="form">
                        <h2 className="modal-title">Set Delivery Location 📍</h2>
                        <p className="modal-subtitle">Where should we deliver your food?</p>

                        {formError && <div className="alert alert-error">{formError}</div>}

                        {activeAddress && activeAddress.id.startsWith('temp-') ? (
                            <div className="detected-box">
                                <h4>📍 Detected Location</h4>
                                <p>{activeAddress.addressLine1}, {activeAddress.city}</p>
                                <button onClick={handleSaveDetectedLocation} disabled={loading} className="btn btn-primary btn-full">
                                    {loading ? 'Saving…' : 'Deliver Here'}
                                </button>
                                <button onClick={handleDetectLocation} className="btn btn-ghost btn-full" style={{ marginTop: '-0.5rem' }}>
                                    Retry Detection
                                </button>
                            </div>
                        ) : (
                            <button onClick={handleDetectLocation} disabled={loading} className="btn btn-primary btn-full">
                                {loading ? 'Detecting…' : '📍 Detect My Location'}
                            </button>
                        )}

                        <div className="divider-line">
                            <span className="divider-text">or search manually</span>
                        </div>

                        <form onSubmit={handleSearch} className="search-row">
                            <input
                                type="text"
                                placeholder="Search city, street, zip…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input"
                                style={{ flex: 1 }}
                                disabled={searchLoading}
                            />
                            <button type="submit" disabled={searchLoading || !searchQuery.trim()} className="btn btn-secondary">
                                {searchLoading ? '…' : 'Search'}
                            </button>
                        </form>

                        {searchResults.length > 0 && (
                            <div className="search-results">
                                {searchResults.map((item, idx) => (
                                    <div key={idx} onClick={() => handleSelectSearchItem(item)} className="search-result-item">
                                        {item.display_name}
                                    </div>
                                ))}
                            </div>
                        )}

                        {selectedSearch && (
                            <form onSubmit={handleSaveManualAddress} className="form" style={{ marginTop: '0.5rem' }}>
                                <div className="input-group">
                                    <label className="input-label">Address line 1</label>
                                    <input type="text" value={formLine1} onChange={(e) => setFormLine1(e.target.value)} className="input" required />
                                </div>
                                <div className="grid-2col">
                                    <div className="input-group">
                                        <label className="input-label">City</label>
                                        <input type="text" value={formCity} onChange={(e) => setFormCity(e.target.value)} className="input" required />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Postal Code</label>
                                        <input type="text" value={formPostal} onChange={(e) => setFormPostal(e.target.value)} className="input" required />
                                    </div>
                                </div>
                                <button type="submit" disabled={loading} className="btn btn-primary btn-full">
                                    {loading ? 'Saving…' : 'Save & Start Ordering'}
                                </button>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
