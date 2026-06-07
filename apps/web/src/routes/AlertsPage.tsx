import { CSSProperties, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAlerts } from '../hooks/useAlerts';
import { useAdaptivePolling } from '../hooks/usePolling';
import { useToast } from '../context/ToastContext';
import { assigneesService } from '../services/alerts.service';
import { policiesService } from '../services/policies.service';
import { policyConfigService, getLabel, PolicyConfig } from '../services/policyConfig.service';
import { AlertsTable } from '../components/alerts/AlertsTable';
import { AlertDetailsDrawer } from '../components/alerts/AlertDetailsDrawer';
import { AlertFilters, AlertFiltersState, defaultAlertFilters } from '../components/alerts/AlertFilters';
import { AlertDashboards } from '../components/alerts/AlertDashboards';
import { LoadingState } from '../components/common/LoadingState';
import type { Alert, AlertStatus, Severity, Assignee, AlertComment, Policy } from '../types/domain';
import { getAlertDisplayName } from '../utils/alertDisplayName';

// Polling intervals
const FAST_POLL_INTERVAL = 3000;  // 3 seconds when remediation in progress
const SLOW_POLL_INTERVAL = 10000; // 10 seconds when no active remediations

const styles: Record<string, CSSProperties> = {
  container: {
    maxWidth: 1200,
    margin: '0 auto',
  },
  header: {
    marginBottom: 'var(--space-lg)',
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
  tableContainer: {
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  error: {
    padding: 'var(--space-lg)',
    backgroundColor: 'var(--color-critical-bg)',
    color: 'var(--color-critical)',
    borderRadius: 'var(--radius-md)',
    textAlign: 'center',
  },
  empty: {
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
  },
};


export function AlertsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<AlertFiltersState>(defaultAlertFilters);
  const { alerts, loading, error, updateAlert, addComment, remediate, refresh, silentRefresh, updateAlertInList } = useAlerts();
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [policyConfig, setPolicyConfig] = useState<PolicyConfig | null>(null);
  const { showToast } = useToast();
  
  // Derived values from config
  const configLabels = policyConfig?.labels ?? null;
  const alertStatuses = policyConfig?.enums?.alertStatuses ?? [];
  const prevAlertsRef = useRef<Map<string, { status: AlertStatus; updatedAt?: string }>>(new Map());
  
  // Check if any alert is in REMEDIATION_IN_PROGRESS
  const hasActiveRemediation = useMemo(() => {
    return alerts.some(a => a.status === 'REMEDIATION_IN_PROGRESS');
  }, [alerts]);
  
  // Polling callback for alerts list
  const pollAlerts = useCallback(async () => {
    try {
      const freshAlerts = await silentRefresh();
      if (!freshAlerts) return;
      
      const prevMap = prevAlertsRef.current;
      
      // Check for status changes and show toasts for alerts NOT in the drawer
      // (Drawer handles its own toasts for the selected alert)
      for (const alert of freshAlerts) {
        const prev = prevMap.get(alert.id);
        if (prev && prev.status !== alert.status) {
          // Skip if this alert is currently open in the drawer
          if (selectedAlert?.id === alert.id && isDrawerOpen) {
            continue;
          }
          
          const alertName = getAlertDisplayName(alert, configLabels);
          const statusLabel = getLabel(configLabels?.alertStatuses, alert.status);
          showToast({ 
            type: 'info', 
            message: `Alert "${alertName}" status changed to ${statusLabel}`,
            dedupeKey: `alert-status:${alert.id}:${alert.status}`,
          });
        }
      }
      
      // Update the ref for next comparison
      const newMap = new Map<string, { status: AlertStatus; updatedAt?: string }>();
      freshAlerts.forEach(a => newMap.set(a.id, { status: a.status, updatedAt: a.updatedAt }));
      prevAlertsRef.current = newMap;
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, [silentRefresh, showToast, selectedAlert?.id, isDrawerOpen, configLabels]);
  
  // Adaptive polling: fast when remediation in progress, slow otherwise
  useAdaptivePolling(pollAlerts, {
    fastInterval: FAST_POLL_INTERVAL,
    slowInterval: SLOW_POLL_INTERVAL,
    shouldPollFast: hasActiveRemediation,
    enabled: true,
    pauseOnHidden: true,
  });
  
  // Initialize prev alerts ref when alerts change
  useEffect(() => {
    if (alerts.length > 0 && prevAlertsRef.current.size === 0) {
      const newMap = new Map<string, { status: AlertStatus; updatedAt?: string }>();
      alerts.forEach(a => newMap.set(a.id, { status: a.status, updatedAt: a.updatedAt }));
      prevAlertsRef.current = newMap;
    }
  }, [alerts]);
  
  // Build policy lookup map for Enabled/Type filtering
  const policyLookup = useMemo(() => {
    const lookup: Record<string, { enabled: boolean; isSystemPolicy: boolean }> = {};
    policies.forEach((p) => {
      lookup[p.id] = { enabled: p.enabled, isSystemPolicy: p.isSystemPolicy };
    });
    return lookup;
  }, [policies]);
  
  // Fetch assignees and policies on mount
  useEffect(() => {
    assigneesService.getAll().then(setAssignees).catch(console.error);
    policiesService.getAll().then(setPolicies).catch(console.error);
    policyConfigService.getConfig().then(setPolicyConfig).catch(console.error);
  }, []);
  
  // Refresh alerts when component mounts (for tab navigation)
  useEffect(() => {
    refresh();
  }, [refresh]);
  
  const handleAlertClick = (alert: Alert) => {
    setSelectedAlert(alert);
    setIsDrawerOpen(true);
  };
  
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };
  
  const handleUpdateAlert = useCallback(async (id: string, data: { status?: AlertStatus; severity?: Severity; assignedToId?: string | null }) => {
    const updated = await updateAlert(id, data);
    // Update selected alert if it's the same one
    if (selectedAlert?.id === id) {
      setSelectedAlert(updated);
    }
    return updated;
  }, [updateAlert, selectedAlert?.id]);
  
  const handleAddComment = useCallback(async (id: string, message: string): Promise<AlertComment> => {
    const comment = await addComment(id, message);
    return comment;
  }, [addComment]);
  
  const handleRemediate = useCallback(async (id: string, note?: string) => {
    const updated = await remediate(id, note);
    if (selectedAlert?.id === id) {
      setSelectedAlert(updated);
    }
    refresh();
    return updated;
  }, [remediate, refresh, selectedAlert?.id]);

  // Helper: Check if alert was created within date range
  const isWithinDateRange = (alert: Alert, range: { from: string | null; to: string | null }): boolean => {
    if (!range.from && !range.to) return true; // No filter
    
    const timestamp = alert.createdAt;
    if (!timestamp) return true; // No date info, include it
    
    const alertDate = new Date(timestamp);
    
    // Validate range (from > to is invalid, don't filter)
    if (range.from && range.to) {
      if (new Date(range.from) > new Date(range.to)) return true;
    }
    
    if (range.from && alertDate < new Date(range.from)) return false;
    if (range.to && alertDate > new Date(range.to)) return false;
    
    return true;
  };
  
  // Filter alerts based on filter state
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      // Search filter (policyName OR asset location OR description)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesPolicyName = alert.policyName.toLowerCase().includes(searchLower);
        const matchesAssetLocation = alert.asset.location.toLowerCase().includes(searchLower);
        const matchesDescription = alert.description.toLowerCase().includes(searchLower);
        if (!matchesPolicyName && !matchesAssetLocation && !matchesDescription) {
          return false;
        }
      }
      
      // Status filter (multi-select OR logic)
      if (filters.statuses.length > 0 && filters.statuses.length < alertStatuses.length) {
        if (!filters.statuses.includes(alert.status)) {
          return false;
        }
      }
      
      // Severity filter (multi-select OR logic)
      if (filters.severities.length > 0 && filters.severities.length < 4) {
        if (!filters.severities.includes(alert.severity)) {
          return false;
        }
      }
      
      // Assignee filter (multi-select OR logic)
      if (filters.assignees.length > 0) {
        // Check if any of the selected assignees match
        const hasMatch = filters.assignees.some((a) => {
          if (a === 'UNASSIGNED') return !alert.assignedTo;
          return alert.assignedTo?.id === a;
        });
        if (!hasMatch) {
          return false;
        }
      }
      
      // Policy Enabled filter (single-select, derived from policy lookup)
      if (filters.enabled) {
        const policy = policyLookup[alert.policyId];
        if (policy) {
          const policyStatus = policy.enabled ? 'ENABLED' : 'DISABLED';
          if (filters.enabled !== policyStatus) {
            return false;
          }
        }
        // If policy not found, include the alert (don't filter out)
      }
      
      // Policy Type filter (single-select, derived from policy lookup)
      if (filters.types) {
        const policy = policyLookup[alert.policyId];
        if (policy) {
          const policyType = policy.isSystemPolicy ? 'SYSTEM' : 'CUSTOM';
          if (filters.types !== policyType) {
            return false;
          }
        }
        // If policy not found, include the alert
      }
      
      // Created date range filter
      if (!isWithinDateRange(alert, filters.createdRange)) {
        return false;
      }
      
      // Auto remediate filter (single-select, from policy snapshot)
      if (filters.autoRemediate) {
        const isAutoRemediate = alert.policySnapshot?.autoRemediate ?? false;
        const filterIsOn = filters.autoRemediate === 'ON';
        if (filterIsOn !== isAutoRemediate) {
          return false;
        }
      }
      
      return true;
    });
  }, [alerts, filters, policyLookup]);
  
  if (loading) {
    return <LoadingState message="Loading alerts..." />;
  }
  
  return (
    <div style={styles.container} data-testid="alerts-page">
      <header style={styles.header}>
        <h1 style={styles.title}>Security Alerts</h1>
        <p style={styles.subtitle}>
          Review and manage security alerts detected across your assets
        </p>
      </header>
      
      {/* Dashboards - reflect filtered results */}
      <AlertDashboards 
        alerts={filteredAlerts} 
        configLabels={configLabels}
        alertStatuses={alertStatuses}
      />
      
      <AlertFilters 
        filters={filters} 
        onFiltersChange={setFilters}
        assignees={assignees}
        configLabels={configLabels}
        alertStatuses={alertStatuses}
      />
      
      {error && <div style={styles.error}>{error}</div>}
      
      {alerts.length === 0 ? (
        <div style={styles.empty}>
          No alerts found. Run a scan to detect security issues.
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <AlertsTable
            alerts={filteredAlerts}
            onAlertClick={handleAlertClick}
            configLabels={configLabels}
          />
        </div>
      )}
      
      <AlertDetailsDrawer
        alert={selectedAlert}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onUpdateAlert={handleUpdateAlert}
        onAddComment={handleAddComment}
        onRemediate={handleRemediate}
        assignees={assignees}
        onAlertPolled={updateAlertInList}
        onViewPolicy={(policyId) => {
          handleCloseDrawer();
          navigate(`/policies?view=${policyId}`);
        }}
      />
    </div>
  );
}
