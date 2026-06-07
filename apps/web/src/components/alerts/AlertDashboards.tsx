import { CSSProperties, useMemo } from 'react';
import type { Alert, AlertStatus } from '../../types/domain';
import type { PolicyConfigLabels } from '../../services/policyConfig.service';
import { getLabel } from '../../services/policyConfig.service';

interface AlertDashboardsProps {
  alerts: Alert[];
  configLabels: PolicyConfigLabels | null;
  alertStatuses: string[];
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 'var(--space-md)',
    marginBottom: 'var(--space-lg)',
  },
  card: {
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-lg)',
    display: 'flex',
    flexDirection: 'column',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    marginBottom: 'var(--space-md)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  totalRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 'var(--space-sm)',
    marginBottom: 'var(--space-md)',
    paddingBottom: 'var(--space-md)',
    borderBottom: '1px solid var(--color-border)',
  },
  totalValue: {
    fontSize: 32,
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-mono)',
  },
  totalLabel: {
    fontSize: 13,
    color: 'var(--color-text-muted)',
  },
  statsGridThree: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 'var(--space-xs)',
  },
  statsGridNarrow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 'var(--space-xs)',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-xs) var(--space-sm)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-bg-tertiary)',
  },
  statLabel: {
    fontSize: 10,
    color: 'var(--color-text-secondary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
  },
  breakdownSection: {
    marginBottom: 'var(--space-md)',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    marginBottom: 'var(--space-xs)',
    textTransform: 'uppercase',
  },
  progressBarContainer: {
    position: 'relative',
    height: 24,
    backgroundColor: 'var(--color-bg-tertiary)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 'var(--space-xs)',
  },
  progressLabel: {
    fontSize: 13,
    color: 'var(--color-text-secondary)',
  },
  // Stacked bar for proportions
  stackedBar: {
    display: 'flex',
    height: 12,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 'var(--space-xs)',
  },
  stackedBarLabel: {
    fontSize: 11,
    color: 'var(--color-text-muted)',
    display: 'flex',
    justifyContent: 'space-between',
  },
};

// Status colors
const statusColors: Record<AlertStatus, string> = {
  OPEN: 'var(--color-open)',
  IN_PROGRESS: '#818cf8',
  REMEDIATION_IN_PROGRESS: '#fbbf24',
  REMEDIATED_WAITING_FOR_CUSTOMER: '#93c5fd',
  RESOLVED: 'var(--color-resolved)',
  REOPEN: '#fb923c',
};

// Remediation status colors
const remediationColors: Record<string, string> = {
  REMEDIATED: '#34d399',           // Green - successfully remediated
  NOT_REMEDIATED: '#9ca3af',       // Gray - not yet remediated
  NOT_SUPPORTED: '#6b7280',        // Dark gray - no remediation available
  FAILED: '#ef4444',               // Red - remediation failed (reopened)
  AUTO: '#34d399',                 // Green - auto remediated (matches Policy Status enabled)
  MANUAL: '#9ca3af',               // Gray - user remediated (matches Policy Status disabled)
  ACTIVE: '#60a5fa',               // Blue - active alerts
};

