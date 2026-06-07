import { apiClient } from './apiClient';

export interface PolicyConfigLabels {
  cloudProviders: Record<string, string>;
  cloudDatastores: Record<string, Record<string, string>>;
  saasTools: Record<string, string>;
  violationTypes: Record<string, string>;
  severities: Record<string, string>;
  remediationTypes: Record<string, string>;
  dataClassificationCategories: Record<string, string>;
  remediationPriorities: Record<string, string>;
  remediationDueUnits: Record<string, string>;
  alertStatuses: Record<string, string>;
}

export interface PolicyConfig {
  assets: {
    cloudProviders: string[];
    cloudDataStoresByProvider: Record<string, string[]>;
    saasTools: string[];
  };
  enums: {
    violationTypes: string[];
    severities: string[];
    dataClassificationCategories: string[];
    remediationTypes: string[];
    remediationPriorities: string[];
    remediationDueUnits: string[];
    alertStatuses: string[];
  };
  labels: PolicyConfigLabels;
}

// Legacy status labels for audit trail display (historical records may contain these)
const LEGACY_STATUS_LABELS: Record<string, string> = {
  REMEDIATED_WAITING_FOR_USER_VERIFICATION: 'Awaiting Scanning Verification (Legacy)',
};

// Helper to get label with fallback to raw key
export function getLabel(labels: Record<string, string> | undefined, key: string | null | undefined): string {
  if (!key) return 'N/A';
  // Check legacy labels first (for audit trail)
  if (LEGACY_STATUS_LABELS[key]) return LEGACY_STATUS_LABELS[key];
  return labels?.[key] || key.replace(/_/g, ' ');
}

// Helper to get datastore label with fallback
export function getDatastoreLabel(
  labels: Record<string, Record<string, string>> | undefined,
  provider: string | null | undefined,
  datastore: string | null | undefined
): string {
  if (!datastore) return 'N/A';
  if (!provider) return datastore.replace(/_/g, ' ');
  return labels?.[provider]?.[datastore] || datastore.replace(/_/g, ' ');
}

// In-memory cache for the session
let cachedConfig: PolicyConfig | null = null;

export const policyConfigService = {
  async getConfig(): Promise<PolicyConfig> {
    // Return cached config if available
    if (cachedConfig) {
      return cachedConfig;
    }

    const response = await apiClient.get<PolicyConfig>('/policy-config');
    cachedConfig = response;
    return response;
  },

  // Clear cache (useful for testing or when config might change)
  clearCache(): void {
    cachedConfig = null;
  },
};
