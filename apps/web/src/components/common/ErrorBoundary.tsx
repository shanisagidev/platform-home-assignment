import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    padding: '40px',
    textAlign: 'center' as const,
    backgroundColor: 'var(--color-bg-secondary)',
    borderRadius: '8px',
    margin: '20px',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginBottom: '12px',
  },
  message: {
    fontSize: '14px',
    color: 'var(--color-text-secondary)',
    marginBottom: '24px',
    maxWidth: '500px',
  },
  button: {
    padding: '12px 24px',
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  },
  errorDetails: {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: 'var(--color-bg-tertiary)',
    borderRadius: '6px',
    textAlign: 'left' as const,
    maxWidth: '600px',
    overflow: 'auto',
  },
  errorText: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: 'var(--color-critical)',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  toggleButton: {
    marginTop: '16px',
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
};

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={styles.container}>
          <div style={styles.icon}>⚠️</div>
          <h2 style={styles.title}>Something went wrong</h2>
          <p style={styles.message}>
            An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={styles.button} onClick={this.handleRetry}>
              Try Again
            </button>
            <button 
              style={{ ...styles.button, backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }} 
              onClick={this.handleReload}
            >
              Reload Page
            </button>
          </div>
          {this.state.error && (
            <details style={styles.errorDetails}>
              <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
                Error Details
              </summary>
              <pre style={styles.errorText}>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