export function AlertDashboards({ alerts, configLabels, alertStatuses }: AlertDashboardsProps) {
  // Calculate status counts using config-provided statuses
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    alertStatuses.forEach((status) => {
      counts[status] = alerts.filter((a) => a.status === status).length;
    });
    return counts;
  }, [alerts, alertStatuses]);

  // Helper: Check if remediation is supported for an alert's policy
  const hasRemediationSupport = (alert: Alert): boolean => {
    const remType = alert.policySnapshot?.remediationType;
    return remType !== null && remType !== 'NO_REMEDIATION_AVAILABLE';
  };

  // Calculate remediation status breakdown for ACTIVE alerts only
  const remediationStatus = useMemo(() => {
    const total = alerts.length;
    
    // Active alerts = status != RESOLVED
    const activeAlerts = alerts.filter(a => a.status !== 'RESOLVED');
    const activeCount = activeAlerts.length;
    const resolvedCount = total - activeCount;
    
    // All breakdowns below are computed from ACTIVE alerts only:
    
    // 1. Not Supported - policy has no remediation configured
    const notSupported = activeAlerts.filter(a => !hasRemediationSupport(a)).length;
    
    // 2. Not Remediated - policy HAS remediation but wasRemediated = false
    const notRemediated = activeAlerts.filter(a => 
      hasRemediationSupport(a) && !a.wasRemediated
    ).length;
    
    // 3. Failed - wasRemediated = true AND status = REOPEN
    const failed = activeAlerts.filter(a => 
      a.wasRemediated && a.status === 'REOPEN'
    ).length;
    
    // 4. Remediated - wasRemediated = true (and still active, not failed/reopened)
    const remediated = activeAlerts.filter(a => 
      a.wasRemediated && a.status !== 'REOPEN'
    ).length;
    
    // Auto vs User remediated breakdown (from active remediated alerts)
    const remediatedActiveAlerts = activeAlerts.filter(a => a.wasRemediated);
    const autoRemediated = remediatedActiveAlerts.filter(a => a.remediationOrigin === 'AUTO').length;
    const userRemediated = remediatedActiveAlerts.filter(a => a.remediationOrigin === 'MANUAL').length;
    
    // Success rate = remediated / (active alerts - not supported)
    const remediationCapable = activeCount - notSupported;
    const successRate = remediationCapable > 0 
      ? Math.round((remediated / remediationCapable) * 100) 
      : 0;
    
    // Active vs Resolved percentage
    const activePercent = total > 0 ? Math.round((activeCount / total) * 100) : 0;
    
    return {
      total,
      activeCount,
      resolvedCount,
      activePercent,
      notSupported,
      notRemediated,
      failed,
      remediated,
      autoRemediated,
      userRemediated,
      successRate,
    };
  }, [alerts]);

  const total = alerts.length;
  
  // Group statuses into two rows
  const statusRow1 = ['OPEN', 'IN_PROGRESS', 'REMEDIATION_IN_PROGRESS'];
  const statusRow2 = ['REMEDIATED_WAITING_FOR_CUSTOMER', 'RESOLVED', 'REOPEN'];
  
  // Auto vs User proportion
  const totalRemediated = remediationStatus.autoRemediated + remediationStatus.userRemediated;
  const autoPercent = totalRemediated > 0 ? Math.round((remediationStatus.autoRemediated / totalRemediated) * 100) : 0;

  return (
    <div style={styles.container}>
      {/* Dashboard #1: Alert Status */}
      <section style={styles.card} aria-labelledby="status-dashboard-title">
        <h2 id="status-dashboard-title" style={styles.cardTitle}>Alert Status</h2>
        <div style={styles.totalRow}>
          <span style={styles.totalValue}>{total}</span>
          <span style={styles.totalLabel}>Total Alerts</span>
        </div>
        
        {/* Status breakdown - Row 1 */}
        <div style={styles.breakdownSection}>
          <div style={styles.sectionHeader}>Status Breakdown</div>
          <div style={{ ...styles.statsGridThree, marginBottom: 'var(--space-xs)' }}>
            {statusRow1.map((status) => (
              <div key={status} style={styles.statItem}>
                <span style={styles.statLabel}>{getLabel(configLabels?.alertStatuses, status)}</span>
                <span style={{ ...styles.statValue, color: statusColors[status as AlertStatus] || '#9ca3af' }}>
                  {statusCounts[status] || 0}
                </span>
              </div>
            ))}
          </div>
          {/* Status breakdown - Row 2 */}
          <div style={styles.statsGridThree}>
            {statusRow2.map((status) => (
              <div key={status} style={styles.statItem}>
                <span style={styles.statLabel}>{getLabel(configLabels?.alertStatuses, status)}</span>
                <span style={{ ...styles.statValue, color: statusColors[status as AlertStatus] || '#9ca3af' }}>
                  {statusCounts[status] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Active vs Resolved visual indicator */}
        <div>
          <div style={styles.sectionHeader}>Active vs Resolved</div>
          <div style={styles.stackedBar}>
            <div 
              style={{ 
                width: `${remediationStatus.activePercent}%`, 
                backgroundColor: remediationColors.ACTIVE,
                transition: 'width 0.3s ease',
              }} 
            />
            <div 
              style={{ 
                width: `${100 - remediationStatus.activePercent}%`, 
                backgroundColor: remediationColors.REMEDIATED,
                transition: 'width 0.3s ease',
              }} 
            />
          </div>
          <div style={styles.stackedBarLabel}>
            <span><span style={{ color: remediationColors.ACTIVE, fontWeight: 600 }}>{remediationStatus.activeCount}</span> Active</span>
            <span><span style={{ color: remediationColors.REMEDIATED, fontWeight: 600 }}>{remediationStatus.resolvedCount}</span> Resolved</span>
          </div>
        </div>
      </section>

      {/* Dashboard #2: Remediation Status */}
      <section style={styles.card} aria-labelledby="remediation-dashboard-title">
        <h2 id="remediation-dashboard-title" style={styles.cardTitle}>Remediation Status</h2>
        <div style={styles.totalRow}>
          <span style={styles.totalValue}>
            {remediationStatus.activeCount}
            <span style={{ color: 'var(--color-text-muted)', fontSize: 20, fontWeight: 500 }}>/{remediationStatus.total}</span>
          </span>
          <span style={styles.totalLabel}>Active Alerts</span>
        </div>
        
        {/* Alerts breakdown - 4 categories from active alerts */}
        <div style={styles.breakdownSection}>
          <div style={styles.sectionHeader}>Alerts Breakdown</div>
          <div style={styles.statsGridNarrow}>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>REMEDIATED</span>
              <span style={{ ...styles.statValue, color: remediationColors.REMEDIATED }}>
                {remediationStatus.remediated}
              </span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>FAILED</span>
              <span style={{ ...styles.statValue, color: remediationColors.FAILED }}>
                {remediationStatus.failed}
              </span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>NOT REMEDIATED</span>
              <span style={{ ...styles.statValue, color: remediationColors.NOT_REMEDIATED }}>
                {remediationStatus.notRemediated}
              </span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>NOT SUPPORTED</span>
              <span style={{ ...styles.statValue, color: remediationColors.NOT_SUPPORTED }}>
                {remediationStatus.notSupported}
              </span>
            </div>
          </div>
        </div>
        
        {/* Remediation Success Rate */}
        <div>
          <div style={styles.sectionHeader}>Remediation Success</div>
          <div style={{
            ...styles.progressBarContainer,
          } as CSSProperties}>
            <div 
              style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                backgroundColor: '#34d399',
                borderRadius: 4,
                transition: 'width 0.3s ease',
                width: `${remediationStatus.successRate}%`,
                minWidth: remediationStatus.successRate > 0 ? 32 : 0,
              }} 
            />
            <span style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 12,
              fontWeight: 600,
              color: 'white',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}>
              {remediationStatus.successRate}%
            </span>
          </div>
          <span style={styles.progressLabel}>
            {remediationStatus.activeCount > 0 
              ? `${remediationStatus.remediated} / ${remediationStatus.activeCount - remediationStatus.notSupported} remediable`
              : 'No active alerts'
            }
          </span>
        </div>
      </section>

      {/* Dashboard #3: Remediation Source */}
      <section style={styles.card} aria-labelledby="source-dashboard-title">
        <h2 id="source-dashboard-title" style={styles.cardTitle}>Remediation Source</h2>
        <div style={styles.totalRow}>
          <span style={styles.totalValue}>
            {totalRemediated}
            <span style={{ color: 'var(--color-text-muted)', fontSize: 20, fontWeight: 500 }}>/{remediationStatus.activeCount}</span>
          </span>
          <span style={styles.totalLabel}>Remediated (of Active Alerts)</span>
        </div>
        
        {/* Auto vs User breakdown */}
        <div style={styles.breakdownSection}>
          <div style={styles.sectionHeader}>Source Breakdown</div>
          <div style={styles.statsGridNarrow}>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>AUTO</span>
              <span style={{ ...styles.statValue, color: remediationColors.AUTO }}>
                {remediationStatus.autoRemediated}
              </span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>USER</span>
              <span style={{ ...styles.statValue, color: remediationColors.MANUAL }}>
                {remediationStatus.userRemediated}
              </span>
            </div>
          </div>
        </div>
        
        {/* Auto vs User visual indicator */}
        <div>
          <div style={styles.sectionHeader}>Auto vs User</div>
          <div style={styles.stackedBar}>
            <div 
              style={{ 
                width: `${autoPercent}%`, 
                backgroundColor: remediationColors.AUTO,
                transition: 'width 0.3s ease',
              }} 
            />
            <div 
              style={{ 
                width: `${100 - autoPercent}%`, 
                backgroundColor: remediationColors.MANUAL,
                transition: 'width 0.3s ease',
              }} 
            />
          </div>
          <div style={styles.stackedBarLabel}>
            <span><span style={{ color: remediationColors.AUTO, fontWeight: 600 }}>{autoPercent}%</span> Auto</span>
            <span><span style={{ color: remediationColors.MANUAL, fontWeight: 600 }}>{100 - autoPercent}%</span> User</span>
          </div>
        </div>
      </section>
    </div>
  );
}
