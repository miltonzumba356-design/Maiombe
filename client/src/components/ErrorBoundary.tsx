import { Component, ReactNode } from 'react';

interface State { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: 32 }}>
          <div style={{
            background: 'rgba(212,51,82,.1)', border: '1px solid rgba(212,51,82,.3)',
            borderRadius: 12, padding: 24,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#D43352', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Erro no módulo
            </div>
            <div style={{ fontSize: 10.5, color: '#E5EBF2', marginBottom: 12 }}>
              {this.state.error?.message || 'Erro desconhecido'}
            </div>
            <button
              className="btn btn-outline"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
