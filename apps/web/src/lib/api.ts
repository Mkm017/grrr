//D:\Grrr\apps\web\src\lib\api.ts
import { auth } from './firebase';
import { env } from '../env';

const BASE_URL = env.VITE_API_URL || 'http://localhost:3002';

async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const headers = new Headers(options.headers);

    // Automatically inject Firebase Bearer Token if logged in
    const restaurantToken = localStorage.getItem('grrr_restaurant_token');
    if (restaurantToken) {
        headers.set('Authorization', `Bearer ${restaurantToken}`);
    } else {
        const user = auth.currentUser;
        if (user) {
            try {
                const token = await user.getIdToken();
                headers.set('Authorization', `Bearer ${token}`);
            } catch (error) {
                console.error('Failed to get Firebase ID token:', error);
            }
        }
    }

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        let errorMsg = `Request failed with status ${response.status}`;
        try {
            const errorData = await response.json() as { error?: string };
            if (errorData?.error) {
                errorMsg = errorData.error;
            }
        } catch {
            // ignore
        }
        throw new Error(errorMsg);
    }

    if (response.status === 204) {
        return null as T;
    }

    return response.json() as Promise<T>;
}

export const api = {
    get: <T = unknown>(path: string, options?: RequestInit) => request<T>(path, { ...options, method: 'GET' }),
    post: <T = unknown>(path: string, body: unknown, options?: RequestInit) => request<T>(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
    put: <T = unknown>(path: string, body: unknown, options?: RequestInit) => request<T>(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
    patch: <T = unknown>(path: string, body?: unknown, options?: RequestInit) => request<T>(path, { ...options, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
    delete: <T = unknown>(path: string, options?: RequestInit) => request<T>(path, { ...options, method: 'DELETE' }),
};
