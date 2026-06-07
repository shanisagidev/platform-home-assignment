// ==========================================
// CLOUD & SAAS ASSET DEFINITIONS
// ==========================================

export const ASSET_CATEGORIES = ['CLOUD', 'SAAS'] as const;
export type AssetCategory = typeof ASSET_CATEGORIES[number];

export const CLOUD_PROVIDERS = ['AWS', 'GCP', 'AZURE'] as const;
export type CloudProvider = typeof CLOUD_PROVIDERS[number];

// Data stores per cloud provider
export const AWS_DATA_STORES = ['S3', 'RDS', 'DYNAMODB', 'API_GATEWAY', 'CLOUDWATCH'] as const;
export const GCP_DATA_STORES = ['GCS', 'BIGQUERY', 'CLOUDSQL', 'PUBSUB', 'CLOUDLOGGING'] as const;
export const AZURE_DATA_STORES = ['BLOB_STORAGE', 'SQL_DATABASE', 'COSMOS_DB', 'API_MANAGEMENT', 'MONITOR'] as const;

export type AwsDataStore = typeof AWS_DATA_STORES[number];
export type GcpDataStore = typeof GCP_DATA_STORES[number];
export type AzureDataStore = typeof AZURE_DATA_STORES[number];
export type DataStore = AwsDataStore | GcpDataStore | AzureDataStore;

export const CLOUD_DATA_STORES: Record<CloudProvider, readonly string[]> = {
  AWS: AWS_DATA_STORES,
  GCP: GCP_DATA_STORES,
  AZURE: AZURE_DATA_STORES,
};

export const SAAS_TOOLS = ['JIRA', 'SERVICENOW', 'GITHUB', 'SNOWFLAKE', 'GRAFANA'] as const;
export type SaasTool = typeof SAAS_TOOLS[number];

// Supported assets structure
export interface CloudAssetSelection {
  provider: CloudProvider;
  dataStores: string[];
}

export interface SupportedAssets {
  assetCategory: AssetCategory;
  cloudProviders?: CloudAssetSelection[];
  saasTools?: SaasTool[];
}

// ==========================================
// VIOLATION TYPES
// ==========================================

export const VIOLATION_TYPES = [
  'PUBLIC_ACCESS',
  'UNENCRYPTED_DATA',
  'OVERLY_PERMISSIVE_ACCESS',
  'DATA_RETENTION_EXCEEDED',
  'MISSING_CLASSIFICATION',
  'SENSITIVE_DATA_EXPOSED',
] as const;

export type ViolationType = typeof VIOLATION_TYPES[number];

export const VIOLATION_TYPE_LABELS: Record<ViolationType, string> = {
  PUBLIC_ACCESS: 'Public Access',
  UNENCRYPTED_DATA: 'Unencrypted Data',
  OVERLY_PERMISSIVE_ACCESS: 'Overly Permissive Access',
  DATA_RETENTION_EXCEEDED: 'Data Retention Exceeded',
  MISSING_CLASSIFICATION: 'Missing Classification',
  SENSITIVE_DATA_EXPOSED: 'Sensitive Data Exposed',
};

// ==========================================
// DATA CLASSIFICATION CATEGORIES
// ==========================================

export const DATA_CLASSIFICATION_CATEGORIES = ['USER_DATA', 'LOGS', 'ANALYTICS'] as const;
export type DataClassificationCategory = typeof DATA_CLASSIFICATION_CATEGORIES[number];

// ==========================================
// REMEDIATION CONFIGURATION
// ==========================================

export const REMEDIATION_TYPES = [
  'NO_REMEDIATION_AVAILABLE',
  'ENABLE_ENCRYPTION',
  'DISABLE_PUBLIC_ACCESS',
  'RESTRICT_ACCESS',
  'ADD_REQUIRED_TAG',
  'ROTATE_CREDENTIALS',
  'MOVE_TO_SECURE_LOCATION',
] as const;

export type RemediationType = typeof REMEDIATION_TYPES[number];

export const REMEDIATION_TYPE_LABELS: Record<RemediationType, string> = {
  NO_REMEDIATION_AVAILABLE: 'No Remediation Available',
  ENABLE_ENCRYPTION: 'Enable Encryption',
  DISABLE_PUBLIC_ACCESS: 'Disable Public Access',
  RESTRICT_ACCESS: 'Restrict Access',
  ADD_REQUIRED_TAG: 'Add Required Tag',
  ROTATE_CREDENTIALS: 'Rotate Credentials',
  MOVE_TO_SECURE_LOCATION: 'Move to Secure Location',
};

export const REMEDIATION_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type RemediationPriority = typeof REMEDIATION_PRIORITIES[number];

export const REMEDIATION_DUE_UNITS = ['MINUTES', 'HOURS', 'DAYS'] as const;
export type RemediationDueUnit = typeof REMEDIATION_DUE_UNITS[number];

export interface RemediationDue {
  value: number;
  unit: RemediationDueUnit;
}

export interface RemediationConfig {
  remediationType: RemediationType | null;
  autoRemediate: boolean;
  remediationPriority: RemediationPriority | null;
  remediationDue: RemediationDue | null;
}

// ==========================================
// POLICY DEFINITION (STRUCTURED)
// ==========================================

export interface PolicyDefinition {
  // Supported assets selection
  supportedAssets: SupportedAssets;
  
  // Violation type (required)
  violationType: ViolationType;
  
  // Optional fields
  maxRetentionDays?: number;
  dataClassificationCategories?: DataClassificationCategory[];
  
  // Remediation configuration
  remediation: RemediationConfig;
}

// ==========================================
// POLICY MODEL
// ==========================================

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Policy {
  id: string;
  name: string;
  severity: Severity;
  enabled: boolean;
  description: string;
  definition: PolicyDefinition;
  isSystemPolicy: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Helper function to check if remediation is enabled
export function isRemediationEnabled(config: RemediationConfig): boolean {
  return config.remediationType !== null && 
         config.remediationType !== 'NO_REMEDIATION_AVAILABLE';
}

// Helper to convert remediation due to hours (for backward compat)
export function remediationDueToHours(due: RemediationDue | null): number | undefined {
  if (!due) return undefined;
  switch (due.unit) {
    case 'MINUTES': return due.value / 60;
    case 'HOURS': return due.value;
    case 'DAYS': return due.value * 24;
  }
}
