import { CSSProperties, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { ResetEnvironmentModal } from '../common/ResetEnvironmentModal';
import { adminService } from '../../services/admin.service';

const styles: Record<string, CSSProperties> = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    padding: '0 var(--space-lg)',
    backgroundColor: 'var(--color-bg-secondary)',
    borderBottom: '1px solid var(--color-border)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
  },
  logoIcon: {
    width: 28,
    height: 28,
    backgroundColor: 'var(--color-accent)',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-bg-primary)',
    fontWeight: 700,
    fontSize: 14,
  },
  logoText: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    letterSpacing: '-0.02em',
  },
  logoSubtext: {
    fontSize: 12,
    color: 'var(--color-text-muted)',
    marginLeft: 'var(--space-sm)',
    fontFamily: 'var(--font-mono)',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-lg)',
  },
  userIdentity: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    padding: 'var(--space-xs) var(--space-sm)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-bg-tertiary)',
  },
  userIcon: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    backgroundColor: 'var(--color-accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-bg-primary)',
    fontSize: 12,
    fontWeight: 600,
  },
  userName: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--color-text-primary)',
  },
  buttonGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
  },
  button: {
    padding: 'var(--space-sm) var(--space-md)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
  },
  resetButton: {
    padding: 'var(--space-sm) var(--space-md)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
  },
  logoutButton: {
    padding: 'var(--space-sm) var(--space-md)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
  },
};

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleResetConfirm = async () => {
    try {
      await adminService.resetEnvironment();
      setIsResetModalOpen(false);
      showToast({
        type: 'success',
        title: 'Environment reset completed',
        message: 'Your workspace has been restored to its default state.',
      });
      // Navigate to policies page and trigger refresh
      navigate('/policies');
      // Force a page reload to refresh all data
      window.location.reload();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Reset failed',
        message: 'Please try again or refresh the page.',
      });
      throw err; // Re-throw to keep modal open and show error state
    }
  };
  
  return (
    <>
      <header style={styles.header}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>D</div>
          <span style={styles.logoText}>DSPM Portal</span>
          <span style={styles.logoSubtext}>v1.0.0</span>
        </div>
        
        <div style={styles.userSection}>
          {/* User identity with icon - clearly shows logged-in user */}
          <div style={styles.userIdentity} title="Logged in user">
            <div style={styles.userIcon}>
              {/* User icon SVG */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span style={styles.userName}>{user?.displayName}</span>
          </div>
          
          {/* Button group - Reset data and Sign out as equal buttons */}
          <div style={styles.buttonGroup}>
            <button
              style={styles.resetButton}
              onClick={() => setIsResetModalOpen(true)}
              aria-label="Reset environment"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-critical)';
                e.currentTarget.style.color = 'var(--color-critical)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              Reset data
            </button>
            <button
              style={styles.logoutButton}
              onClick={handleLogout}
              aria-label="Sign out"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-light)';
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <ResetEnvironmentModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleResetConfirm}
      />
    </>
  );
}

