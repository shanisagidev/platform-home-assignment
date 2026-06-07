import { CSSProperties, useState, useEffect } from 'react';
import { Drawer } from '../common/Drawer';
import type { Policy } from '../../types/domain';
import { isRemediationEnabled } from '../../types/domain';
import { policyConfigService, PolicyConfigLabels, getLabel, getDatastoreLabel } from '../../services/policyConfig.service';
import { formatDateTime } from '../../utils/dateFormat';

interface PolicyDetailsDrawerProps {
  policy: Policy | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (policy: Policy) => void;
  onDelete: (policy: Policy) => void;
}

const styles: Record<string, CSSProperties> = {
  actions: {
    display: 'flex',
    gap: 'var(--space-sm)',
    marginBottom: 'var(--space-lg)',
  },
  button: {
    padding: 'var(--space-sm) var(--space-md)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
  },
  editButton: {
    borderColor: 'var(--color-accent)',
    color: 'var(--color-accent)',
  },
  deleteButton: {
    borderColor: 'var(--color-critical)',
    color: 'var(--color-critical)',
  },
  section: {
    marginBottom: 'var(--space-lg)',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--color-accent)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 'var(--space-md)',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: 'var(--space-xs)',
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
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-xs)',
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 11,
    fontWeight: 500,
    backgroundColor: 'var(--color-bg-tertiary)',
    color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-border)',
  },
  divider: {
    height: 1,
    backgroundColor: 'var(--color-border)',
    margin: 'var(--space-lg) 0',
  },
  row: {
    display: 'flex',
    gap: 'var(--space-lg)',
    marginBottom: 'var(--space-md)',
  },
  col: {
    flex: 1,
  },
  providerGroup: {
    marginBottom: 'var(--space-sm)',
  },
  providerName: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginBottom: 'var(--space-xs)',
  },
};

const severityStyles: Record<string, CSSProperties> = {
  CRITICAL: { backgroundColor: 'var(--color-critical-bg)', color: 'var(--color-critical)' },
  HIGH: { backgroundColor: 'var(--color-high-bg)', color: 'var(--color-high)' },
  MEDIUM: { backgroundColor: 'var(--color-medium-bg)', color: 'var(--color-medium)' },
  LOW: { backgroundColor: 'var(--color-low-bg)', color: 'var(--color-low)' },
};

