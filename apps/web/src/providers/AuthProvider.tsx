//D:/Grrr/apps/web/src/providers/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { UserMeResponse } from '@grrr/contracts';
import { auth } from '../lib/firebase';
import { api } from '../lib/api';

interface AuthContextType {
    firebaseUser: User | null;
    dbUser: UserMeResponse | null;
    loading: boolean;
    error: string | null;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    loginAsRestaurant: (token: string, profile: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [dbUser, setDbUser] = useState<UserMeResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = async () => {
        try {
            const data = await api.get<UserMeResponse>('/users/me');
            setDbUser(data);
        } catch (err) {
            console.error('Failed to refresh profile:', err);
            setError(err instanceof Error ? err.message : 'Failed to refresh database profile');
        }
    };

    const loginAsRestaurant = (token: string, profile: any) => {
        localStorage.setItem('grrr_restaurant_token', token);
        localStorage.setItem('grrr_restaurant_profile', JSON.stringify(profile));
        setDbUser(profile);
        setFirebaseUser(null);
        setError(null);
    };

    useEffect(() => {
        const checkRestaurantSession = async () => {
            const token = localStorage.getItem('grrr_restaurant_token');
            const savedProfile = localStorage.getItem('grrr_restaurant_profile');
            if (token && savedProfile) {
                try {
                    setLoading(true);
                    const data = await api.get<UserMeResponse>('/users/me');
                    setDbUser(data);
                } catch (err) {
                    console.error('Failed to sync restaurant session:', err);
                    setDbUser(JSON.parse(savedProfile));
                } finally {
                    setLoading(false);
                }
                return true;
            }
            return false;
        };

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            const hasRestSession = await checkRestaurantSession();
            if (hasRestSession) return;

            setFirebaseUser(user);
            setError(null);

            if (user) {
                try {
                    setLoading(true);
                    // Fetch profile from Hono backend using our API client
                    const data = await api.get<UserMeResponse>('/users/me');
                    setDbUser(data);
                } catch (err) {
                    console.error('Failed to sync user with backend:', err);
                    setError(err instanceof Error ? err.message : 'Failed to sync session with backend');
                    setDbUser(null);
                } finally {
                    setLoading(false);
                }
            } else {
                setDbUser(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        try {
            localStorage.removeItem('grrr_restaurant_token');
            localStorage.removeItem('grrr_restaurant_profile');
            setDbUser(null);
            setFirebaseUser(null);
            await auth.signOut();
        } catch (err) {
            console.error('Sign out error:', err);
        }
    };

    return (
        <AuthContext.Provider value={{ firebaseUser, dbUser, loading, error, logout, refreshProfile: fetchProfile, loginAsRestaurant }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
