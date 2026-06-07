import { CSSProperties, useState, useEffect } from 'react';
import { Modal } from './Modal';

interface ResetEnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const styles: Record<string, CSSProperties> = {
  content: {
    color: 'var(--color-text-secondary)',
    fontSize: 14,
    lineHeight: 1.7,
  },
  intro: {
    marginBottom: 'var(--space-md)',
  },
  list: {
    margin: 'var(--space-md) 0',
    paddingLeft: 0,
    listStyle: 'none',
  },
  listItem: {
    position: 'relative',
    paddingLeft: 'var(--space-lg)',
    marginBottom: 'var(--space-xs)',
  },
  bullet: {
    position: 'absolute',
    left: 8,
    color: 'var(--color-critical)',
  },
  restoreNote: {
    marginTop: 'var(--space-md)',
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
  },
  warning: {
    marginTop: 'var(--space-md)',
    padding: 'var(--space-sm) var(--space-md)',
    backgroundColor: 'var(--color-critical-bg)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-critical)',
    fontSize: 13,
    fontWeight: 500,
  },
  confirmSection: {
    marginTop: 'var(--space-lg)',
    paddingTop: 'var(--space-lg)',
    borderTop: '1px solid var(--color-border)',
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--color-text-primary)',
    marginBottom: 'var(--space-sm)',
  },
  input: {
    width: '100%',
    padding: 'var(--space-sm) var(--space-md)',
    backgroundColor: 'var(--color-bg-primary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-primary)',
    fontSize: 14,
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.05em',
  },
  button: {
    padding: 'var(--space-sm) var(--space-lg)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  cancelButton: {
    border: '1px solid var(--color-border)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
  },
  resetButton: {
    border: 'none',
    backgroundColor: 'var(--color-critical)',
    color: 'white',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};

export function ResetEnvironmentModal({
  isOpen,
  onClose,
  onConfirm,
}: ResetEnvironmentModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Reset input when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmText('');
      setIsResetting(false);
    }
  }, [isOpen]);

  const isConfirmed = confirmText === 'RESET';

  const handleConfirm = async () => {
    if (!isConfirmed || isResetting) return;
    
    setIsResetting(true);
    try {
      await onConfirm();
    } catch (err) {
      console.error('Reset failed:', err);
      setIsResetting(false);
    }
  };

  const handleClose = () => {
    if (isResetting) return;
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Reset environment to defaults"
      footer={
        <>
          <button
            style={{ ...styles.button, ...styles.cancelButton }}
            onClick={handleClose}
            disabled={isResetting}
          >
            Cancel
          </button>
          <button
            style={{
              ...styles.button,
              ...styles.resetButton,
              ...(!isConfirmed || isResetting ? styles.disabledButton : {}),
            }}
            onClick={handleConfirm}
            disabled={!isConfirmed || isResetting}
            aria-label="Reset environment"
          >
            {isResetting ? 'Resetting…' : 'Reset environment'}
          </button>
        </>
      }
    >
      <div style={styles.content}>
        <p style={styles.intro}>
          This will reset your DSPM environment to its initial state.
        </p>
        
        <p>The following data will be permanently removed:</p>
        <ul style={styles.list}>
          <li style={styles.listItem}>
            <span style={styles.bullet}>•</span>
            All security alerts
          </li>
          <li style={styles.listItem}>
            <span style={styles.bullet}>•</span>
            All scan activity
          </li>
          <li style={styles.listItem}>
            <span style={styles.bullet}>•</span>
            All custom policies
          </li>
          <li style={styles.listItem}>
            <span style={styles.bullet}>•</span>
            All alert activity (comments, assignments, remediation notes)
          </li>
        </ul>
        
        <p style={styles.restoreNote}>
          System default policies will be restored.
        </p>
        
        <div style={styles.warning}>
          This action cannot be undone.
        </div>
        
        <div style={styles.confirmSection}>
          <label htmlFor="reset-confirm-input" style={styles.label}>
            Type RESET to confirm
          </label>
          <input
            id="reset-confirm-input"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            style={styles.input}
            placeholder="RESET"
            disabled={isResetting}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </Modal>
  );
}




