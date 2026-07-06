//D:\Grrr\apps\web\src\main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AuthProvider } from './providers/AuthProvider'
import { LocationProvider } from './providers/LocationProvider'
import { ThemeProvider } from './providers/ThemeProvider'
import OnboardingGate from './components/OnboardingGate'
import { CartProvider } from './providers/CartProvider'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <ThemeProvider>
                <AuthProvider>
                    <LocationProvider>
                        <BrowserRouter>
                            <OnboardingGate>
                                <CartProvider>
                                    <App />
                                </CartProvider>
                            </OnboardingGate>
                        </BrowserRouter>
                    </LocationProvider>
                </AuthProvider>
            </ThemeProvider>
        </ErrorBoundary>
    </React.StrictMode>,
)