import { CSSProperties, ReactNode, useEffect } from 'react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
  testId?: string;
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 100,
    transition: 'opacity var(--transition-normal)',
  },
  drawer: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--color-bg-secondary)',
    borderLeft: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 101,
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform var(--transition-normal)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-lg)',
    borderBottom: '1px solid var(--color-border)',
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    margin: 0,
  },
  closeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-secondary)',
    transition: 'all var(--transition-fast)',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: 'var(--space-lg)',
  },
};

export function Drawer({ isOpen, onClose, title, children, width = '480px', testId }: DrawerProps) {
  // Handle escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <>
      <div
        style={styles.overlay}
        onClick={onClose}
        aria-label="Close drawer"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClose()}
      />
      <aside
        style={{
          ...styles.drawer,
          width,
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={testId}
      >
        <header style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          <button
            style={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M15 5L5 15M5 5L15 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>
        <div style={styles.content}>{children}</div>
      </aside>
    </>
  );
}

