//D:Grrr\apps\web\src\providers\LocationProvider.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { api } from '../lib/api';
import { Address, CreateAddressRequest, AddressesResponse } from '@grrr/contracts';

export type Coords = {
    latitude: number;
    longitude: number;
};

type LocationContextType = {
    coords: Coords | null;
    addressName: string | null;
    loading: boolean;
    error: string | null;
    savedAddresses: Address[];
    defaultAddress: Address | null;
    activeAddress: Address | null;
    detectLocation: () => Promise<void>;
    selectAddress: (address: Address) => void;
    addSavedAddress: (req: CreateAddressRequest) => Promise<Address>;
    deleteSavedAddress: (id: string) => Promise<void>;
    setDefaultSavedAddress: (id: string) => Promise<void>;
    searchAddress: (query: string) => Promise<unknown[]>;
    reverseGeocode: (lat: number, lon: number) => Promise<string>;
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { dbUser } = useAuth();
    const [coords, setCoords] = useState<Coords | null>(null);
    const [addressName, setAddressName] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
    const [activeAddress, setActiveAddress] = useState<Address | null>(null);

    const defaultAddress = savedAddresses.find(a => a.isDefault) || savedAddresses[0] || null;

    // Load active address from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('grrr_active_address');
        if (saved) {
            try {
                setActiveAddress(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse active address from localStorage:', e);
            }
        }
    }, []);

    // Load saved addresses when database profile is synced
    useEffect(() => {
        if (dbUser) {
            fetchSavedAddresses();
        } else {
            setSavedAddresses([]);
        }
    }, [dbUser]);

    // Update activeAddress fallback if it is not explicitly selected but defaultAddress changes
    useEffect(() => {
        if (defaultAddress && !activeAddress) {
            setActiveAddress(defaultAddress);
        }
    }, [defaultAddress, activeAddress]);

    const fetchSavedAddresses = async () => {
        try {
            const res = await api.get<AddressesResponse>('/addresses');
            setSavedAddresses(res.addresses);
        } catch (err) {
            console.error('Failed to load saved addresses:', err);
        }
    };

    const selectAddress = (address: Address) => {
        setActiveAddress(address);
        localStorage.setItem('grrr_active_address', JSON.stringify(address));
    };

    const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=en`;
            const res = await fetch(url);
            const data = await res.json();
            return data.display_name || `Coordinate (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
        } catch (e) {
            console.error('Reverse geocoding error:', e);
            return `Coordinate (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
        }
    };

    const detectLocationByIp = async () => {
        try {
            setLoading(true);
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();
            if (data.latitude && data.longitude) {
                const ipCoords = { latitude: data.latitude, longitude: data.longitude };
                setCoords(ipCoords);
                const readable = `${data.city}, ${data.region}, ${data.country_name}`;
                setAddressName(readable);

                // Form a temporary address item for activeAddress fallback
                const tempAddress: Address = {
                    id: 'temp-ip-address',
                    userId: dbUser?.id || 'guest',
                    title: 'IP Location (Estimated)',
                    addressLine1: data.city || 'My Location',
                    addressLine2: data.region || null,
                    city: data.city || 'Estimated City',
                    state: data.region || null,
                    postalCode: data.postal || '000000',
                    country: data.country_name || 'US',
                    latitude: data.latitude,
                    longitude: data.longitude,
                    isDefault: false,
                    createdAt: new Date().toISOString(),
                };
                setActiveAddress(tempAddress);
            }
        } catch (ipErr) {
            console.error('IP Geolocation fallback failed:', ipErr);
            setError('Could not access current location. Please search manually.');
        } finally {
            setLoading(false);
        }
    };

    const detectLocation = async () => {
        setError(null);
        setLoading(true);
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by this browser.');
            await detectLocationByIp();
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const gpsCoords = { latitude: lat, longitude: lon };
                setCoords(gpsCoords);

                const readable = await reverseGeocode(lat, lon);
                setAddressName(readable);

                // Create a temporary address item for activeAddress
                const parts = readable.split(',');
                const line1 = parts[0] || 'My Location';
                const city = parts[2]?.trim() || parts[1]?.trim() || 'Detected City';
                const postalCode = parts[parts.length - 2]?.trim().replace(/\D/g, '') || '000000';

                const tempAddress: Address = {
                    id: 'temp-gps-address',
                    userId: dbUser?.id || 'guest',
                    title: 'GPS Position',
                    addressLine1: line1,
                    addressLine2: parts[1]?.trim() || null,
                    city: city,
                    state: parts[3]?.trim() || null,
                    postalCode: postalCode,
                    country: parts[parts.length - 1]?.trim() || 'US',
                    latitude: lat,
                    longitude: lon,
                    isDefault: false,
                    createdAt: new Date().toISOString(),
                };
                setActiveAddress(tempAddress);
                setLoading(false);
            },
            async (geoErr) => {
                console.warn('Browser geolocation denied/failed. Trying IP fallback...', geoErr);
                await detectLocationByIp();
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    };

    const searchAddress = async (query: string): Promise<unknown[]> => {
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&accept-language=en&addressdetails=1`;
            const res = await fetch(url);
            return await res.json();
        } catch (e) {
            console.error('Search location lookup failed:', e);
            return [];
        }
    };

    const addSavedAddress = async (req: CreateAddressRequest): Promise<Address> => {
        const added = await api.post<Address>('/addresses', req);
        await fetchSavedAddresses();
        return added;
    };

    const deleteSavedAddress = async (id: string): Promise<void> => {
        await api.delete(`/addresses/${id}`);
        if (activeAddress?.id === id) {
            setActiveAddress(null);
            localStorage.removeItem('grrr_active_address');
        }
        await fetchSavedAddresses();
    };

    const setDefaultSavedAddress = async (id: string): Promise<void> => {
        await api.patch<Address>(`/addresses/${id}/default`);
        await fetchSavedAddresses();
    };

    return (
        <LocationContext.Provider
            value={{
                coords,
                addressName,
                loading,
                error,
                savedAddresses,
                defaultAddress,
                activeAddress,
                detectLocation,
                selectAddress,
                addSavedAddress,
                deleteSavedAddress,
                setDefaultSavedAddress,
                searchAddress,
                reverseGeocode,
            }}
        >
            {children}
        </LocationContext.Provider>
    );
};

export const useLocation = () => {
    const context = useContext(LocationContext);
    if (!context) {
        throw new Error('useLocation must be used within a LocationProvider');
    }
    return context;
};
