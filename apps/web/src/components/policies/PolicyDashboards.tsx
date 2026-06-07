import { CSSProperties, useMemo } from 'react';
import type { Policy } from '../../types/domain';

interface PolicyDashboardsProps {
  policies: Policy[];
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 'var(--space-sm)',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-sm)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-bg-tertiary)',
  },
  statLabel: {
    fontSize: 12,
    color: 'var(--color-text-secondary)',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
  },
  // Progress bar styles
  progressContainer: {
    marginTop: 'var(--space-sm)',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'var(--color-bg-tertiary)',
    borderRadius: 3,
    overflow: 'hidden',
    display: 'flex',
  },
  progressSegment: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
};

// Color definitions
const colors = {
  enabled: '#34d399',
  disabled: '#9ca3af',
  critical: 'var(--color-critical)',
  high: 'var(--color-high)',
  medium: 'var(--color-medium)',
  low: 'var(--color-low)',
  preDefined: '#34d399', // Same as enabled (green)
  custom: '#9ca3af',     // Same as disabled (gray)
};

export function PolicyDashboards({ policies }: PolicyDashboardsProps) {
  // Calculate stats based on filtered policies
  const stats = useMemo(() => {
    const total = policies.length;
    const enabled = policies.filter((p) => p.enabled).length;
    const disabled = total - enabled;
    
    const critical = policies.filter((p) => p.severity === 'CRITICAL').length;
    const high = policies.filter((p) => p.severity === 'HIGH').length;
    const medium = policies.filter((p) => p.severity === 'MEDIUM').length;
    const low = policies.filter((p) => p.severity === 'LOW').length;
    
    const preDefined = policies.filter((p) => p.isSystemPolicy).length;
    const custom = total - preDefined;
    
    return {
      total,
      enabled,
      disabled,
      critical,
      high,
      medium,
      low,
      preDefined,
      custom,
    };
  }, [policies]);

  const getPercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return (value / total) * 100;
  };

  return (
    <div style={styles.container}>
      {/* Dashboard #1: Policy Status */}
      <section style={styles.card} aria-labelledby="status-dashboard-title">
        <h2 id="status-dashboard-title" style={styles.cardTitle}>Policy Status</h2>
        <div style={styles.totalRow}>
          <span style={styles.totalValue}>{stats.total}</span>
          <span style={styles.totalLabel}>Total Policies</span>
        </div>
        <div style={styles.statsGrid}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Enabled</span>
            <span style={{ ...styles.statValue, color: colors.enabled }}>{stats.enabled}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Disabled</span>
            <span style={{ ...styles.statValue, color: colors.disabled }}>{stats.disabled}</span>
          </div>
        </div>
        {/* Progress bar visualization */}
        <div style={styles.progressContainer}>
          <div style={styles.progressBar} role="img" aria-label={`${stats.enabled} enabled, ${stats.disabled} disabled`}>
            <div
              style={{
                ...styles.progressSegment,
                width: `${getPercentage(stats.enabled, stats.total)}%`,
                backgroundColor: colors.enabled,
              }}
            />
            <div
              style={{
                ...styles.progressSegment,
                width: `${getPercentage(stats.disabled, stats.total)}%`,
                backgroundColor: colors.disabled,
              }}
            />
          </div>
        </div>
      </section>

      {/* Dashboard #2: Policy Severity */}
      <section style={styles.card} aria-labelledby="severity-dashboard-title">
        <h2 id="severity-dashboard-title" style={styles.cardTitle}>Policy Severity</h2>
        <div style={styles.totalRow}>
          <span style={styles.totalValue}>{stats.total}</span>
          <span style={styles.totalLabel}>Total Policies</span>
        </div>
        <div style={styles.statsGrid}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Critical</span>
            <span style={{ ...styles.statValue, color: colors.critical }}>{stats.critical}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>High</span>
            <span style={{ ...styles.statValue, color: colors.high }}>{stats.high}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Medium</span>
            <span style={{ ...styles.statValue, color: colors.medium }}>{stats.medium}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Low</span>
            <span style={{ ...styles.statValue, color: colors.low }}>{stats.low}</span>
          </div>
        </div>
        {/* Progress bar visualization */}
        <div style={styles.progressContainer}>
          <div style={styles.progressBar} role="img" aria-label={`${stats.critical} critical, ${stats.high} high, ${stats.medium} medium, ${stats.low} low`}>
            <div
              style={{
                ...styles.progressSegment,
                width: `${getPercentage(stats.critical, stats.total)}%`,
                backgroundColor: colors.critical,
              }}
            />
            <div
              style={{
                ...styles.progressSegment,
                width: `${getPercentage(stats.high, stats.total)}%`,
                backgroundColor: colors.high,
              }}
            />
            <div
              style={{
                ...styles.progressSegment,
                width: `${getPercentage(stats.medium, stats.total)}%`,
                backgroundColor: colors.medium,
              }}
            />
            <div
              style={{
                ...styles.progressSegment,
                width: `${getPercentage(stats.low, stats.total)}%`,
                backgroundColor: colors.low,
              }}
            />
          </div>
        </div>
      </section>

      {/* Dashboard #3: Policy Type */}
      <section style={styles.card} aria-labelledby="type-dashboard-title">
        <h2 id="type-dashboard-title" style={styles.cardTitle}>Policy Type</h2>
        <div style={styles.totalRow}>
          <span style={styles.totalValue}>{stats.total}</span>
          <span style={styles.totalLabel}>Total Policies</span>
        </div>
        <div style={styles.statsGrid}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Pre-defined</span>
            <span style={{ ...styles.statValue, color: colors.preDefined }}>{stats.preDefined}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Custom</span>
            <span style={{ ...styles.statValue, color: colors.custom }}>{stats.custom}</span>
          </div>
        </div>
        {/* Progress bar visualization */}
        <div style={styles.progressContainer}>
          <div style={styles.progressBar} role="img" aria-label={`${stats.preDefined} pre-defined, ${stats.custom} custom`}>
            <div
              style={{
                ...styles.progressSegment,
                width: `${getPercentage(stats.preDefined, stats.total)}%`,
                backgroundColor: colors.preDefined,
              }}
            />
            <div
              style={{
                ...styles.progressSegment,
                width: `${getPercentage(stats.custom, stats.total)}%`,
                backgroundColor: colors.custom,
              }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

