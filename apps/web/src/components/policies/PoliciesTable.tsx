import { CSSProperties } from 'react';
import type { Policy } from '../../types/domain';
import { formatDateTime } from '../../utils/dateFormat';

interface PoliciesTableProps {
  policies: Policy[];
  onPolicyClick: (policy: Policy) => void;
  onToggle: (id: string, enabled: boolean) => Promise<void>;
}

const styles: Record<string, CSSProperties> = {
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: 'var(--space-md)',
    borderBottom: '1px solid var(--color-border)',
    color: 'var(--color-text-secondary)',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  td: {
    padding: 'var(--space-md)',
    borderBottom: '1px solid var(--color-border)',
    verticalAlign: 'middle',
  },
  row: {
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast)',
  },
  policyName: {
    fontWeight: 500,
    color: 'var(--color-text-primary)',
    marginBottom: 4,
  },
  policyDescription: {
    fontSize: 13,
    color: 'var(--color-text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 300,
  },
  severityBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 11,
    fontWeight: 500,
  },
  statusEnabled: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    color: '#34d399',
  },
  statusDisabled: {
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
    color: '#9ca3af',
  },
  // TYPE colors: Pre-configured = green (like Enabled), Custom = gray (like Disabled)
  typePreConfigured: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    color: '#34d399',
  },
  typeCustom: {
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
    color: '#9ca3af',
  },
  timestamp: {
    fontSize: 12,
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  remediationYes: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    color: '#34d399',
  },
  remediationNo: {
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
    color: '#9ca3af',
  },
  empty: {
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
  },
};

const severityStyles: Record<string, CSSProperties> = {
  CRITICAL: {
    backgroundColor: 'var(--color-critical-bg)',
    color: 'var(--color-critical)',
  },
  HIGH: {
    backgroundColor: 'var(--color-high-bg)',
    color: 'var(--color-high)',
  },
  MEDIUM: {
    backgroundColor: 'var(--color-medium-bg)',
    color: 'var(--color-medium)',
  },
  LOW: {
    backgroundColor: 'var(--color-low-bg)',
    color: 'var(--color-low)',
  },
};

// Helper: Format timestamp in 24-hour format
const formatTimestamp = (isoString?: string): string => {
  if (!isoString) return '—';
  return formatDateTime(isoString);
};

// Helper: Check if policy has remediation configured
const hasRemediationConfigured = (policy: Policy): boolean => {
  const remediation = policy.definition?.remediation;
  if (!remediation) return false;
  if (typeof remediation === 'string') {
    try {
      const parsed = JSON.parse(remediation);
      return parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0;
    } catch {
      return false;
    }
  }
  return typeof remediation === 'object' && Object.keys(remediation).length > 0;
};

export function PoliciesTable({ policies, onPolicyClick, onToggle }: PoliciesTableProps) {
  if (policies.length === 0) {
    return <div style={styles.empty}>No policies found</div>;
  }
  
  return (
    <table style={styles.table} data-testid="policies-table">
      <thead>
        <tr>
          <th style={styles.th}>Policy</th>
          <th style={{ ...styles.th, width: 100 }}>Severity</th>
          <th style={{ ...styles.th, width: 100 }}>Status</th>
          <th style={{ ...styles.th, width: 120 }}>Type</th>
          <th style={{ ...styles.th, width: 100 }}>Remediation</th>
          <th style={{ ...styles.th, width: 140 }}>Created</th>
        </tr>
      </thead>
      <tbody>
        {policies.map((policy) => {
          const hasRemediation = hasRemediationConfigured(policy);
          
          return (
            <tr
              key={policy.id}
              style={styles.row}
              onClick={() => onPolicyClick(policy)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '';
              }}
            >
              <td style={styles.td}>
                <div style={styles.policyName}>{policy.name}</div>
                <div style={styles.policyDescription}>{policy.description}</div>
              </td>
              <td style={styles.td}>
                <span style={{ ...styles.severityBadge, ...severityStyles[policy.severity] }}>
                  {policy.severity}
                </span>
              </td>
              <td style={styles.td}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(policy.id, !policy.enabled);
                  }}
                  style={{
                    ...styles.badge,
                    ...(policy.enabled ? styles.statusEnabled : styles.statusDisabled),
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'opacity 0.15s ease',
                  }}
                  aria-label={policy.enabled ? 'Click to disable policy' : 'Click to enable policy'}
                  title={policy.enabled ? 'Click to disable' : 'Click to enable'}
                >
                  {policy.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </td>
              <td style={styles.td}>
                <span
                  style={{
                    ...styles.badge,
                    ...(policy.isSystemPolicy ? styles.typePreConfigured : styles.typeCustom),
                  }}
                >
                  {policy.isSystemPolicy ? 'Pre-configured' : 'Custom'}
                </span>
              </td>
              <td style={styles.td}>
                <span
                  style={{
                    ...styles.badge,
                    ...(hasRemediation ? styles.remediationYes : styles.remediationNo),
                  }}
                >
                  {hasRemediation ? 'Yes' : 'No'}
                </span>
              </td>
              <td style={styles.td}>
                <span style={styles.timestamp}>
                  {formatTimestamp(policy.createdAt || policy.updatedAt)}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
