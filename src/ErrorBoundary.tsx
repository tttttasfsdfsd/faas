import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('React Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          background: '#0f172a', color: '#f1f5f9', 
          padding: '2rem', minHeight: '100vh',
          fontFamily: 'sans-serif'
        }}>
          <h1 style={{ color: '#ef4444' }}>⚠️ خطأ في التطبيق</h1>
          <pre style={{ 
            background: '#1e293b', padding: '1rem', 
            borderRadius: '8px', overflow: 'auto',
            color: '#fbbf24', fontSize: '12px'
          }}>
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
