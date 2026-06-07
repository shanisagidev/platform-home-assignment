import { CSSProperties } from 'react';

interface LoadingStateProps {
  message?: string;
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--space-2xl)',
    gap: 'var(--space-md)',
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid var(--color-border)',
    borderTopColor: 'var(--color-accent)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  message: {
    color: 'var(--color-text-secondary)',
    fontSize: 14,
  },
};

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div style={styles.container}>
      <style>
        {`@keyframes spin { to { transform: rotate(360deg); } }`}
      </style>
      <div style={styles.spinner} />
      <span style={styles.message}>{message}</span>
    </div>
  );
}

