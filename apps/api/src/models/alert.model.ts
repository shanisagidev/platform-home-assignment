// Legacy Asset interface (kept for backward compatibility with evidence)
export interface Asset {
  id: string;
  type: string;
  location: string;
  metadata: Record<string, unknown>;
}

// Asset category enum
export type AssetCategory = 'CLOUD' | 'SAAS';

// Cloud providers
export type CloudProvider = 'AWS' | 'GCP' | 'AZURE';

// Data store types
export type DataStoreType = 
  | 'S3' | 'RDS' | 'DYNAMODB' | 'API_GATEWAY' | 'CLOUDWATCH'  // AWS
  | 'GCS' | 'BIGQUERY' | 'CLOUDSQL' | 'PUBSUB' | 'CLOUDLOGGING'  // GCP
  | 'BLOB_STORAGE' | 'SQL_DATABASE' | 'COSMOS_DB' | 'API_MANAGEMENT' | 'MONITOR';  // Azure

// SaaS tools
export type SaasTool = 'JIRA' | 'SERVICENOW' | 'GITHUB' | 'SNOWFLAKE' | 'GRAFANA';

export interface AlertRemediation {
  type: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dueDate?: string;
  autoRemediate: boolean;
  note?: string;
}

// Policy snapshot captured at alert creation time
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
// Both auto and manual remediation now complete to REMEDIATED_WAITING_FOR_CUSTOMER
export type AlertStatus = 
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'REMEDIATION_IN_PROGRESS'
  | 'REMEDIATED_WAITING_FOR_CUSTOMER'
  | 'RESOLVED'
  | 'REOPEN';

// Display labels for statuses
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

// Terminal statuses (but RESOLVED can go to REOPEN)
export const TERMINAL_STATUSES: AlertStatus[] = ['RESOLVED'];

// All statuses
export const ALL_STATUSES: AlertStatus[] = [
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

// Violation types
export type ViolationType = 
  | 'PUBLIC_ACCESS'
  | 'UNENCRYPTED_DATA'
  | 'OVERLY_PERMISSIVE_ACCESS'
  | 'DATA_RETENTION_EXCEEDED'
  | 'MISSING_CLASSIFICATION'
  | 'SENSITIVE_DATA_EXPOSED';

export interface Alert {
  id: string;
  runId: string;
  policyId: string;
  policyName: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: AlertStatus;
  wasRemediated: boolean;  // Tracks if alert ever went through remediation
  
  // Remediation tracking fields
  remediationOrigin: RemediationOrigin;  // How remediation was initiated (AUTO/MANUAL/NONE)
  createdSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';  // Original severity at creation time
  
  // Typed asset context fields (required)
  violationType: ViolationType;
  assetCategory: AssetCategory;
  cloudProvider: CloudProvider | null;  // null if assetCategory=SAAS
  dataStoreType: DataStoreType | null;  // null if assetCategory=SAAS
  saasTool: SaasTool | null;            // null if assetCategory=CLOUD
  assetDisplayName: string;              // human-readable identifier
  assetLocation: string;                 // e.g. "us-east-1/my-bucket"
  
  // Optional typed fields
  assetId?: string;
  accountId?: string;
  
  // Legacy fields (kept for evidence/additional data)
  asset: Asset;  // @deprecated - use typed fields above
  description: string;
  evidence: Record<string, unknown>;
  remediation?: AlertRemediation;
  policySnapshot?: PolicySnapshot;
  assignedTo?: Assignee | null;
  comments: AlertComment[];
  createdAt: string;
  updatedAt?: string;
  statusUpdatedAt?: string;
}
