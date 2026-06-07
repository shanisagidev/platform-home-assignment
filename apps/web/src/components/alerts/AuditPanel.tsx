import { CSSProperties, useState, useEffect } from 'react';
import { alertsService } from '../../services/alerts.service';
import type { AlertAuditEvent } from '../../types/domain';
import { formatDateTime } from '../../utils/dateFormat';

interface AuditPanelProps {
  alertId: string;
  refreshTrigger?: number; // Increment to force refetch
  hideTitle?: boolean;
}

const styles: Record<string, CSSProperties> = {
  container: {
    marginTop: 'var(--space-lg)',
    borderTop: '1px solid var(--color-border)',
    paddingTop: 'var(--space-lg)',
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginBottom: 'var(--space-md)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-sm)',
    maxHeight: 250,
    overflowY: 'auto',
  },
  event: {
    padding: 'var(--space-sm) var(--space-md)',
    backgroundColor: 'var(--color-bg-tertiary)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 12,
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 11,
    color: 'var(--color-text-muted)',
  },
  actor: {
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    padding: '2px 6px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-bg-secondary)',
  },
  actorSystem: {
    backgroundColor: 'rgba(100, 181, 246, 0.15)',
    color: '#64b5f6',
  },
  field: {
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginRight: 4,
  },
  change: {
    color: 'var(--color-text-secondary)',
  },
  fromValue: {
    textDecoration: 'line-through',
    color: 'var(--color-text-muted)',
    marginRight: 4,
  },
  toValue: {
    color: 'var(--color-accent)',
    fontWeight: 500,
  },
  empty: {
    fontSize: 13,
    color: 'var(--color-text-muted)',
    textAlign: 'center',
    padding: 'var(--space-md)',
  },
  loading: {
    fontSize: 13,
    color: 'var(--color-text-muted)',
    textAlign: 'center',
    padding: 'var(--space-md)',
  },
};


function formatFieldName(field: string): string {
  switch (field) {
    case 'status': return 'Status';
    case 'severity': return 'Severity';
    case 'assignee': return 'Assignee';
    default: return field;
  }
}

function formatValue(value: string): string {
  return value.replace(/_/g, ' ');
}

export function AuditPanel({ alertId, refreshTrigger = 0, hideTitle = false }: AuditPanelProps) {
  const [events, setEvents] = useState<AlertAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    alertsService.getAuditEvents(alertId)
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [alertId, refreshTrigger]);

  if (loading) {
    return (
      <div style={hideTitle ? {} : styles.container}>
        {!hideTitle && <div style={styles.title}>Audit</div>}
        <div style={styles.loading}>Loading audit trail...</div>
      </div>
    );
  }

  return (
    <div style={hideTitle ? {} : styles.container}>
      {!hideTitle && <div style={styles.title}>Audit</div>}
      {events.length === 0 ? (
        <div style={styles.empty}>No audit events recorded</div>
      ) : (
        <div style={styles.list} role="log" aria-label="Alert audit log">
          {events.map((event) => (
            <div key={event.id} style={styles.event}>
              <div style={styles.eventHeader}>
                <span style={styles.timestamp}>{formatDateTime(event.createdAt)}</span>
                <span style={{
                  ...styles.actor,
                  ...(event.actorType === 'SYSTEM' ? styles.actorSystem : {}),
                }}>
                  {event.actorName}
                </span>
              </div>
              <div style={styles.change}>
                <span style={styles.field}>{formatFieldName(event.field)}:</span>
                <span style={styles.fromValue}>{formatValue(event.fromValue)}</span>
                →
                <span style={styles.toValue}> {formatValue(event.toValue)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

