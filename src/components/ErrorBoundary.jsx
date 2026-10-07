import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static isRecoverableDomCleanupError(error) {
    return (
      error?.name === 'NotFoundError' &&
      String(error?.message || '').includes('removeChild')
    );
  }

  static getDerivedStateFromError(error) {
    if (ErrorBoundary.isRecoverableDomCleanupError(error)) {
      return { hasError: false, error: null, errorInfo: null };
    }

    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (ErrorBoundary.isRecoverableDomCleanupError(error)) {
      console.warn("Erro recuperável ao limpar componente externo:", error);
      return;
    }

    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', backgroundColor: '#fee2e2', color: '#991b1b', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Something went wrong.</h1>
          <p style={{ fontWeight: 'bold', marginBottom: '1rem' }}>{this.state.error && this.state.error.toString()}</p>
          <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: 'rgba(255,255,255,0.5)', padding: '1rem', borderRadius: '0.5rem' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
        </div>
      );
    }

    return this.props.children; 
  }
}
