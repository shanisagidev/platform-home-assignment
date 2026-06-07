import { CSSProperties, useState, useEffect } from 'react';
import { Drawer } from '../common/Drawer';
import { LoadingState } from '../common/LoadingState';
import { policyConfigService, PolicyConfig, getLabel, getDatastoreLabel } from '../../services/policyConfig.service';
import type { 
  Policy, 
  PolicyCreateData, 
  Severity, 
  AssetCategory,
  SupportedAssets,
  RemediationConfig,
} from '../../types/domain';
import { 
  isRemediationEnabled,
} from '../../types/domain';

interface PolicyFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PolicyCreateData) => Promise<void>;
  policy?: Policy | null;
  mode: 'create' | 'edit';
}

const styles: Record<string, CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-lg)',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
    padding: 'var(--space-md)',
    backgroundColor: 'var(--color-bg-tertiary)',
    borderRadius: 'var(--radius-md)',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--color-accent)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 'var(--space-xs)',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    padding: 'var(--space-sm) var(--space-md)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-secondary)',
    color: 'var(--color-text-primary)',
    fontSize: 14,
  },
  textarea: {
    padding: 'var(--space-sm) var(--space-md)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-secondary)',
    color: 'var(--color-text-primary)',
    fontSize: 14,
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: 80,
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
  checkboxGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-sm)',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-xs)',
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
  },
  checkbox: {
    width: 16,
    height: 16,
    cursor: 'pointer',
  },
  nestedSection: {
    marginTop: 'var(--space-sm)',
    marginLeft: 28,
    padding: 'var(--space-sm) var(--space-md)',
    backgroundColor: 'var(--color-bg-secondary)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
  },
  providerRow: {
    marginBottom: 'var(--space-md)',
  },
  providerLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--color-text-primary)',
    cursor: 'pointer',
    marginBottom: 'var(--space-xs)',
  },
  row: {
    display: 'flex',
    gap: 'var(--space-md)',
    alignItems: 'flex-end',
  },
  toggleContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
    height: 38,
  },
  toggle: {
    position: 'relative',
    width: 44,
    height: 24,
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast)',
    border: 'none',
    flexShrink: 0,
  },
  toggleKnob: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 20,
    height: 20,
    borderRadius: '50%',
    backgroundColor: 'white',
    transition: 'left var(--transition-fast)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
  },
  actions: {
    display: 'flex',
    gap: 'var(--space-sm)',
    justifyContent: 'flex-end',
    marginTop: 'var(--space-md)',
    paddingTop: 'var(--space-lg)',
    borderTop: '1px solid var(--color-border)',
  },
  button: {
    padding: 'var(--space-sm) var(--space-lg)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  primaryButton: {
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-bg-primary)',
  },
  secondaryButton: {
    border: '1px solid var(--color-border)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
  },
  error: {
    padding: 'var(--space-sm) var(--space-md)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-critical-bg)',
    color: 'var(--color-critical)',
    fontSize: 13,
  },
  hint: {
    fontSize: 11,
    color: 'var(--color-text-muted)',
    marginTop: 2,
  },
};

