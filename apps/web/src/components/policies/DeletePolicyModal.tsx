import { CSSProperties, useState } from 'react';
import { Modal } from '../common/Modal';
import type { Policy } from '../../types/domain';

interface DeletePolicyModalProps {
  policy: Policy | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const styles: Record<string, CSSProperties> = {
  content: {
    color: 'var(--color-text-secondary)',
    fontSize: 14,
    lineHeight: 1.6,
  },
  policyName: {
    fontWeight: 600,
    color: 'var(--color-text-primary)',
  },
  warning: {
    marginTop: 'var(--space-md)',
    padding: 'var(--space-sm) var(--space-md)',
    backgroundColor: 'var(--color-critical-bg)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-critical)',
    fontSize: 13,
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
  deleteButton: {
    border: 'none',
    backgroundColor: 'var(--color-critical)',
    color: 'white',
  },
};

export function DeletePolicyModal({
  policy,
  isOpen,
  onClose,
  onConfirm,
}: DeletePolicyModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  
  if (!policy) return null;
  
  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Failed to delete policy:', err);
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Policy"
      footer={
        <>
          <button
            style={{ ...styles.button, ...styles.cancelButton }}
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            style={{
              ...styles.button,
              ...styles.deleteButton,
              opacity: isDeleting ? 0.7 : 1,
            }}
            onClick={handleConfirm}
            disabled={isDeleting}
            aria-label="Confirm delete"
          >
            {isDeleting ? 'Deleting...' : 'Delete Policy'}
          </button>
        </>
      }
    >
      <div style={styles.content}>
        <p>
          Are you sure you want to delete the policy{' '}
          <span style={styles.policyName}>"{policy.name}"</span>?
        </p>
        <div style={styles.warning}>
          This action cannot be undone.
        </div>
      </div>
    </Modal>
  );
}

