import { CSSProperties, useState } from 'react';
import type { AlertRemediation } from '../../types/domain';
import { formatDateTime } from '../../utils/dateFormat';

interface RemediationPanelProps {
  remediation?: AlertRemediation;
  onRemediate: (note?: string) => Promise<void>;
  onAddNote?: (note: string) => Promise<void>;
  isRemediated: boolean;
}

const styles: Record<string, CSSProperties> = {
  container: {
    backgroundColor: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-md)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--space-md)',
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
  },
  row: {
    display: 'flex',
    gap: 'var(--space-lg)',
    marginBottom: 'var(--space-sm)',
  },
  label: {
    fontSize: 12,
    color: 'var(--color-text-muted)',
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    color: 'var(--color-text-primary)',
  },
  priorityBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  textArea: {
    width: '100%',
    minHeight: 80,
    padding: 'var(--space-sm)',
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-primary)',
    fontSize: 14,
    fontFamily: 'inherit',
    resize: 'vertical',
    marginBottom: 'var(--space-sm)',
  },
  button: {
    padding: 'var(--space-sm) var(--space-md)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    border: 'none',
  },
  remediateButton: {
    backgroundColor: 'var(--color-remediated)',
    color: 'white',
  },
  note: {
    marginTop: 'var(--space-md)',
    padding: 'var(--space-sm)',
    backgroundColor: 'var(--color-bg-secondary)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    fontStyle: 'italic',
  },
};

const priorityStyles: Record<string, CSSProperties> = {
  CRITICAL: { backgroundColor: 'var(--color-critical-bg)', color: 'var(--color-critical)' },
  HIGH: { backgroundColor: 'var(--color-high-bg)', color: 'var(--color-high)' },
  MEDIUM: { backgroundColor: 'var(--color-medium-bg)', color: 'var(--color-medium)' },
  LOW: { backgroundColor: 'var(--color-low-bg)', color: 'var(--color-low)' },
};

export function RemediationPanel({ remediation, onRemediate, isRemediated }: RemediationPanelProps) {
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  
  const handleRemediate = async () => {
    setIsLoading(true);
    try {
      // Don't pass note on initial remediate - notes are added AFTER remediate
      await onRemediate();
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveNote = async () => {
    if (!note.trim()) return;
    setIsSavingNote(true);
    try {
      await onRemediate(note);
      setNote('');
    } finally {
      setIsSavingNote(false);
    }
  };
  
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Remediation</span>
      </div>
      
      {/* Remediate button at top of section - only show if not yet remediated */}
      {!isRemediated && (
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <button
            style={{
              ...styles.button,
              ...styles.remediateButton,
              opacity: isLoading ? 0.7 : 1,
              width: '100%',
            }}
            onClick={handleRemediate}
            disabled={isLoading}
            aria-label="Remediate alert"
          >
            {isLoading ? 'Processing...' : 'Remediate'}
          </button>
        </div>
      )}
      
      {remediation && (
        <>
          <div style={styles.row}>
            <div>
              <div style={styles.label}>Type</div>
              <div style={styles.value}>{remediation.type}</div>
            </div>
            <div>
              <div style={styles.label}>Priority</div>
              <span style={{ ...styles.priorityBadge, ...priorityStyles[remediation.priority] }}>
                {remediation.priority}
              </span>
            </div>
          </div>
          
          {remediation.dueDate && (
            <div style={{ marginBottom: 'var(--space-sm)' }}>
              <div style={styles.label}>Due Date</div>
              <div style={styles.value}>
                {formatDateTime(remediation.dueDate)}
              </div>
            </div>
          )}
          
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <div style={styles.label}>Auto-Remediate</div>
            <div style={styles.value}>{remediation.autoRemediate ? 'Yes' : 'No'}</div>
          </div>
        </>
      )}
      
      {remediation?.note && (
        <div style={styles.note}>
          <strong>Note:</strong> {remediation.note}
        </div>
      )}
      
      {/* Notes section - only enabled AFTER remediate is clicked */}
      <div style={{ marginTop: 'var(--space-md)' }}>
        <div style={styles.label}>Remediation Notes</div>
        {isRemediated ? (
          <>
            <textarea
              style={styles.textArea}
              placeholder="Add remediation notes..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              aria-label="Remediation notes"
            />
            <button
              style={{
                ...styles.button,
                backgroundColor: 'var(--color-accent)',
                color: 'white',
                opacity: isSavingNote || !note.trim() ? 0.7 : 1,
              }}
              onClick={handleSaveNote}
              disabled={isSavingNote || !note.trim()}
              aria-label="Save remediation note"
            >
              {isSavingNote ? 'Saving...' : 'Save Note'}
            </button>
          </>
        ) : (
          <div style={{ 
            padding: 'var(--space-sm)', 
            color: 'var(--color-text-muted)',
            fontSize: 13,
            fontStyle: 'italic',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-sm)',
          }}>
            Remediate to add notes
          </div>
        )}
      </div>
    </div>
  );
}

