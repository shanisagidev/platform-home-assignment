import { CSSProperties, useEffect } from 'react';

export interface ToastData {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const styles: Record<string, CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: 'var(--space-lg)',
    right: 'var(--space-lg)',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-sm)',
    pointerEvents: 'none',
  },
  toast: {
    minWidth: 320,
    maxWidth: 420,
    padding: 'var(--space-md) var(--space-lg)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
    animation: 'slideIn 0.3s ease-out',
    pointerEvents: 'auto',
    opacity: 1,
  },
  success: {
    backgroundColor: '#1a202c',
    border: '2px solid #4299e1',
  },
  error: {
    backgroundColor: '#1a202c',
    border: '2px solid #fc8181',
  },
  info: {
    backgroundColor: '#1a202c',
    border: '2px solid #4299e1',
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    margin: 0,
  },
  successTitle: {
    color: 'var(--color-resolved)',
  },
  errorTitle: {
    color: 'var(--color-critical)',
  },
  infoTitle: {
    color: 'var(--color-low)',
  },
  message: {
    fontSize: 13,
    color: '#fff',
    margin: 0,
    lineHeight: 1.5,
  },
  closeButton: {
    position: 'absolute',
    top: 'var(--space-sm)',
    right: 'var(--space-sm)',
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
};

function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const typeStyle = toast.type === 'success' ? styles.success : toast.type === 'info' ? styles.info : styles.error;
  const titleStyle = toast.type === 'success' ? styles.successTitle : toast.type === 'info' ? styles.infoTitle : styles.errorTitle;

  return (
    <div
      style={{ ...styles.toast, ...typeStyle, position: 'relative' }}
      role="alert"
      aria-live="polite"
    >
      <button
        style={styles.closeButton}
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        ×
      </button>
      {toast.title && <p style={{ ...styles.title, ...titleStyle }}>{toast.title}</p>}
      <p style={styles.message}>{toast.message}</p>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div style={styles.container}>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}




