import { CSSProperties } from 'react';
import type { Alert, AlertStatus } from '../../types/domain';
import type { PolicyConfigLabels } from '../../services/policyConfig.service';
import { getLabel, getDatastoreLabel } from '../../services/policyConfig.service';
import { formatDateTime } from '../../utils/dateFormat';
import { getAlertDisplayName } from '../../utils/alertDisplayName';

interface AlertsTableProps {
  alerts: Alert[];
  onAlertClick: (alert: Alert) => void;
  configLabels: PolicyConfigLabels | null;
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
  alertPolicy: {
    fontWeight: 500,
    color: 'var(--color-text-primary)',
    marginBottom: 4,
  },
  alertAsset: {
    fontSize: 13,
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  timestamp: {
    fontSize: 13,
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  empty: {
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
  },
};

const severityStyles: Record<string, CSSProperties> = {
  CRITICAL: { backgroundColor: 'var(--color-critical-bg)', color: 'var(--color-critical)' },
  HIGH: { backgroundColor: 'var(--color-high-bg)', color: 'var(--color-high)' },
  MEDIUM: { backgroundColor: 'var(--color-medium-bg)', color: 'var(--color-medium)' },
  LOW: { backgroundColor: 'var(--color-low-bg)', color: 'var(--color-low)' },
};

const statusStyles: Record<AlertStatus, CSSProperties> = {
  OPEN: { backgroundColor: 'rgba(240, 136, 62, 0.15)', color: 'var(--color-open)' },
  IN_PROGRESS: { backgroundColor: 'rgba(129, 140, 248, 0.15)', color: '#818cf8' },
  REMEDIATION_IN_PROGRESS: { backgroundColor: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' },
  REMEDIATED_WAITING_FOR_CUSTOMER: { backgroundColor: 'rgba(147, 197, 253, 0.15)', color: '#93c5fd' },
  RESOLVED: { backgroundColor: 'rgba(57, 217, 138, 0.15)', color: 'var(--color-resolved)' },
  REOPEN: { backgroundColor: 'rgba(251, 146, 60, 0.15)', color: '#fb923c' },
};

// Format timestamp in 24-hour format (no AM/PM)
function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return formatDateTime(dateStr);
}

export function AlertsTable({ alerts, onAlertClick, configLabels }: AlertsTableProps) {
  // Helper to get UI-friendly asset type label
  const getAssetTypeLabel = (alert: Alert): string => {
    if (alert.assetCategory === 'CLOUD' && alert.dataStoreType) {
      return getDatastoreLabel(configLabels?.cloudDatastores, alert.cloudProvider, alert.dataStoreType);
    }
    if (alert.assetCategory === 'SAAS' && alert.saasTool) {
      return getLabel(configLabels?.saasTools, alert.saasTool);
    }
    return alert.asset?.type || 'Unknown';
  };

  if (alerts.length === 0) {
    return <div style={styles.empty}>No alerts found</div>;
  }
  
  return (
    <table style={styles.table} aria-label="Alerts list">
      <thead>
        <tr>
          <th style={styles.th}>Alert</th>
          <th style={{ ...styles.th, width: 100 }}>Severity</th>
          <th style={{ ...styles.th, width: 120 }}>Violation</th>
          <th style={{ ...styles.th, width: 120 }}>Status</th>
          <th style={{ ...styles.th, width: 100 }}>Auto Remediate</th>
          <th style={{ ...styles.th, width: 100 }}>Assignee</th>
          <th style={{ ...styles.th, width: 120 }}>Created</th>
        </tr>
      </thead>
      <tbody>
        {alerts.map((alert) => (
          <tr
            key={alert.id}
            style={styles.row}
            onClick={() => onAlertClick(alert)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '';
            }}
          >
            <td style={styles.td}>
              <div style={styles.alertPolicy}>{getAlertDisplayName(alert, configLabels)}</div>
              <div style={styles.alertAsset}>
                {getAssetTypeLabel(alert)}
              </div>
            </td>
            <td style={styles.td}>
              <span style={{ ...styles.badge, ...severityStyles[alert.severity] }}>
                {alert.severity}
              </span>
            </td>
            <td style={styles.td}>
              {alert.violationType ? (
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  {getLabel(configLabels?.violationTypes, alert.violationType)}
                </span>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>—</span>
              )}
            </td>
            <td style={styles.td}>
              <span style={{ ...styles.badge, ...(statusStyles[alert.status] || {}) }}>
                {getLabel(configLabels?.alertStatuses, alert.status)}
              </span>
            </td>
            <td style={styles.td}>
              <span style={{ 
                ...styles.badge, 
                backgroundColor: alert.policySnapshot?.autoRemediate ? 'rgba(57, 217, 138, 0.15)' : 'var(--color-bg-tertiary)',
                color: alert.policySnapshot?.autoRemediate ? 'var(--color-resolved)' : 'var(--color-text-muted)',
              }}>
                {alert.policySnapshot?.autoRemediate ? 'ON' : 'OFF'}
              </span>
            </td>
            <td style={styles.td}>
              <span style={{ fontSize: 13, color: alert.assignedTo ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                {alert.assignedTo?.name || 'Unassigned'}
              </span>
            </td>
            <td style={styles.td}>
              <span style={styles.timestamp}>{formatDate(alert.createdAt)}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