export function PolicyDetailsDrawer({ 
  policy, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete 
}: PolicyDetailsDrawerProps) {
  const [configLabels, setConfigLabels] = useState<PolicyConfigLabels | null>(null);
  
  // Fetch config labels on mount
  useEffect(() => {
    policyConfigService.getConfig()
      .then(config => setConfigLabels(config.labels))
      .catch(console.error);
  }, []);
  
  if (!policy) return null;
  
  const def = policy.definition;
  const remConfig = def.remediation;
  const remEnabled = remConfig && isRemediationEnabled(remConfig);
  
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Policy Details" width="540px" testId="policy-details-drawer">
      {/* Action buttons */}
      <div style={styles.actions}>
        <button
          style={{ ...styles.button, ...styles.editButton }}
          onClick={() => onEdit(policy)}
          aria-label="Edit policy"
        >
          Edit
        </button>
        {!policy.isSystemPolicy && (
          <button
            style={{ ...styles.button, ...styles.deleteButton }}
            onClick={() => onDelete(policy)}
            aria-label="Delete policy"
          >
            Delete
          </button>
        )}
      </div>
      
      {/* Basic Info */}
      <div style={styles.section}>
        <div style={styles.label}>Policy Name</div>
        <div style={styles.value}>{policy.name}</div>
      </div>
      
      <div style={styles.row}>
        <div style={styles.col}>
          <div style={styles.label}>Severity</div>
          <span style={{ ...styles.badge, ...severityStyles[policy.severity] }}>
            {policy.severity}
          </span>
        </div>
        <div style={styles.col}>
          <div style={styles.label}>Status</div>
          <span
            style={{
              ...styles.badge,
              backgroundColor: policy.enabled ? 'var(--color-accent-muted)' : 'var(--color-bg-tertiary)',
              color: policy.enabled ? 'var(--color-accent)' : 'var(--color-text-muted)',
            }}
          >
            {policy.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <div style={styles.col}>
          <div style={styles.label}>Type</div>
          <span
            style={{
              ...styles.badge,
              backgroundColor: policy.isSystemPolicy ? 'var(--color-low-bg)' : 'var(--color-medium-bg)',
              color: policy.isSystemPolicy ? 'var(--color-low)' : 'var(--color-medium)',
            }}
          >
            {policy.isSystemPolicy ? 'System' : 'Custom'}
          </span>
        </div>
      </div>
      
      <div style={styles.section}>
        <div style={styles.label}>Description</div>
        <div style={styles.value}>{policy.description}</div>
      </div>
      
      <div style={styles.divider} />
      
      {/* Supported Assets */}
      <div style={styles.sectionTitle}>Supported Assets</div>
      
      <div style={styles.section}>
        <div style={styles.label}>Asset Category</div>
        <span style={styles.tag}>{def.supportedAssets.assetCategory}</span>
      </div>
      
      {def.supportedAssets.assetCategory === 'CLOUD' && def.supportedAssets.cloudProviders && (
        <div style={styles.section}>
          <div style={styles.label}>Cloud Providers & Data Stores</div>
          {def.supportedAssets.cloudProviders.map((cp) => (
            <div key={cp.provider} style={styles.providerGroup}>
              <div style={styles.providerName}>{getLabel(configLabels?.cloudProviders, cp.provider)}</div>
              <div style={styles.tagList}>
                {cp.dataStores.map((ds) => (
                  <span key={ds} style={styles.tag}>{getDatastoreLabel(configLabels?.cloudDatastores, cp.provider, ds)}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {def.supportedAssets.assetCategory === 'SAAS' && def.supportedAssets.saasTools && (
        <div style={styles.section}>
          <div style={styles.label}>SaaS Tools</div>
          <div style={styles.tagList}>
            {def.supportedAssets.saasTools.map((tool) => (
              <span key={tool} style={styles.tag}>{getLabel(configLabels?.saasTools, tool)}</span>
            ))}
          </div>
        </div>
      )}
      
      <div style={styles.divider} />
      
      {/* Violation Configuration */}
      <div style={styles.sectionTitle}>Violation Configuration</div>
      
      <div style={styles.section}>
        <div style={styles.label}>Violation Type</div>
        <span style={{ ...styles.badge, backgroundColor: 'var(--color-critical-bg)', color: 'var(--color-critical)' }}>
          {getLabel(configLabels?.violationTypes, def.violationType)}
        </span>
      </div>
      
      {def.maxRetentionDays && (
        <div style={styles.section}>
          <div style={styles.label}>Max Retention Days</div>
          <div style={styles.value}>{def.maxRetentionDays}</div>
        </div>
      )}
      
      {def.dataClassificationCategories && def.dataClassificationCategories.length > 0 && (
        <div style={styles.section}>
          <div style={styles.label}>Data Classification Categories</div>
          <div style={styles.tagList}>
            {def.dataClassificationCategories.map((cat) => (
              <span key={cat} style={styles.tag}>{getLabel(configLabels?.dataClassificationCategories, cat)}</span>
            ))}
          </div>
        </div>
      )}
      
      <div style={styles.divider} />
      
      {/* Remediation */}
      <div style={styles.sectionTitle}>Remediation Configuration</div>
      
      <div style={styles.section}>
        <div style={styles.label}>Remediation Type</div>
        <span
          style={{
            ...styles.badge,
            backgroundColor: remEnabled ? 'var(--color-accent-muted)' : 'var(--color-bg-tertiary)',
            color: remEnabled ? 'var(--color-accent)' : 'var(--color-text-muted)',
          }}
        >
          {remConfig?.remediationType 
            ? getLabel(configLabels?.remediationTypes, remConfig.remediationType)
            : 'None'}
        </span>
      </div>
      
      {remEnabled && (
        <>
          <div style={styles.row}>
            <div style={styles.col}>
              <div style={styles.label}>Auto Remediate</div>
              <span
                style={{
                  ...styles.badge,
                  backgroundColor: remConfig?.autoRemediate ? 'var(--color-accent-muted)' : 'var(--color-bg-tertiary)',
                  color: remConfig?.autoRemediate ? 'var(--color-accent)' : 'var(--color-text-muted)',
                }}
              >
                {remConfig?.autoRemediate ? 'On' : 'Off'}
              </span>
            </div>
            <div style={styles.col}>
              <div style={styles.label}>Priority</div>
              <span style={{ ...styles.badge, backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                {remConfig?.remediationPriority || 'N/A'}
              </span>
            </div>
          </div>
          
          {remConfig?.remediationDue && (
            <div style={styles.section}>
              <div style={styles.label}>Remediation Due</div>
              <div style={styles.value}>
                {remConfig.remediationDue.value} {remConfig.remediationDue.unit}
              </div>
            </div>
          )}
        </>
      )}
      
      <div style={styles.divider} />
      
      {/* Timestamps */}
      <div style={styles.row}>
        <div style={styles.col}>
          <div style={styles.label}>Created</div>
          <div style={styles.value}>
            {formatDateTime(policy.createdAt)}
          </div>
        </div>
        {policy.updatedAt && (
          <div style={styles.col}>
            <div style={styles.label}>Updated</div>
            <div style={styles.value}>
              {formatDateTime(policy.updatedAt)}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
