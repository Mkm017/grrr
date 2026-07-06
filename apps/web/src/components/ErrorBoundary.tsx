//D:\Grrr\apps\web\src\components\ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null }
    static getDerivedStateFromError(error: Error) { return { hasError: true, error } }
    componentDidCatch(error: Error, info: ErrorInfo) { console.error('Error:', error, info) }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-body)', padding: '1rem' }}>
                    <div className="card" style={{ maxWidth: 440, textAlign: 'center' }}>
                        <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>⚠️</span>
                        <h2 style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>Something went wrong</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{this.state.error?.message || 'An unexpected error occurred'}</p>
                        <button onClick={() => window.location.reload()} className="btn btn-primary">Reload App</button>
                    </div>
                </div>
            )
        }
        return this.props.children
    }
}