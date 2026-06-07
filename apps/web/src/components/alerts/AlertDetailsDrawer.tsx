import { CSSProperties, useState, useEffect, useCallback, useRef } from 'react';
import { Drawer } from '../common/Drawer';
import { SingleSelect, SingleSelectOption } from '../common/SingleSelect';
import { CommentsPanel } from './CommentsPanel';
import { AuditPanel } from './AuditPanel';
import { usePolling } from '../../hooks/usePolling';
import { useToast } from '../../context/ToastContext';
import { alertsService } from '../../services/alerts.service';
import { policyConfigService, PolicyConfigLabels, getLabel, getDatastoreLabel } from '../../services/policyConfig.service';
import type { Alert, AlertStatus, Severity, Assignee, AlertComment } from '../../types/domain';
import { VALID_TRANSITIONS, REMEDIATABLE_STATUSES, USER_SELECTABLE_STATUSES } from '../../types/domain';
import { formatDateTime } from '../../utils/dateFormat';
import { getAlertDisplayName } from '../../utils/alertDisplayName';

// Polling intervals for alert details
const FAST_POLL_INTERVAL = 2000;  // 2 seconds when remediation in progress
const SLOW_POLL_INTERVAL = 5000;  // 5 seconds otherwise

interface AlertDetailsDrawerProps {
  alert: Alert | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateAlert: (id: string, data: { status?: AlertStatus; severity?: Severity; assignedToId?: string | null }) => Promise<Alert>;
  onAddComment: (id: string, message: string) => Promise<AlertComment>;
  onRemediate: (id: string, note?: string) => Promise<Alert>;
  assignees: Assignee[];
  onAlertPolled?: (alert: Alert) => void; // Called when polling updates the alert
  onViewPolicy?: (policyId: string) => void; // Navigate to policy details
}

