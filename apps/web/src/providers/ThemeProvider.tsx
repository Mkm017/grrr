//D:/Grrr/apps/web/src/providers/ThemeProvider.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    resolved: 'light' | 'dark';
    setTheme: (t: Theme) => void;
    cycle: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>(() => {
        const saved = localStorage.getItem('grrr_theme') as Theme | null;
        return saved || 'system';
    });

    const resolved: 'light' | 'dark' = theme === 'system' ? getSystemTheme() : theme;

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', resolved);
        localStorage.setItem('grrr_theme', theme);
    }, [theme, resolved]);

    // Listen for system preference changes when in system mode
    useEffect(() => {
        if (theme !== 'system') return;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => {
            document.documentElement.setAttribute('data-theme', mq.matches ? 'dark' : 'light');
        };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [theme]);

    const setTheme = (t: Theme) => setThemeState(t);

    const cycle = () => {
        setThemeState(prev => {
            if (prev === 'dark') return 'light';
            if (prev === 'light') return 'system';
            return 'dark';
        });
    };

    return (
        <ThemeContext.Provider value={{ theme, resolved, setTheme, cycle }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
};
