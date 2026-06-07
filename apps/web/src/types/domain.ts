// Domain types matching the API

export interface User {
  id: string;
  displayName: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ==========================================
// CLOUD & SAAS ASSET DEFINITIONS
// ==========================================

export const ASSET_CATEGORIES = ['CLOUD', 'SAAS'] as const;
export type AssetCategory = typeof ASSET_CATEGORIES[number];

export const CLOUD_PROVIDERS = ['AWS', 'GCP', 'AZURE'] as const;
export type CloudProvider = typeof CLOUD_PROVIDERS[number];

export const AWS_DATA_STORES = ['S3', 'RDS', 'DYNAMODB', 'API_GATEWAY', 'CLOUDWATCH'] as const;
export const GCP_DATA_STORES = ['GCS', 'BIGQUERY', 'CLOUDSQL', 'PUBSUB', 'CLOUDLOGGING'] as const;
export const AZURE_DATA_STORES = ['BLOB_STORAGE', 'SQL_DATABASE', 'COSMOS_DB', 'API_MANAGEMENT', 'MONITOR'] as const;

export const CLOUD_DATA_STORES: Record<CloudProvider, readonly string[]> = {
  AWS: AWS_DATA_STORES,
  GCP: GCP_DATA_STORES,
  AZURE: AZURE_DATA_STORES,
};

export const SAAS_TOOLS = ['JIRA', 'SERVICENOW', 'GITHUB', 'SNOWFLAKE', 'GRAFANA'] as const;
export type SaasTool = typeof SAAS_TOOLS[number];

// NOTE: Display labels for assets are fetched from /api/policy-config
// Use policyConfigService.getConfig().labels for UI display

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

// ==========================================
// DATA CLASSIFICATION
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
// POLICY DEFINITION
// ==========================================

export interface PolicyDefinition {
  supportedAssets: SupportedAssets;
  violationType: ViolationType;
  maxRetentionDays?: number;
  dataClassificationCategories?: DataClassificationCategory[];
  remediation: RemediationConfig;
}

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

export interface PolicyCreateData {
  name: string;
  severity: Severity;
  enabled: boolean;
  description: string;
  definition: PolicyDefinition;
}

export interface PolicyUpdateData {
  name?: string;
  severity?: Severity;
  enabled?: boolean;
  description?: string;
  definition?: PolicyDefinition;
}

// Helper function
export function isRemediationEnabled(config: RemediationConfig): boolean {
  return config.remediationType !== null && 
         config.remediationType !== 'NO_REMEDIATION_AVAILABLE';
}

// ==========================================
// SCAN & ALERTS
// ==========================================

export interface ScanRun {
  id: string;
  status: 'RUNNING' | 'COMPLETED';
  startedAt: string;
  completedAt?: string;
  scannedAssetsCount: number;
  alertsCreatedCount: number;
}

export interface Asset {
  id: string;
  type: string;
  location: string;
  metadata: Record<string, unknown>;
}

export interface AlertRemediation {
  type: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dueDate?: string;
  autoRemediate: boolean;
  note?: string;
}

export interface PolicySnapshot {
  violationType: string;
  supportedAssets: {
    assetCategory: 'CLOUD' | 'SAAS';
    cloudProviders?: Array<{ provider: string; dataStores: string[] }>;
    saasTools?: string[];
  };
  remediationType: string | null;
  autoRemediate: boolean;
  remediationPriority: string | null;
  remediationDue: { value: number; unit: string } | null;
}

export interface Assignee {
  id: string;
  name: string;
  email?: string;
}

export interface AlertComment {
  id: string;
  author: { id: string; name: string };
  message: string;
  createdAt: string;
}

// New alert statuses per requirements
// Note: REMEDIATED_WAITING_FOR_USER_VERIFICATION has been removed
export type AlertStatus = 
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'REMEDIATION_IN_PROGRESS'
  | 'REMEDIATED_WAITING_FOR_CUSTOMER'
  | 'RESOLVED'
  | 'REOPEN';

// Display labels for statuses (fallback - prefer labels from API config)
export const STATUS_LABELS: Record<AlertStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  REMEDIATION_IN_PROGRESS: 'Remediation In Progress',
  REMEDIATED_WAITING_FOR_CUSTOMER: 'Awaiting User Verification',
  RESOLVED: 'Resolved',
  REOPEN: 'Reopened',
};

// Legacy status label for audit trail display (historical records may contain this)
export const LEGACY_STATUS_LABELS: Record<string, string> = {
  REMEDIATED_WAITING_FOR_USER_VERIFICATION: 'Awaiting Scanning Verification (Legacy)',
};

export const ALL_ALERT_STATUSES: AlertStatus[] = [
  'OPEN', 'IN_PROGRESS', 'REMEDIATION_IN_PROGRESS', 
  'REMEDIATED_WAITING_FOR_CUSTOMER',
  'RESOLVED', 'REOPEN'
];