const styles: Record<string, CSSProperties> = {
  section: {
    marginBottom: 'var(--space-lg)',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginBottom: 'var(--space-md)',
    paddingBottom: 'var(--space-sm)',
    borderBottom: '1px solid var(--color-border)',
  },
  collapsibleHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginBottom: 0,
    paddingBottom: 'var(--space-sm)',
    borderBottom: '1px solid var(--color-border)',
    cursor: 'pointer',
    userSelect: 'none' as const,
    background: 'none',
    border: 'none',
    width: '100%',
    textAlign: 'left' as const,
  },
  collapsibleChevron: {
    fontSize: 12,
    color: 'var(--color-text-muted)',
    transition: 'transform 0.2s ease',
  },
  collapsibleContent: {
    marginTop: 'var(--space-md)',
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
    lineHeight: 1.6,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  codeBlock: {
    backgroundColor: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-md)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: 'var(--color-text-secondary)',
    overflow: 'auto',
    maxHeight: 200,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  divider: {
    height: 1,
    backgroundColor: 'var(--color-border)',
    margin: 'var(--space-lg) 0',
  },
  row: {
    display: 'flex',
    gap: 'var(--space-lg)',
  },
  col: {
    flex: 1,
  },
  managementSection: {
    backgroundColor: 'var(--color-bg-tertiary)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-md)',
    marginBottom: 'var(--space-lg)',
  },
  managementGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--space-md)',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
  },
  select: {
    padding: 'var(--space-sm) var(--space-md)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-secondary)',
    color: 'var(--color-text-primary)',
    fontSize: 14,
    cursor: 'pointer',
  },
  selectDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  remediateButton: {
    padding: 'var(--space-sm) var(--space-lg)',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'white',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 'var(--space-sm)',
  },
  remediateButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    backgroundColor: 'var(--color-bg-tertiary)',
    color: 'var(--color-text-muted)',
  },
  textarea: {
    width: '100%',
    padding: 'var(--space-sm)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-secondary)',
    color: 'var(--color-text-primary)',
    fontSize: 14,
    minHeight: 60,
    resize: 'vertical',
    fontFamily: 'inherit',
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

const SEVERITY_OPTIONS: Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const tagStyles: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderRadius: 'var(--radius-sm)',
  fontSize: 11,
  fontWeight: 500,
  backgroundColor: 'var(--color-bg-tertiary)',
  color: 'var(--color-text-secondary)',
  border: '1px solid var(--color-border)',
  marginRight: 4,
  marginBottom: 4,
};

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({ title, isExpanded, onToggle, children }: CollapsibleSectionProps) {
  return (
    <div style={styles.section}>
      <button
        onClick={onToggle}
        style={styles.collapsibleHeader}
        aria-expanded={isExpanded}
        aria-controls={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <span>{title}</span>
        <span style={{ 
          ...styles.collapsibleChevron,
          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
        }}>
          ▶
        </span>
      </button>
      {isExpanded && (
        <div 
          style={styles.collapsibleContent}
          id={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function AlertDetailsDrawer({
  alert,
  isOpen,
  onClose,
  onUpdateAlert,
  onAddComment,
  onRemediate,
  assignees,
  onAlertPolled,
  onViewPolicy,
}: AlertDetailsDrawerProps) {
  const [currentAlert, setCurrentAlert] = useState<Alert | null>(alert);
  const [showRawEvidence, setShowRawEvidence] = useState(false);
  
  // Collapsible section state - Management, Comments, Audit expanded by default
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    management: true,
    comments: true,
    audit: true,
    policy: false,
    remediation: false,
    affectedAsset: false,
    supportedAssets: false,
    evidence: false,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemediating, setIsRemediating] = useState(false);
  const [remediationNote, setRemediationNote] = useState('');
  const [configLabels, setConfigLabels] = useState<PolicyConfigLabels | null>(null);
  const [auditRefreshTrigger, setAuditRefreshTrigger] = useState(0);
  const { showToast, suppressKey } = useToast();
  const prevStatusRef = useRef<AlertStatus | null>(null);
  const localCommentsRef = useRef<Set<string>>(new Set()); // Track locally added comment IDs
  
  // Toggle section expand/collapse
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  // Fetch config labels on mount
  useEffect(() => {
    policyConfigService.getConfig()
      .then(config => setConfigLabels(config.labels))
      .catch(console.error);
  }, []);
  
  // Helper to generate dedupe key for status changes
  const getStatusDedupeKey = (alertId: string, newStatus: AlertStatus) => 
    `alert-status:${alertId}:${newStatus}`;
  
  // Determine if we should poll fast (remediation in progress)
  const isRemediationInProgress = currentAlert?.status === 'REMEDIATION_IN_PROGRESS';
  const pollInterval = isRemediationInProgress ? FAST_POLL_INTERVAL : SLOW_POLL_INTERVAL;
  
  // Poll callback for single alert details
  const pollAlert = useCallback(async () => {
    if (!currentAlert?.id || isUpdating || isRemediating) return;
    
    try {
      const freshAlert = await alertsService.getById(currentAlert.id);
      
      // Check if status changed
      if (prevStatusRef.current && prevStatusRef.current !== freshAlert.status) {
        const alertName = getAlertDisplayName(freshAlert, configLabels);
        const statusLabel = getLabel(configLabels?.alertStatuses, freshAlert.status);
        showToast({ 
          type: 'info', 
          message: `Alert "${alertName}" status changed to ${statusLabel}`,
          dedupeKey: getStatusDedupeKey(freshAlert.id, freshAlert.status),
        });
      }
      
      prevStatusRef.current = freshAlert.status;
      
      // Merge comments: keep locally added comments that aren't in server response yet
      setCurrentAlert(prev => {
        if (!prev) return freshAlert;
        
        // Get server comment IDs
        const serverCommentIds = new Set(freshAlert.comments.map(c => c.id));
        
        // Find local comments not yet in server response
        const localOnlyComments = prev.comments.filter(c => 
          localCommentsRef.current.has(c.id) && !serverCommentIds.has(c.id)
        );
        
        // Clean up localCommentsRef - remove IDs that are now in server response
        localCommentsRef.current.forEach(id => {
          if (serverCommentIds.has(id)) {
            localCommentsRef.current.delete(id);
          }
        });
        
        return {
          ...freshAlert,
          comments: [...freshAlert.comments, ...localOnlyComments],
        };
      });
      
      // Notify parent to update list
      if (onAlertPolled) {
        onAlertPolled(freshAlert);
      }
    } catch (err) {
      console.error('Alert details polling error:', err);
    }
  }, [currentAlert?.id, isUpdating, isRemediating, showToast, onAlertPolled, configLabels]);
  
  // Enable polling when drawer is open
  const { isPolling } = usePolling(pollAlert, {
    interval: pollInterval,
    enabled: isOpen && !!currentAlert?.id,
    pauseOnHidden: true,
  });
  
  // Update local state when prop changes (only when switching to a different alert)
  useEffect(() => {
    // Only reset state when switching to a DIFFERENT alert (by ID)
    // Don't reset when the same alert is updated (e.g., after adding a comment)
    if (alert?.id !== currentAlert?.id) {
      setCurrentAlert(alert);
      setRemediationNote('');
      prevStatusRef.current = alert?.status || null;
      localCommentsRef.current.clear(); // Clear local comments tracking when switching alerts
    }
  }, [alert?.id, currentAlert?.id]);
  
  if (!currentAlert) return null;
  
  // Get valid transitions from API response or fallback to client-side logic
  const validTransitions = currentAlert.validTransitions || VALID_TRANSITIONS[currentAlert.status] || [];
  const canRemediate = currentAlert.canRemediate !== undefined 
    ? currentAlert.canRemediate 
    : REMEDIATABLE_STATUSES.includes(currentAlert.status);
  
  const handleStatusChange = async (newStatus: AlertStatus) => {
    if (isUpdating || !validTransitions.includes(newStatus)) return;
    setIsUpdating(true);
    try {
      const updated = await onUpdateAlert(currentAlert.id, { status: newStatus });
      setCurrentAlert(updated);
      prevStatusRef.current = updated.status;
      setAuditRefreshTrigger(t => t + 1); // Refresh audit trail
      
      const dedupeKey = getStatusDedupeKey(updated.id, updated.status);
      const alertName = getAlertDisplayName(updated, configLabels);
      const statusLabel = getLabel(configLabels?.alertStatuses, updated.status);
      
      // Show toast FIRST, then suppress to prevent polling duplicates
      showToast({ 
        type: 'info', 
        message: `Alert "${alertName}" status changed to ${statusLabel}`,
        dedupeKey,
      });
      suppressKey(dedupeKey);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleSeverityChange = async (newSeverity: Severity) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const updated = await onUpdateAlert(currentAlert.id, { severity: newSeverity });
      setCurrentAlert(updated);
      setAuditRefreshTrigger(t => t + 1); // Refresh audit trail
      
      const alertName = getAlertDisplayName(updated, configLabels);
      const severityLabel = getLabel(configLabels?.severities, newSeverity);
      showToast({ 
        type: 'info', 
        message: `Alert "${alertName}" severity changed to ${severityLabel}`,
        dedupeKey: `alert-severity:${updated.id}:${newSeverity}`,
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleAssigneeChange = async (assigneeId: string | null) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const updated = await onUpdateAlert(currentAlert.id, { assignedToId: assigneeId });
      setCurrentAlert(updated);
      setAuditRefreshTrigger(t => t + 1); // Refresh audit trail
      
      const alertName = getAlertDisplayName(updated, configLabels);
      const assigneeName = assigneeId ? assignees.find(a => a.id === assigneeId)?.name || 'Unknown' : 'Unassigned';
      showToast({ 
        type: 'info', 
        message: `Alert "${alertName}" assigned to ${assigneeName}`,
        dedupeKey: `alert-assignee:${updated.id}:${assigneeId || 'none'}`,
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleAddComment = async (message: string) => {
    const newComment = await onAddComment(currentAlert.id, message);
    
    // Track this comment as locally added (to preserve during polling)
    localCommentsRef.current.add(newComment.id);
    
    // Use the actual comment from API response
    setCurrentAlert(prev => prev ? {
      ...prev,
      comments: [...prev.comments, newComment]
    } : null);
    
    const alertName = getAlertDisplayName(currentAlert, configLabels);
    showToast({ 
      type: 'info', 
      message: `Comment added to "${alertName}"`,
      dedupeKey: `alert-comment:${currentAlert.id}:${newComment.id}`,
    });
  };
  
  const handleRemediate = async () => {
    if (!canRemediate || isRemediating) return;
    setIsRemediating(true);
    try {
      const updated = await onRemediate(currentAlert.id, remediationNote || undefined);
      setCurrentAlert(updated);
      prevStatusRef.current = updated.status;
      setRemediationNote('');
      setAuditRefreshTrigger(t => t + 1); // Refresh audit trail
      
      const dedupeKey = getStatusDedupeKey(updated.id, updated.status);
      const alertName = getAlertDisplayName(updated, configLabels);
      const statusLabel = getLabel(configLabels?.alertStatuses, updated.status);
      
      // Show toast FIRST, then suppress to prevent polling duplicates
      showToast({ 
        type: 'info', 
        message: `Alert "${alertName}" status changed to ${statusLabel}`,
        dedupeKey,
      });
      suppressKey(dedupeKey);
    } finally {
      setIsRemediating(false);
    }
  };
  
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={getAlertDisplayName(currentAlert, configLabels)} width="600px" testId="alert-details-drawer">
      {/* Live Updates Indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: 'var(--space-sm)',
        fontSize: 11,
        color: isPolling ? 'var(--color-accent)' : 'var(--color-text-muted)',
      }}>
        <span style={{
          display: 'inline-block',
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: isPolling ? 'var(--color-accent)' : 'var(--color-text-muted)',
          marginRight: 6,
          animation: isPolling ? 'pulse 2s infinite' : 'none',
        }} />
        Live updates: {isPolling ? 'On' : 'Off'}
      </div>
      
      {/* Management Section - EXPANDED by default */}
      <CollapsibleSection
        title="Management"
        isExpanded={expandedSections.management}
        onToggle={() => toggleSection('management')}
      >
        <div style={styles.managementGrid}>
          <div style={styles.field}>
            <div style={styles.label}>Status</div>
            {(() => {
              const userSelectableTransitions = validTransitions.filter(s => USER_SELECTABLE_STATUSES.includes(s));
              const hasUserSelectableTransitions = userSelectableTransitions.length > 0;
              
              // Check if current status is user-selectable
              const isCurrentStatusUserSelectable = USER_SELECTABLE_STATUSES.includes(currentAlert.status);
              
              // Build options: ONLY user-selectable statuses appear in the dropdown
              // System-only statuses (like REMEDIATED_WAITING_FOR_CUSTOMER) NEVER appear in dropdown
              // The current status is shown via the value prop, not in the options list
              const statusOptions: SingleSelectOption[] = [
                // Only include current status if it's user-selectable
                ...(isCurrentStatusUserSelectable 
                  ? [{ value: currentAlert.status, label: getLabel(configLabels?.alertStatuses, currentAlert.status) }] 
                  : []),
                ...userSelectableTransitions
                  .filter(s => s !== currentAlert.status)
                  .map(s => ({ value: s, label: getLabel(configLabels?.alertStatuses, s) }))
              ];
              
              // For display: current status label (even if system-only)
              const currentStatusLabel = getLabel(configLabels?.alertStatuses, currentAlert.status);
              
              // If current status is system-only, show read-only display with dropdown for transitions
              // If user-selectable, show normal dropdown
              if (!isCurrentStatusUserSelectable) {
                // System-only status: show current status as read-only, dropdown only for transitions
                return (
                  <>
                    {hasUserSelectableTransitions ? (
                      <SingleSelect
                        id="alert-status"
                        options={statusOptions}
                        value=""
                        onChange={(value) => handleStatusChange(value as AlertStatus)}
                        disabled={isUpdating}
                        aria-label="Change alert status"
                        compact
                        placeholder={currentStatusLabel}
                      />
                    ) : (
                      <>
                        <div style={{
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          backgroundColor: 'var(--color-bg-tertiary)',
                          color: 'var(--color-text-primary)',
                          fontSize: 13,
                          minHeight: 32,
                          display: 'flex',
                          alignItems: 'center',
                          opacity: 0.8,
                        }}>
                          {currentStatusLabel}
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          No status changes available
                        </span>
                      </>
                    )}
                  </>
                );
              }
              
              return (
                <>
                  <SingleSelect
                    id="alert-status"
                    options={statusOptions}
                    value={currentAlert.status}
                    onChange={(value) => handleStatusChange(value as AlertStatus)}
                    disabled={!hasUserSelectableTransitions || isUpdating}
                    aria-label="Change alert status"
                    compact
                  />
                  {!hasUserSelectableTransitions && (
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      No status changes available
                    </span>
                  )}
                </>
              );
            })()}
          </div>
          
          <div style={styles.field}>
            <div style={styles.label}>Severity</div>
            <SingleSelect
              id="alert-severity"
              options={SEVERITY_OPTIONS.map(s => ({ value: s, label: s }))}
              value={currentAlert.severity}
              onChange={(value) => handleSeverityChange(value as Severity)}
              disabled={isUpdating || currentAlert.status === 'RESOLVED'}
              aria-label="Change alert severity"
              compact
            />
          </div>
          
          <div style={styles.field}>
            <div style={styles.label}>Assignee</div>
            <SingleSelect
              id="alert-assignee"
              options={[
                { value: '', label: 'Unassigned' },
                ...assignees.map(a => ({ value: a.id, label: a.name }))
              ]}
              value={currentAlert.assignedTo?.id || ''}
              onChange={(value) => handleAssigneeChange(value || null)}
              disabled={isUpdating || currentAlert.status === 'RESOLVED'}
              aria-label="Assign alert"
              compact
            />
          </div>
          
          <div style={styles.field}>
            <div style={styles.label}>Was Remediated</div>
            <span style={{ 
              ...styles.badge, 
              backgroundColor: currentAlert.wasRemediated ? 'rgba(57, 217, 138, 0.15)' : 'var(--color-bg-tertiary)', 
              color: currentAlert.wasRemediated ? 'var(--color-resolved)' : 'var(--color-text-muted)' 
            }}>
              {currentAlert.wasRemediated ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </CollapsibleSection>
      
      {/* Policy Section - COLLAPSED by default */}
      <CollapsibleSection
        title="Policy"
        isExpanded={expandedSections.policy}
        onToggle={() => toggleSection('policy')}
      >
        <div style={styles.section}>
          <div style={styles.label}>Policy Name</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <span style={styles.value}>{currentAlert.policyName}</span>
          {onViewPolicy && (
            <button
              onClick={() => onViewPolicy(currentAlert.policyId)}
              style={{
                padding: '4px 8px',
                fontSize: 11,
                backgroundColor: 'var(--color-accent-muted)',
                color: 'var(--color-accent)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              View policy →
            </button>
          )}
        </div>
      </div>
      
      {/* Policy Snapshot - Violation Type */}
      {currentAlert.policySnapshot && (
        <div style={styles.section}>
          <div style={styles.label}>Violation Type</div>
          <span style={{ ...styles.badge, backgroundColor: 'var(--color-critical-bg)', color: 'var(--color-critical)' }}>
            {getLabel(configLabels?.violationTypes, currentAlert.policySnapshot.violationType)}
          </span>
        </div>
      )}
      
      <div style={styles.row}>
        <div style={styles.col}>
          <div style={styles.section}>
            <div style={styles.label}>Severity</div>
            <span style={{ ...styles.badge, ...severityStyles[currentAlert.severity] }}>
              {currentAlert.severity}
            </span>
          </div>
        </div>
        <div style={styles.col}>
          <div style={styles.section}>
            <div style={styles.label}>Status</div>
            <span style={{ ...styles.badge, ...statusStyles[currentAlert.status] }}>
              {getLabel(configLabels?.alertStatuses, currentAlert.status)}
            </span>
          </div>
        </div>
      </div>
      
      <div style={styles.section}>
        <div style={styles.label}>Assigned To</div>
        <div style={styles.value}>
          {currentAlert.assignedTo?.name || 'Unassigned'}
        </div>
      </div>
      
        <div style={styles.section}>
          <div style={styles.label}>Description</div>
          <div style={styles.value}>{currentAlert.description}</div>
        </div>
      </CollapsibleSection>
      
      {/* Remediation Section - COLLAPSED by default */}
      <CollapsibleSection
        title="Remediation"
        isExpanded={expandedSections.remediation}
        onToggle={() => toggleSection('remediation')}
      >
        
        {/* Show policy remediation info */}
        {currentAlert.policySnapshot && currentAlert.policySnapshot.remediationType && (
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <div style={styles.row}>
              <div style={styles.col}>
                <div style={styles.label}>Policy Remediation Type</div>
                <span style={{ ...styles.badge, backgroundColor: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>
                  {getLabel(configLabels?.remediationTypes, currentAlert.policySnapshot.remediationType)}
                </span>
              </div>
              <div style={styles.col}>
                <div style={styles.label}>Auto Remediate</div>
                <span style={{ 
                  ...styles.badge, 
                  backgroundColor: currentAlert.policySnapshot.autoRemediate ? 'var(--color-accent-muted)' : 'var(--color-bg-tertiary)', 
                  color: currentAlert.policySnapshot.autoRemediate ? 'var(--color-accent)' : 'var(--color-text-muted)' 
                }}>
                  {currentAlert.policySnapshot.autoRemediate ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
            {currentAlert.policySnapshot.remediationPriority && (
              <div style={{ marginTop: 'var(--space-sm)' }}>
                <div style={styles.label}>Priority</div>
                <span style={tagStyles}>{currentAlert.policySnapshot.remediationPriority}</span>
              </div>
            )}
            {currentAlert.policySnapshot.remediationDue && (
              <div style={{ marginTop: 'var(--space-sm)' }}>
                <div style={styles.label}>Due</div>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  {currentAlert.policySnapshot.remediationDue.value} {currentAlert.policySnapshot.remediationDue.unit}
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Remediate action - always visible, enabled only in IN_PROGRESS */}
        <div style={{ marginTop: 'var(--space-md)' }}>
          <div style={styles.label}>Remediation Note (optional)</div>
          <textarea
            value={remediationNote}
            onChange={(e) => setRemediationNote(e.target.value)}
            placeholder="Add a note about this remediation..."
            style={{ 
              ...styles.textarea,
              opacity: canRemediate ? 1 : 0.5,
            }}
            disabled={!canRemediate || isRemediating}
            aria-label="Remediation note"
          />
          <button
            onClick={handleRemediate}
            disabled={!canRemediate || isRemediating}
            style={{
              ...styles.remediateButton,
              ...(!canRemediate || isRemediating ? styles.remediateButtonDisabled : {}),
            }}
          >
            {isRemediating ? 'Starting Remediation...' : 'Remediate'}
          </button>
          {!canRemediate && (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: 'var(--space-xs)' }}>
              Remediation is only available when status is In Progress.
            </div>
          )}
        </div>
        
        {/* Display saved remediation notes */}
        {currentAlert.remediation?.note && (
          <div style={{ marginTop: 'var(--space-md)' }}>
            <div style={styles.label}>Remediation Notes</div>
            <div style={{ 
              padding: 'var(--space-sm) var(--space-md)',
              backgroundColor: 'var(--color-bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              fontSize: 13,
              color: 'var(--color-text-primary)',
              whiteSpace: 'pre-wrap',
            }}>
              {currentAlert.remediation.note}
            </div>
          </div>
        )}
        {!currentAlert.remediation?.note && currentAlert.wasRemediated && (
          <div style={{ marginTop: 'var(--space-md)' }}>
            <div style={styles.label}>Remediation Notes</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              No remediation notes
            </div>
          </div>
        )}
      </CollapsibleSection>
      
      {/* Affected Asset Section - COLLAPSED by default */}
      <CollapsibleSection
        title="Affected Asset"
        isExpanded={expandedSections.affectedAsset}
        onToggle={() => toggleSection('affectedAsset')}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          <div style={styles.field}>
            <div style={styles.label}>Asset Name</div>
            <div style={styles.value}>{currentAlert.assetDisplayName || 'Unknown'}</div>
          </div>
          <div style={styles.field}>
            <div style={styles.label}>Asset Category</div>
            <span style={{ ...styles.badge, backgroundColor: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>
              {currentAlert.assetCategory === 'CLOUD' ? 'Cloud' : 'SaaS'}
            </span>
          </div>
          {currentAlert.assetCategory === 'CLOUD' && currentAlert.cloudProvider && (
            <>
              <div style={styles.field}>
                <div style={styles.label}>Cloud Provider</div>
                <span style={tagStyles}>
                  {getLabel(configLabels?.cloudProviders, currentAlert.cloudProvider)}
                </span>
              </div>
              <div style={styles.field}>
                <div style={styles.label}>Data Store Type</div>
                <span style={tagStyles}>
                  {getDatastoreLabel(configLabels?.cloudDatastores, currentAlert.cloudProvider, currentAlert.dataStoreType)}
                </span>
              </div>
            </>
          )}
          {currentAlert.assetCategory === 'SAAS' && currentAlert.saasTool && (
            <div style={styles.field}>
              <div style={styles.label}>SaaS Tool</div>
              <span style={tagStyles}>
                {getLabel(configLabels?.saasTools, currentAlert.saasTool)}
              </span>
            </div>
          )}
          <div style={styles.field}>
            <div style={styles.label}>Location</div>
            <div style={{ ...styles.value, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              {currentAlert.assetLocation || 'N/A'}
            </div>
          </div>
          {currentAlert.accountId && (
            <div style={styles.field}>
              <div style={styles.label}>Account ID</div>
              <div style={{ ...styles.value, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                {currentAlert.accountId}
              </div>
            </div>
          )}
        </div>
      
        {/* Supported Assets from Policy - included in Affected Asset section */}
        {currentAlert.policySnapshot?.supportedAssets && (
          <div style={{ marginTop: 'var(--space-md)' }}>
            <div style={styles.label}>Supported Assets (from Policy)</div>
          <div style={{ marginBottom: 'var(--space-sm)' }}>
            <span style={tagStyles}>
              {currentAlert.policySnapshot.supportedAssets.assetCategory === 'CLOUD' ? 'Cloud' : 'SaaS'}
            </span>
          </div>
          {currentAlert.policySnapshot.supportedAssets.assetCategory === 'CLOUD' && 
           currentAlert.policySnapshot.supportedAssets.cloudProviders && (
            <div>
              {currentAlert.policySnapshot.supportedAssets.cloudProviders.map((cp, idx) => (
                <div key={idx} style={{ marginBottom: 'var(--space-xs)' }}>
                  <strong style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    {getLabel(configLabels?.cloudProviders, cp.provider)}:
                  </strong>
                  <span style={{ marginLeft: 8 }}>
                    {cp.dataStores.map((ds) => (
                      <span key={ds} style={tagStyles}>{getDatastoreLabel(configLabels?.cloudDatastores, cp.provider, ds)}</span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          )}
          {currentAlert.policySnapshot.supportedAssets.assetCategory === 'SAAS' && 
           currentAlert.policySnapshot.supportedAssets.saasTools && (
            <div>
              {currentAlert.policySnapshot.supportedAssets.saasTools.map((tool) => (
                <span key={tool} style={tagStyles}>{getLabel(configLabels?.saasTools, tool)}</span>
              ))}
            </div>
          )}
          </div>
        )}
      </CollapsibleSection>
      
      {/* Evidence Section - COLLAPSED by default */}
      <CollapsibleSection
        title="Evidence"
        isExpanded={expandedSections.evidence}
        onToggle={() => toggleSection('evidence')}
      >
        
        {/* Evidence Summary */}
        <div style={{ 
          padding: 'var(--space-md)', 
          backgroundColor: 'var(--color-bg-tertiary)', 
          borderRadius: 'var(--radius-sm)',
          marginBottom: 'var(--space-md)',
          borderLeft: '3px solid var(--color-accent)'
        }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
            Detected <strong>{getLabel(configLabels?.violationTypes, currentAlert.evidence?.violationType || currentAlert.violationType)}</strong> in {
              currentAlert.evidence?.assetContext?.saasTool || 
              currentAlert.evidence?.assetContext?.dataStoreType || 
              currentAlert.dataStoreType || 
              currentAlert.saasTool || 
              'asset'
            } "<strong>{currentAlert.evidence?.assetDisplayName || currentAlert.assetDisplayName}</strong>".
          </div>
        </div>
        
        {/* Findings Breakdown */}
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <div style={styles.label}>Findings</div>
          
          <div style={styles.row}>
            <div style={styles.col}>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Detected At</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                {currentAlert.evidence?.detectedAt ? formatDateTime(currentAlert.evidence.detectedAt as string) : formatDateTime(currentAlert.createdAt)}
              </div>
            </div>
            <div style={styles.col}>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Risk Score</div>
              <div style={{ 
                fontSize: 13, 
                fontWeight: 600,
                color: (currentAlert.evidence?.riskScore as number) >= 80 ? 'var(--color-critical)' : 
                       (currentAlert.evidence?.riskScore as number) >= 60 ? 'var(--color-high)' : 'var(--color-text-primary)'
              }}>
                {currentAlert.evidence?.riskScore || '—'}
              </div>
            </div>
          </div>
          
          <div style={styles.row}>
            <div style={styles.col}>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Asset</div>
              <div style={{ fontSize: 13 }}>
                {currentAlert.evidence?.assetDisplayName || currentAlert.assetDisplayName}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                {getLabel(configLabels?.cloudProviders, currentAlert.cloudProvider) || getLabel(configLabels?.saasTools, currentAlert.saasTool)} • {currentAlert.assetLocation}
              </div>
            </div>
          </div>
          
          {/* Scanned/Matched Objects */}
          {currentAlert.evidence?.findings && (
            <div style={{ marginTop: 'var(--space-md)' }}>
              <div style={styles.row}>
                <div style={styles.col}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Scanned Objects</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>
                    {(currentAlert.evidence.findings as { scannedObjectsCount?: number })?.scannedObjectsCount || 0}
                  </div>
                </div>
                <div style={styles.col}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Matched Objects</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-critical)' }}>
                    {(currentAlert.evidence.findings as { matchedObjectsCount?: number })?.matchedObjectsCount || 0}
                  </div>
                </div>
              </div>
              
              {/* Matched By Type */}
              {(currentAlert.evidence.findings as { matchedByType?: Record<string, number> })?.matchedByType && (
                <div style={{ marginTop: 'var(--space-sm)' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>Matched by Type</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {Object.entries((currentAlert.evidence.findings as { matchedByType: Record<string, number> }).matchedByType).map(([type, count]) => (
                      <span key={type} style={{ 
                        fontSize: 11, 
                        padding: '2px 8px', 
                        backgroundColor: 'var(--color-bg-secondary)', 
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--color-text-secondary)'
                      }}>
                        {type}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Sample Items */}
              {(currentAlert.evidence.findings as { sampleItems?: string[] })?.sampleItems && 
               (currentAlert.evidence.findings as { sampleItems: string[] }).sampleItems.length > 0 && (
                <div style={{ marginTop: 'var(--space-md)' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>Sample Items (up to 5)</div>
                  <div style={{ 
                    fontSize: 11, 
                    fontFamily: 'var(--font-mono)', 
                    backgroundColor: 'var(--color-bg-tertiary)',
                    padding: 'var(--space-sm)',
                    borderRadius: 'var(--radius-sm)',
                  }}>
                    {(currentAlert.evidence.findings as { sampleItems: string[] }).sampleItems.map((item, i) => (
                      <div key={i} style={{ color: 'var(--color-text-secondary)', padding: '2px 0' }}>{item}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Advanced: Raw Evidence Toggle */}
        <div style={{ marginTop: 'var(--space-md)' }}>
          <button
            onClick={() => setShowRawEvidence(!showRawEvidence)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontSize: 12,
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{ transform: showRawEvidence ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
            Advanced: Raw evidence
          </button>
          {showRawEvidence && (
            <pre style={{ ...styles.codeBlock, marginTop: 'var(--space-sm)', maxHeight: 200, overflow: 'auto' }}>
              {JSON.stringify(currentAlert.evidence, null, 2)}
            </pre>
          )}
        </div>
      </CollapsibleSection>
      
      {/* Comments Section - EXPANDED by default */}
      <CollapsibleSection
        title={`Comments (${currentAlert.comments.length})`}
        isExpanded={expandedSections.comments}
        onToggle={() => toggleSection('comments')}
      >
        <CommentsPanel
          comments={currentAlert.comments}
          onAddComment={handleAddComment}
          hideTitle
        />
      </CollapsibleSection>
      
      {/* Audit Section - EXPANDED by default */}
      <CollapsibleSection
        title="Audit"
        isExpanded={expandedSections.audit}
        onToggle={() => toggleSection('audit')}
      >
        <AuditPanel alertId={currentAlert.id} refreshTrigger={auditRefreshTrigger} hideTitle />
      </CollapsibleSection>
      
      {/* Timestamps - always visible at bottom */}
      <div style={{ ...styles.divider, marginTop: 'var(--space-lg)' }} />
      <div style={styles.row}>
        <div style={styles.col}>
          <div style={styles.section}>
            <div style={styles.label}>Created</div>
            <div style={styles.value}>
              {formatDateTime(currentAlert.createdAt)}
            </div>
          </div>
        </div>
        {currentAlert.updatedAt && (
          <div style={styles.col}>
            <div style={styles.section}>
              <div style={styles.label}>Updated</div>
              <div style={styles.value}>
                {formatDateTime(currentAlert.updatedAt)}
              </div>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
