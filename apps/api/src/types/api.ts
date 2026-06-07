// API Request/Response types
import type { PolicyDefinition } from '../models/policy.model.js';
import type { AlertStatus } from '../models/alert.model.js';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    displayName: string;
    role: string;
  };
}

export interface ErrorResponse {
  error: string;
}

export interface PolicyUpdateRequest {
  name?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  enabled?: boolean;
  description?: string;
  definition?: PolicyDefinition;
}

export interface PolicyCreateRequest {
  name: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  enabled: boolean;
  description: string;
  definition: PolicyDefinition;
}

export interface AlertStatusUpdateRequest {
  status: AlertStatus;
}

export interface AlertUpdateRequest {
  status?: AlertStatus;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedToId?: string | null;
}

export interface AddCommentRequest {
  message: string;
}

export interface RemediateAlertRequest {
  note?: string;
}

// Database row types
export interface UserRow {
  id: string;
  username: string;
  display_name: string;
  password: string;
  role: string;
  created_at: string;
}

export interface PolicyRow {
  id: string;
  name: string;
  severity: string;
  enabled: number;
  description: string;
  definition: string; // JSON string containing PolicyDefinition
  is_system_policy: number;
  created_at: string;
  updated_at: string | null;
}

export interface ScanRunRow {
  id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  scanned_assets_count: number;
  alerts_created_count: number;
}

export interface AlertRow {
  id: string;
  run_id: string;
  policy_id: string;
  policy_name: string;
  severity: string;
  status: string;
  was_remediated: number;
  asset: string;
  description: string;
  evidence: string;
  remediation: string | null;
  policy_snapshot: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string | null;
  status_updated_at: string | null;
}

export interface AlertCommentRow {
  id: string;
  alert_id: string;
  author_id: string;
  author_name: string;
  message: string;
  created_at: string;
}

export interface AlertAuditEventRow {
  id: string;
  alert_id: string;
  field: string;
  from_value: string;
  to_value: string;
  actor_type: string;
  actor_name: string;
  source: string;
  created_at: string;
}