// Valid status transitions per current status
// REOPEN behaves like OPEN
export const VALID_TRANSITIONS: Record<AlertStatus, AlertStatus[]> = {
  OPEN: ['IN_PROGRESS'],  // REMEDIATION_IN_PROGRESS only via remediate action
  REOPEN: ['IN_PROGRESS'],  // Same as OPEN
  IN_PROGRESS: ['RESOLVED'],  // REMEDIATION_IN_PROGRESS only via remediate action
  REMEDIATION_IN_PROGRESS: [],  // System-only transitions
  REMEDIATED_WAITING_FOR_CUSTOMER: ['RESOLVED', 'REOPEN'],
  RESOLVED: ['REOPEN'],
};

// Remediation origin - tracks how remediation was initiated
export type RemediationOrigin = 'AUTO' | 'MANUAL' | 'NONE';

// Statuses from which user can trigger remediate action
export const REMEDIATABLE_STATUSES: AlertStatus[] = ['IN_PROGRESS'];

// Statuses that users can manually select/transition TO in the dropdown
// System-only statuses are excluded:
// - REMEDIATION_IN_PROGRESS: Set by scanning engine or when user presses remediate button
// - REMEDIATED_WAITING_FOR_CUSTOMER: Set by remediation engine after remediation completes
export const USER_SELECTABLE_STATUSES: AlertStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'REOPEN'];

export const TERMINAL_STATUSES: AlertStatus[] = ['RESOLVED'];

// Typed asset context types
export type DataStoreType = 
  | 'S3' | 'RDS' | 'DYNAMODB' | 'API_GATEWAY' | 'CLOUDWATCH'  // AWS
  | 'GCS' | 'BIGQUERY' | 'CLOUDSQL' | 'PUBSUB' | 'CLOUDLOGGING'  // GCP
  | 'BLOB_STORAGE' | 'SQL_DATABASE' | 'COSMOS_DB' | 'API_MANAGEMENT' | 'MONITOR';  // Azure

// Structured Evidence for Alerts
export interface AlertEvidence {
  // Identity
  policyId: string;
  policyName: string;
  assetId: string;
  assetDisplayName: string;
  
  // Detection context
  violationType: ViolationType;
  detectedAt: string;
  riskScore: number;
  
  // Asset context snapshot
  assetContext: {
    category: AssetCategory;
    cloudProvider?: CloudProvider | null;
    dataStoreType?: DataStoreType | null;
    saasTool?: SaasTool | null;
    location: string;
    accountId?: string;
  };
  
  // Findings breakdown
  findings: {
    scannedObjectsCount: number;
    matchedObjectsCount: number;
    matchedByType: Record<string, number>;  // e.g., { "csv": 5, "json": 3 }
    sampleItems?: string[];  // Up to 5 sample file/object paths
  };
  
  // Re-detection tracking
  redetectedFrom?: string;  // Original alert ID if re-detected
  redetectedAt?: string;
  
  // Raw data for debugging (legacy compatibility)
  [key: string]: unknown;
}

export interface Alert {
  id: string;
  runId: string;
  policyId: string;
  policyName: string;
  severity: Severity;
  status: AlertStatus;
  wasRemediated: boolean;  // Tracks if alert ever went through remediation
  
  // Remediation tracking fields
  remediationOrigin: RemediationOrigin;  // How remediation was initiated (AUTO/MANUAL/NONE)
  createdSeverity: Severity;  // Original severity at creation time
  
  // Typed asset context fields
  violationType: ViolationType;
  assetCategory: AssetCategory;
  cloudProvider: CloudProvider | null;
  dataStoreType: DataStoreType | null;
  saasTool: SaasTool | null;
  assetDisplayName: string;
  assetLocation: string;
  assetId?: string;
  accountId?: string;
  
  // Legacy fields
  asset: Asset;
  description: string;
  evidence: AlertEvidence;
  remediation?: AlertRemediation;
  policySnapshot?: PolicySnapshot;
  assignedTo?: Assignee | null;
  comments: AlertComment[];
  createdAt: string;
  updatedAt?: string;
  statusUpdatedAt?: string;
  // API may include these for convenience
  validTransitions?: AlertStatus[];
  canRemediate?: boolean;
}

// Audit trail types
export type AuditActorType = 'USER' | 'SYSTEM';
export type AuditSource = 'UI' | 'SCAN' | 'SYSTEM';

export interface AlertAuditEvent {
  id: string;
  alertId: string;
  field: 'status' | 'severity' | 'assignee';
  fromValue: string;
  toValue: string;
  actorType: AuditActorType;
  actorName: string;
  source: AuditSource;
  createdAt: string;
}
