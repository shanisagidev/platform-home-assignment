import { CSSProperties, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const styles: Record<string, CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--space-lg)',
    backgroundColor: 'var(--color-bg-primary)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-xl)',
    boxShadow: 'var(--shadow-lg)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-sm)',
    marginBottom: 'var(--space-xl)',
  },
  logoIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'var(--color-accent)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-bg-primary)',
    fontWeight: 700,
    fontSize: 18,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    letterSpacing: '-0.02em',
  },
  title: {
    fontSize: 18,
    fontWeight: 500,
    color: 'var(--color-text-primary)',
    textAlign: 'center',
    marginBottom: 'var(--space-lg)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
  },
  label: {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
  },
  input: {
    padding: 'var(--space-sm) var(--space-md)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-tertiary)',
    color: 'var(--color-text-primary)',
    fontSize: 14,
    transition: 'border-color var(--transition-fast)',
  },
  button: {
    marginTop: 'var(--space-sm)',
    padding: 'var(--space-md)',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-bg-primary)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  error: {
    padding: 'var(--space-sm) var(--space-md)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-critical-bg)',
    color: 'var(--color-critical)',
    fontSize: 14,
    textAlign: 'center',
  },
};

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Redirect if already logged in
  if (isAuthenticated) {
    navigate('/policies', { replace: true });
    return null;
  }
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      await login(username, password);
      navigate('/policies', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div style={styles.container} data-testid="login-page">
      <div style={styles.card}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>D</div>
          <span style={styles.logoText}>DSPM Portal</span>
        </div>
        
        <h1 style={styles.title}>Sign in to your account</h1>
        
        <form style={styles.form} onSubmit={handleSubmit}>
          {error && <div style={styles.error} role="alert">{error}</div>}
          
          <div style={styles.field}>
            <label htmlFor="username" style={styles.label}>
              Email Address
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              placeholder="Enter your email"
              autoComplete="username"
              autoFocus
              required
            />
          </div>
          
          <div style={styles.field}>
            <label htmlFor="password" style={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              autoComplete="current-password"
              required
            />
          </div>
          
          <button
            type="submit"
            style={{
              ...styles.button,
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