export function PolicyFormDrawer({ isOpen, onClose, onSubmit, policy, mode }: PolicyFormDrawerProps) {
  // Config state
  const [config, setConfig] = useState<PolicyConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  
  // Basic fields
  const [name, setName] = useState('');
  const [severity, setSeverity] = useState<Severity>('MEDIUM');
  const [enabled, setEnabled] = useState(true);
  const [description, setDescription] = useState('');
  
  // Supported Assets
  const [assetCategory, setAssetCategory] = useState<AssetCategory>('CLOUD');
  const [selectedCloudProviders, setSelectedCloudProviders] = useState<string[]>([]);
  const [cloudDataStores, setCloudDataStores] = useState<Record<string, string[]>>({});
  const [selectedSaasTools, setSelectedSaasTools] = useState<string[]>([]);
  
  // Violation Type
  const [violationType, setViolationType] = useState<string>('');
  
  // Optional fields
  const [maxRetentionDays, setMaxRetentionDays] = useState<number | ''>('');
  const [dataClassificationCategories, setDataClassificationCategories] = useState<string[]>([]);
  
  // Remediation config
  const [remediationType, setRemediationType] = useState<string>('');
  const [autoRemediate, setAutoRemediate] = useState(false);
  const [remediationPriority, setRemediationPriority] = useState<string>('MEDIUM');
  const [remediationDueValue, setRemediationDueValue] = useState<number>(24);
  const [remediationDueUnit, setRemediationDueUnit] = useState<string>('HOURS');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const data = await policyConfigService.getConfig();
        setConfig(data);
        
        // Initialize cloud data stores map
        const storesMap: Record<string, string[]> = {};
        for (const provider of data.assets.cloudProviders) {
          storesMap[provider] = [];
        }
        setCloudDataStores(storesMap);
        
        // Set default values
        if (data.enums.violationTypes.length > 0) {
          setViolationType(data.enums.violationTypes[0]);
        }
        if (data.enums.remediationPriorities.length > 1) {
          setRemediationPriority(data.enums.remediationPriorities[1]); // MEDIUM
        }
        if (data.enums.remediationDueUnits.length > 1) {
          setRemediationDueUnit(data.enums.remediationDueUnits[1]); // HOURS
        }
      } catch (err) {
        setConfigError(err instanceof Error ? err.message : 'Failed to load configuration');
      } finally {
        setConfigLoading(false);
      }
    };
    
    loadConfig();
  }, []);
  
  // Populate form when editing
  useEffect(() => {
    if (!policy || !config) return;
    
    const def = policy.definition;
    setName(policy.name);
    setSeverity(policy.severity);
    setEnabled(policy.enabled);
    setDescription(policy.description);
    
    // Supported assets
    setAssetCategory(def.supportedAssets.assetCategory);
    if (def.supportedAssets.cloudProviders) {
      setSelectedCloudProviders(def.supportedAssets.cloudProviders.map(cp => cp.provider));
      const storesMap: Record<string, string[]> = {};
      for (const provider of config.assets.cloudProviders) {
        storesMap[provider] = [];
      }
      def.supportedAssets.cloudProviders.forEach(cp => {
        storesMap[cp.provider] = cp.dataStores;
      });
      setCloudDataStores(storesMap);
    }
    setSelectedSaasTools(def.supportedAssets.saasTools || []);
    
    setViolationType(def.violationType);
    setMaxRetentionDays(def.maxRetentionDays || '');
    setDataClassificationCategories(def.dataClassificationCategories || []);
    
    // Remediation
    const rem = def.remediation;
    setRemediationType(rem.remediationType || '');
    setAutoRemediate(rem.autoRemediate);
    setRemediationPriority(rem.remediationPriority || 'MEDIUM');
    setRemediationDueValue(rem.remediationDue?.value || 24);
    setRemediationDueUnit(rem.remediationDue?.unit || 'HOURS');
  }, [policy, config]);
  
  // Reset form when closed
  useEffect(() => {
    if (!isOpen && config) {
      setName('');
      setSeverity('MEDIUM');
      setEnabled(true);
      setDescription('');
      setAssetCategory('CLOUD');
      setSelectedCloudProviders([]);
      const storesMap: Record<string, string[]> = {};
      for (const provider of config.assets.cloudProviders) {
        storesMap[provider] = [];
      }
      setCloudDataStores(storesMap);
      setSelectedSaasTools([]);
      setViolationType(config.enums.violationTypes[0] || '');
      setMaxRetentionDays('');
      setDataClassificationCategories([]);
      setRemediationType('');
      setAutoRemediate(false);
      setRemediationPriority('MEDIUM');
      setRemediationDueValue(24);
      setRemediationDueUnit('HOURS');
      setError(null);
    }
  }, [isOpen, config]);
  
  const toggleCloudProvider = (provider: string) => {
    setSelectedCloudProviders(prev => 
      prev.includes(provider) 
        ? prev.filter(p => p !== provider)
        : [...prev, provider]
    );
  };
  
  const toggleDataStore = (provider: string, store: string) => {
    setCloudDataStores(prev => ({
      ...prev,
      [provider]: prev[provider]?.includes(store)
        ? prev[provider].filter(s => s !== store)
        : [...(prev[provider] || []), store]
    }));
  };
  
  const toggleSaasTool = (tool: string) => {
    setSelectedSaasTools(prev =>
      prev.includes(tool)
        ? prev.filter(t => t !== tool)
        : [...prev, tool]
    );
  };
  
  const toggleDataClassification = (cat: string) => {
    setDataClassificationCategories(prev =>
      prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    );
  };
  
  const handleSubmit = async () => {
    if (!config) return;
    setError(null);
    
    // Validation
    if (!name.trim()) {
      setError('Policy name is required');
      return;
    }
    if (!description.trim()) {
      setError('Description is required');
      return;
    }
    
    // Validate supported assets
    if (assetCategory === 'CLOUD') {
      if (selectedCloudProviders.length === 0) {
        setError('At least one cloud provider must be selected');
        return;
      }
      const hasDataStores = selectedCloudProviders.some(p => (cloudDataStores[p]?.length || 0) > 0);
      if (!hasDataStores) {
        setError('At least one data store must be selected');
        return;
      }
    } else {
      if (selectedSaasTools.length === 0) {
        setError('At least one SaaS tool must be selected');
        return;
      }
    }
    
    // Build supported assets
    const supportedAssets: SupportedAssets = {
      assetCategory,
    };
    
    if (assetCategory === 'CLOUD') {
      supportedAssets.cloudProviders = selectedCloudProviders
        .filter(p => (cloudDataStores[p]?.length || 0) > 0)
        .map(provider => ({
          provider: provider as any,
          dataStores: cloudDataStores[provider] || [],
        }));
    } else {
      supportedAssets.saasTools = selectedSaasTools as any;
    }
    
    // Build remediation config
    const remediation: RemediationConfig = {
      remediationType: remediationType === '' ? null : remediationType as any,
      autoRemediate: remediationType && remediationType !== 'NO_REMEDIATION_AVAILABLE' ? autoRemediate : false,
      remediationPriority: remediationType && remediationType !== 'NO_REMEDIATION_AVAILABLE' ? remediationPriority as any : null,
      remediationDue: remediationType && remediationType !== 'NO_REMEDIATION_AVAILABLE' 
        ? { value: remediationDueValue, unit: remediationDueUnit as any }
        : null,
    };
    
    setIsSubmitting(true);
    
    try {
      await onSubmit({
        name: name.trim(),
        severity,
        enabled,
        description: description.trim(),
        definition: {
          supportedAssets,
          violationType: violationType as any,
          ...(maxRetentionDays !== '' && { maxRetentionDays: Number(maxRetentionDays) }),
          ...(dataClassificationCategories.length > 0 && { dataClassificationCategories: dataClassificationCategories as any }),
          remediation,
        },
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save policy');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const remediationEnabled = isRemediationEnabled(remediationType as any);
  
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Create Policy' : 'Edit Policy'}
      width="560px"
      testId="policy-form-drawer"
    >
      {configLoading ? (
        <LoadingState message="Loading configuration..." />
      ) : configError ? (
        <div style={styles.error}>{configError}</div>
      ) : config ? (
        <div style={styles.form}>
          {error && <div style={styles.error} role="alert">{error}</div>}
          
          {/* Basic Info */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Basic Information</div>
            
            <div style={styles.field}>
              <label htmlFor="drawer-policy-name" style={styles.label}>Name</label>
              <input
                id="drawer-policy-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={styles.input}
                placeholder="Enter policy name"
              />
            </div>
            
            <div style={styles.row}>
              <div style={{ ...styles.field, flex: 1 }}>
                <label htmlFor="drawer-severity" style={styles.label}>Severity</label>
                <select
                  id="drawer-severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as Severity)}
                  style={styles.select}
                >
                  {config.enums.severities.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div style={{ ...styles.toggleContainer, flex: 1 }}>
                <label style={styles.label}>Enabled</label>
                <div style={styles.toggleRow}>
                  <button
                    type="button"
                    style={{
                      ...styles.toggle,
                      backgroundColor: enabled ? 'var(--color-accent)' : 'var(--color-border)',
                    }}
                    onClick={() => setEnabled(!enabled)}
                    role="switch"
                    aria-checked={enabled}
                  >
                    <span style={{
                      ...styles.toggleKnob,
                      left: enabled ? 22 : 2,
                    }} />
                  </button>
                </div>
              </div>
            </div>
            
            <div style={styles.field}>
              <label htmlFor="drawer-description" style={styles.label}>Description</label>
              <textarea
                id="drawer-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={styles.textarea}
                placeholder="Describe what this policy detects..."
              />
            </div>
          </div>
          
          {/* Supported Assets */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Supported Assets</div>
            
            <div style={styles.field}>
              <label htmlFor="drawer-asset-category" style={styles.label}>Asset Category</label>
              <select
                id="drawer-asset-category"
                value={assetCategory}
                onChange={(e) => setAssetCategory(e.target.value as AssetCategory)}
                style={styles.select}
              >
                <option value="CLOUD">Cloud</option>
                <option value="SAAS">SaaS</option>
              </select>
            </div>
            
            {assetCategory === 'CLOUD' && (
              <div style={styles.field}>
                <label style={styles.label}>Cloud Providers & Data Stores</label>
                {config.assets.cloudProviders.map((provider) => (
                  <div key={provider} style={styles.providerRow}>
                    <label style={styles.providerLabel}>
                      <input
                        type="checkbox"
                        checked={selectedCloudProviders.includes(provider)}
                        onChange={() => toggleCloudProvider(provider)}
                        style={styles.checkbox}
                      />
                      {getLabel(config.labels?.cloudProviders, provider)}
                    </label>
                    {selectedCloudProviders.includes(provider) && (
                      <div style={styles.nestedSection}>
                        <div style={styles.checkboxGroup}>
                          {(config.assets.cloudDataStoresByProvider[provider] || []).map((store) => (
                            <label key={store} style={styles.checkboxLabel}>
                              <input
                                type="checkbox"
                                checked={cloudDataStores[provider]?.includes(store) || false}
                                onChange={() => toggleDataStore(provider, store)}
                                style={styles.checkbox}
                              />
                              {getDatastoreLabel(config.labels?.cloudDatastores, provider, store)}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {assetCategory === 'SAAS' && (
              <div style={styles.field}>
                <label style={styles.label}>SaaS Tools</label>
                <div style={styles.checkboxGroup}>
                  {config.assets.saasTools.map((tool) => (
                    <label key={tool} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={selectedSaasTools.includes(tool)}
                        onChange={() => toggleSaasTool(tool)}
                        style={styles.checkbox}
                      />
                      {getLabel(config.labels?.saasTools, tool)}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Violation Type */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Violation Configuration</div>
            
            <div style={styles.field}>
              <label htmlFor="drawer-violation-type" style={styles.label}>Violation Type</label>
              <select
                id="drawer-violation-type"
                value={violationType}
                onChange={(e) => setViolationType(e.target.value)}
                style={styles.select}
              >
                {config.enums.violationTypes.map((type) => (
                  <option key={type} value={type}>
                    {getLabel(config.labels?.violationTypes, type)}
                  </option>
                ))}
              </select>
            </div>
            
            {violationType === 'DATA_RETENTION_EXCEEDED' && (
              <div style={styles.field}>
                <label htmlFor="drawer-max-retention" style={styles.label}>Max Retention Days</label>
                <input
                  id="drawer-max-retention"
                  type="number"
                  value={maxRetentionDays}
                  onChange={(e) => setMaxRetentionDays(e.target.value ? Number(e.target.value) : '')}
                  style={styles.input}
                  placeholder="e.g., 365"
                  min={1}
                />
              </div>
            )}
            
            <div style={styles.field}>
              <label style={styles.label}>Data Classification Categories (Optional)</label>
              <div style={styles.checkboxGroup}>
                {config.enums.dataClassificationCategories.map((cat) => (
                  <label key={cat} style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={dataClassificationCategories.includes(cat)}
                      onChange={() => toggleDataClassification(cat)}
                      style={styles.checkbox}
                    />
                    {getLabel(config.labels?.dataClassificationCategories, cat)}
                  </label>
                ))}
              </div>
            </div>
          </div>
          
          {/* Remediation */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Remediation Configuration</div>
            
            <div style={styles.field}>
              <label htmlFor="drawer-remediation-type" style={styles.label}>Remediation Type (Optional)</label>
              <select
                id="drawer-remediation-type"
                value={remediationType}
                onChange={(e) => setRemediationType(e.target.value)}
                style={styles.select}
              >
                <option value="">None</option>
                {config.enums.remediationTypes.map((type) => (
                  <option key={type} value={type}>
                    {getLabel(config.labels?.remediationTypes, type)}
                  </option>
                ))}
              </select>
              <div style={styles.hint}>Leave empty to disable remediation</div>
            </div>
            
            {remediationEnabled && (
              <>
                <div style={styles.field}>
                  <label style={styles.label}>Auto Remediate</label>
                  <div style={styles.toggleRow}>
                    <button
                      type="button"
                      style={{
                        ...styles.toggle,
                        backgroundColor: autoRemediate ? 'var(--color-accent)' : 'var(--color-border)',
                      }}
                      onClick={() => setAutoRemediate(!autoRemediate)}
                      role="switch"
                      aria-checked={autoRemediate}
                    >
                      <span style={{
                        ...styles.toggleKnob,
                        left: autoRemediate ? 22 : 2,
                      }} />
                    </button>
                  </div>
                </div>
                
                <div style={styles.field}>
                  <label htmlFor="drawer-remediation-priority" style={styles.label}>Remediation Priority</label>
                  <select
                    id="drawer-remediation-priority"
                    value={remediationPriority}
                    onChange={(e) => setRemediationPriority(e.target.value)}
                    style={styles.select}
                  >
                    {config.enums.remediationPriorities.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                
                <div style={styles.field}>
                  <label style={styles.label}>Remediation Due</label>
                  <div style={styles.row}>
                    <input
                      type="number"
                      value={remediationDueValue}
                      onChange={(e) => setRemediationDueValue(Number(e.target.value))}
                      style={{ ...styles.input, flex: 1 }}
                      min={1}
                    />
                    <select
                      value={remediationDueUnit}
                      onChange={(e) => setRemediationDueUnit(e.target.value)}
                      style={{ ...styles.select, flex: 1 }}
                    >
                      {config.enums.remediationDueUnits.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div style={styles.actions}>
            <button
              type="button"
              style={{ ...styles.button, ...styles.secondaryButton }}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              style={{
                ...styles.button,
                ...styles.primaryButton,
                opacity: isSubmitting ? 0.7 : 1,
              }}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Policy' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
