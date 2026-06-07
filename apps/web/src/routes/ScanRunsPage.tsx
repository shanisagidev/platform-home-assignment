import { CSSProperties, useState, useEffect, useCallback } from 'react';
import { scansService } from '../services/scans.service';
import { useScanStatus } from '../context/ScanStatusContext';
import { LoadingState } from '../components/common/LoadingState';
import { Drawer } from '../components/common/Drawer';
import type { ScanRun } from '../types/domain';
import { formatDateTime } from '../utils/dateFormat';

// Helper to format scan status for display
function formatScanStatus(status: string): string {
  if (status === 'RUNNING') return 'Scanning In Progress';
  if (status === 'COMPLETED') return 'Completed';
  return status;
}

const styles: Record<string, CSSProperties> = {
  container: {
    maxWidth: 1200,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--space-lg)',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginBottom: 'var(--space-xs)',
  },
  subtitle: {
    fontSize: 14,
    color: 'var(--color-text-secondary)',
  },
  startButton: {
    padding: 'var(--space-sm) var(--space-lg)',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-bg-primary)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  tableContainer: {
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
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
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  statusRunning: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    color: '#6366f1',  // Purple/indigo - matches the flashing banner
  },
  statusCompleted: {
    backgroundColor: 'rgba(57, 217, 138, 0.15)',
    color: 'var(--color-resolved)',
  },
  mono: {
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    color: 'var(--color-text-secondary)',
  },
  empty: {
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
  },
  section: {
    marginBottom: 'var(--space-lg)',
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 'var(--space-xs)',
  },
  value: {
    fontSize: 14,
    color: 'var(--color-text-primary)',
  },
  row2: {
    display: 'flex',
    gap: 'var(--space-lg)',
  },
  col: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'var(--color-border)',
    margin: 'var(--space-lg) 0',
  },
  statBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-lg)',
    padding: 'var(--space-md)',
    backgroundColor: 'var(--color-bg-tertiary)',
    borderRadius: 'var(--radius-md)',
  },
  statItem: {
    textAlign: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-mono)',
  },
  statLabel: {
    fontSize: 12,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
  },
};

function formatDate(dateStr: string): string {
  return formatDateTime(dateStr);
}

function formatDuration(startStr: string, endStr?: string): string {
  const start = new Date(startStr).getTime();
  const end = endStr ? new Date(endStr).getTime() : Date.now();
  const durationMs = end - start;
  
  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
  return `${Math.floor(durationMs / 60000)}m ${Math.round((durationMs % 60000) / 1000)}s`;
}

export function ScanRunsPage() {
  const [scans, setScans] = useState<ScanRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [selectedScan, setSelectedScan] = useState<ScanRun | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { refreshStatus, isScanning } = useScanStatus();
  
  const fetchScans = useCallback(async () => {
    try {
      setLoading(true);
      const data = await scansService.getAll();
      setScans(data);
    } catch (err) {
      console.error('Failed to fetch scans:', err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Refetch on mount (for tab navigation refresh)
  useEffect(() => {
    fetchScans();
  }, [fetchScans]);
  
  // Poll for running scans
  useEffect(() => {
    const hasRunning = scans.some((s) => s.status === 'RUNNING');
    if (!hasRunning) return;
    
    const intervalId = window.setInterval(fetchScans, 1000);
    return () => window.clearInterval(intervalId);
  }, [scans, fetchScans]);
  
  const handleStartScan = async () => {
    setIsStarting(true);
    try {
      await scansService.startScan();
      // Immediately refresh global scan status to show banner
      refreshStatus();
      await fetchScans();
    } finally {
      setIsStarting(false);
    }
  };
  
  // Refetch scans when global scanning status changes (to show updated results)
  useEffect(() => {
    if (!isScanning) {
      fetchScans();
    }
  }, [isScanning, fetchScans]);
  
  const handleRowClick = (scan: ScanRun) => {
    setSelectedScan(scan);
    setIsDrawerOpen(true);
  };
  
  if (loading) {
    return <LoadingState message="Loading scan activity..." />;
  }
  
  return (
    <div style={styles.container} data-testid="scans-page">
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Scan Activity</h1>
          <p style={styles.subtitle}>
            View past scans and their results
          </p>
        </div>
        <button
          style={{
            ...styles.startButton,
            opacity: isStarting ? 0.7 : 1,
          }}
          onClick={handleStartScan}
          disabled={isStarting}
          aria-label="Start new scan"
        >
          {isStarting ? 'Starting...' : 'Start New Scan'}
        </button>
      </header>
      
      {scans.length === 0 ? (
        <div style={styles.empty}>
          No scans have been run yet. Click "Start New Scan" to begin.
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Scan ID</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Started</th>
                <th style={styles.th}>Duration</th>
                <th style={styles.th}>Assets</th>
                <th style={styles.th}>Alerts</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <tr
                  key={scan.id}
                  style={styles.row}
                  onClick={() => handleRowClick(scan)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '';
                  }}
                >
                  <td style={styles.td}>
                    <span style={styles.mono}>{scan.id}</span>
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        ...(scan.status === 'RUNNING' ? styles.statusRunning : styles.statusCompleted),
                      }}
                    >
                      {formatScanStatus(scan.status)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.mono}>{formatDate(scan.startedAt)}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.mono}>
                      {formatDuration(scan.startedAt, scan.completedAt)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.mono}>{scan.scannedAssetsCount}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.mono}>{scan.alertsCreatedCount}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Scan Details"
      >
        {selectedScan && (
          <>
            <div style={styles.section}>
              <div style={styles.label}>Scan ID</div>
              <div style={{ ...styles.value, fontFamily: 'var(--font-mono)' }}>
                {selectedScan.id}
              </div>
            </div>
            
            <div style={styles.row2}>
              <div style={styles.col}>
                <div style={styles.section}>
                  <div style={styles.label}>Status</div>
                  <span
                    style={{
                      ...styles.statusBadge,
                      ...(selectedScan.status === 'RUNNING' ? styles.statusRunning : styles.statusCompleted),
                    }}
                  >
                    {formatScanStatus(selectedScan.status)}
                  </span>
                </div>
              </div>
              <div style={styles.col}>
                <div style={styles.section}>
                  <div style={styles.label}>Duration</div>
                  <div style={styles.value}>
                    {formatDuration(selectedScan.startedAt, selectedScan.completedAt)}
                  </div>
                </div>
              </div>
            </div>
            
            <div style={styles.divider} />
            
            <div style={styles.statBox}>
              <div style={styles.statItem}>
                <div style={styles.statValue}>{selectedScan.scannedAssetsCount}</div>
                <div style={styles.statLabel}>Assets Scanned</div>
              </div>
              <div style={styles.statItem}>
                <div style={{ ...styles.statValue, color: 'var(--color-open)' }}>
                  {selectedScan.alertsCreatedCount}
                </div>
                <div style={styles.statLabel}>Alerts Created</div>
              </div>
            </div>
            
            <div style={styles.divider} />
            
            <div style={styles.section}>
              <div style={styles.label}>Started At</div>
              <div style={{ ...styles.value, fontFamily: 'var(--font-mono)' }}>
                {formatDate(selectedScan.startedAt)}
              </div>
            </div>
            
            {selectedScan.completedAt && (
              <div style={styles.section}>
                <div style={styles.label}>Completed At</div>
                <div style={{ ...styles.value, fontFamily: 'var(--font-mono)' }}>
                  {formatDate(selectedScan.completedAt)}
                </div>
              </div>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}

