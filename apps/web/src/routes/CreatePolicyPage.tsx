import { CSSProperties, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { policiesService } from '../services/policies.service';
import { policyConfigService, PolicyConfig, getLabel, getDatastoreLabel } from '../services/policyConfig.service';
import { useToast } from '../context/ToastContext';
import { LoadingState } from '../components/common/LoadingState';
import type { 
  Severity, 
  AssetCategory, 
  SupportedAssets,
  RemediationConfig,
} from '../types/domain';

const styles: Record<string, CSSProperties> = {
  container: {
    maxWidth: 720,
    margin: '0 auto',
  },
  header: {
    marginBottom: 'var(--space-xl)',
  },
  title: {
    fontSize: 28,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginBottom: 'var(--space-xs)',
  },
  subtitle: {
    fontSize: 14,
    color: 'var(--color-text-secondary)',
  },
  form: {
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-xl)',
  },
  section: {
    marginBottom: 'var(--space-lg)',
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
    marginBottom: 'var(--space-md)',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
    marginBottom: 'var(--space-md)',
  },
  row: {
    display: 'flex',
    gap: 'var(--space-lg)',
  },
  col: {
    flex: 1,
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
    marginTop: 'var(--space-xl)',
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
    marginBottom: 'var(--space-lg)',
  },
  hint: {
    fontSize: 11,
    color: 'var(--color-text-muted)',
    marginTop: 2,
  },
};

export function CreatePolicyPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
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
        
        // Initialize default values from config
        if (data.enums.violationTypes.length > 0) {
          setViolationType(data.enums.violationTypes[0]);
        }
        if (data.enums.remediationPriorities.length > 0) {
          setRemediationPriority(data.enums.remediationPriorities[1] || data.enums.remediationPriorities[0]); // Default to MEDIUM
        }
        if (data.enums.remediationDueUnits.length > 0) {
          setRemediationDueUnit(data.enums.remediationDueUnits[1] || data.enums.remediationDueUnits[0]); // Default to HOURS
        }
        
        // Initialize cloud data stores map
        const storesMap: Record<string, string[]> = {};
        for (const provider of data.assets.cloudProviders) {
          storesMap[provider] = [];
        }
        setCloudDataStores(storesMap);
      } catch (err) {
        setConfigError(err instanceof Error ? err.message : 'Failed to load policy configuration');
      } finally {
        setConfigLoading(false);
      }
    };
    
    loadConfig();
  }, []);
  
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
  
  const handleCancel = () => {
    navigate('/policies');
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
        setError('At least one data store must be selected for each cloud provider');
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
      await policiesService.create({
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
      showToast({ type: 'success', title: 'Policy created', message: 'New policy added successfully' });
      navigate('/policies');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create policy');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (configLoading) {
    return <LoadingState message="Loading configuration..." />;
  }
  
  if (configError || !config) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          {configError || 'Failed to load policy configuration. Please try again.'}
        </div>
        <button
          type="button"
          style={{ ...styles.button, ...styles.secondaryButton }}
          onClick={handleCancel}
        >
          Back to Policies
        </button>
      </div>
    );
  }
  
  const remediationEnabled = remediationType !== '' && remediationType !== 'NO_REMEDIATION_AVAILABLE';
  
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Create Policy</h1>
        <p style={styles.subtitle}>
          Define a new security policy for your organization
        </p>
      </header>
      
      <div style={styles.form}>
        {error && <div style={styles.error} role="alert">{error}</div>}
        
        {/* Basic Info */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Basic Information</div>
          
          <div style={styles.field}>
            <label htmlFor="policy-name" style={styles.label}>Name</label>
            <input
              id="policy-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
              placeholder="Enter policy name"
            />
          </div>
          
          <div style={styles.row}>
            <div style={styles.col}>
              <div style={styles.field}>
                <label htmlFor="policy-severity" style={styles.label}>Severity</label>
                <select
                  id="policy-severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as Severity)}
                  style={styles.select}
                >
                  {config.enums.severities.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={styles.col}>
              <div style={styles.toggleContainer}>
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
          </div>
          
          <div style={styles.field}>
            <label htmlFor="policy-description" style={styles.label}>Description</label>
            <textarea
              id="policy-description"
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
            <label htmlFor="asset-category" style={styles.label}>Asset Category</label>
            <select
              id="asset-category"
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
            <label htmlFor="violation-type" style={styles.label}>Violation Type</label>
            <select
              id="violation-type"
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
              <label htmlFor="max-retention" style={styles.label}>Max Retention Days</label>
              <input
                id="max-retention"
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
            <label htmlFor="remediation-type" style={styles.label}>Remediation Type (Optional)</label>
            <select
              id="remediation-type"
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
            <div style={styles.hint}>Leave empty to disable remediation for this policy</div>
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
                <label htmlFor="remediation-priority" style={styles.label}>Remediation Priority</label>
                <select
                  id="remediation-priority"
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
            onClick={handleCancel}
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
            {isSubmitting ? 'Creating...' : 'Create Policy'}
          </button>
        </div>
      </div>
    </div>
  );
}
