import type { Database } from 'better-sqlite3';
import type { Alert, Asset, AlertRemediation, AlertStatus, Assignee, AlertComment, AlertAuditEvent, AuditActorType, AuditSource, PolicySnapshot, AssetCategory, CloudProvider, DataStoreType, SaasTool, ViolationType, RemediationOrigin } from '../models/alert.model.js';
import { VALID_TRANSITIONS, REMEDIATABLE_STATUSES, ALL_STATUSES } from '../models/alert.model.js';

// Database row type
interface AlertRow {
  id: string;
  run_id: string;
  policy_id: string;
  policy_name: string;
  severity: string;
  status: string;
  was_remediated: number;
  // Remediation tracking fields
  remediation_origin: string;
  created_severity: string;
  // Typed asset context fields
  violation_type: string;
  asset_category: string;
  cloud_provider: string | null;
  data_store_type: string | null;
  saas_tool: string | null;
  asset_display_name: string;
  asset_location: string;
  asset_id: string | null;
  account_id: string | null;
  // Legacy fields
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

interface AlertCommentRow {
  id: string;
  alert_id: string;
  author_id: string;
  author_name: string;
  message: string;
  created_at: string;
}

interface AlertAuditEventRow {
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

// Static assignees list
const ASSIGNEES: Assignee[] = [
  { id: 'u_admin', name: 'Admin', email: 'admin@local' },
  { id: 'u_analyst', name: 'Security Analyst' },
  { id: 'u_owner', name: 'Data Owner' },
];

export class AlertService {
  constructor(private db: Database) {}
  
  getAssignees(): Assignee[] {
    return ASSIGNEES;
  }
  
  getAssigneeById(id: string): Assignee | undefined {
    return ASSIGNEES.find(a => a.id === id);
  }
  
  getAll(filters?: Record<string, string>): Alert[] {
    let query = `
      SELECT id, run_id, policy_id, policy_name, severity, status, was_remediated,
             remediation_origin, created_severity,
             violation_type, asset_category, cloud_provider, data_store_type, saas_tool,
             asset_display_name, asset_location, asset_id, account_id,
             asset, description, evidence, remediation, policy_snapshot, assigned_to, 
             created_at, updated_at, status_updated_at
      FROM alerts
    `;
    
    const conditions: string[] = [];
    const params: string[] = [];
    
    if (filters?.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }
    
    if (filters?.severity) {
      conditions.push('severity = ?');
      params.push(filters.severity);
    }
    
    if (filters?.policyId) {
      conditions.push('policy_id = ?');
      params.push(filters.policyId);
    }
    
    if (filters?.runId) {
      conditions.push('run_id = ?');
      params.push(filters.runId);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += `
      ORDER BY 
        CASE severity
          WHEN 'CRITICAL' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MEDIUM' THEN 3
          WHEN 'LOW' THEN 4
        END,
        created_at DESC
    `;
    
    const rows = this.db.prepare(query).all(...params) as AlertRow[];
    return rows.map(row => this.rowToAlert(row));
  }
  
  getById(id: string): Alert | null {
    const row = this.db.prepare(`
      SELECT id, run_id, policy_id, policy_name, severity, status, was_remediated,
             remediation_origin, created_severity,
             violation_type, asset_category, cloud_provider, data_store_type, saas_tool,
             asset_display_name, asset_location, asset_id, account_id,
             asset, description, evidence, remediation, policy_snapshot, assigned_to, 
             created_at, updated_at, status_updated_at
      FROM alerts
      WHERE id = ?
    `).get(id) as AlertRow | undefined;
    
    return row ? this.rowToAlert(row) : null;
  }
  
  getCommentsByAlertId(alertId: string): AlertComment[] {
    const rows = this.db.prepare(`
      SELECT id, alert_id, author_id, author_name, message, created_at
      FROM alert_comments
      WHERE alert_id = ?
      ORDER BY created_at ASC
    `).all(alertId) as AlertCommentRow[];
    
    return rows.map(row => ({
      id: row.id,
      author: { id: row.author_id, name: row.author_name },
      message: row.message,
      createdAt: row.created_at,
    }));
  }
  
  // Get valid transitions for a given status
  getValidTransitions(status: AlertStatus): AlertStatus[] {
    return VALID_TRANSITIONS[status] || [];
  }
  
  // Check if a status transition is valid
  isValidTransition(fromStatus: AlertStatus, toStatus: AlertStatus): boolean {
    const validTargets = VALID_TRANSITIONS[fromStatus];
    return validTargets?.includes(toStatus) || false;
  }
  
  // Check if alert can be remediated
  canRemediate(status: AlertStatus): boolean {
    return REMEDIATABLE_STATUSES.includes(status);
  }
  
  // Update status with validation
  updateStatus(
    id: string, 
    newStatus: AlertStatus, 
    actorType: AuditActorType = 'USER',
    actorName: string = 'Admin',
    source: AuditSource = 'UI'
  ): Alert | null | 'invalid_transition' {
    const existing = this.getById(id);
    if (!existing) return null;
    
    // Check if transition is valid
    if (!this.isValidTransition(existing.status, newStatus)) {
      return 'invalid_transition';
    }
    
    const now = new Date().toISOString();
    const oldStatus = existing.status;
    
    this.db.prepare(`
      UPDATE alerts
      SET status = ?, updated_at = ?, status_updated_at = ?
      WHERE id = ?
    `).run(newStatus, now, now, id);
    
    // Create audit event
    this.createAuditEvent(id, oldStatus, newStatus, actorType, actorName, source, 'status');
    
    return this.getById(id);
  }
  
  // Unified update method for status, severity, assignee
  update(id: string, updates: { status?: AlertStatus; severity?: Alert['severity']; assignedToId?: string | null }): Alert | null | 'invalid_transition' {
    const existing = this.getById(id);
    if (!existing) return null;
    
    // Check for valid status transition
    if (updates.status && !this.isValidTransition(existing.status, updates.status)) {
      return 'invalid_transition';
    }
    
    const now = new Date().toISOString();
    const setClauses: string[] = ['updated_at = ?'];
    const params: (string | null)[] = [now];
    
    const oldStatus = existing.status;
    
    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      params.push(updates.status);
      setClauses.push('status_updated_at = ?');
      params.push(now);
    }
    
    if (updates.severity !== undefined) {
      setClauses.push('severity = ?');
      params.push(updates.severity);
    }
    
    if (updates.assignedToId !== undefined) {
      const assignee = updates.assignedToId ? this.getAssigneeById(updates.assignedToId) : null;
      setClauses.push('assigned_to = ?');
      params.push(assignee ? JSON.stringify(assignee) : null);
    }
    
    params.push(id);
    
    this.db.prepare(`
      UPDATE alerts
      SET ${setClauses.join(', ')}
      WHERE id = ?
    `).run(...params);
    
    // Create audit event for status change
    if (updates.status !== undefined && updates.status !== oldStatus) {
      this.createAuditEvent(id, oldStatus, updates.status, 'USER', 'Admin', 'UI', 'status');
    }
    
    // Create audit event for severity change
    if (updates.severity !== undefined && updates.severity !== existing.severity) {
      this.createAuditEvent(id, existing.severity, updates.severity, 'USER', 'Admin', 'UI', 'severity');
    }
    
    // Create audit event for assignee change
    if (updates.assignedToId !== undefined) {
      const oldAssignee = existing.assignedTo?.name || 'Unassigned';
      const newAssignee = updates.assignedToId 
        ? (this.getAssigneeById(updates.assignedToId)?.name || 'Unknown') 
        : 'Unassigned';
      if (oldAssignee !== newAssignee) {
        this.createAuditEvent(id, oldAssignee, newAssignee, 'USER', 'Admin', 'UI', 'assignee');
      }
    }
    
    return this.getById(id);
  }
  
  addComment(alertId: string, message: string, author: { id: string; name: string }): AlertComment | null {
    const existing = this.getById(alertId);
    if (!existing) return null;
    
    const id = `comment_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();
    
    this.db.prepare(`
      INSERT INTO alert_comments (id, alert_id, author_id, author_name, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, alertId, author.id, author.name, message, now);
    
    // Also update the alert's updated_at
    this.db.prepare(`
      UPDATE alerts SET updated_at = ? WHERE id = ?
    `).run(now, alertId);
    
    return {
      id,
      author,
      message,
      createdAt: now,
    };
  }
  
  // Start manual remediation - transitions to REMEDIATION_IN_PROGRESS
  // Returns the alert and schedules async completion
  startRemediation(id: string, note?: string): Alert | null | 'cannot_remediate' {
    const existing = this.getById(id);
    if (!existing) return null;
    
    // Check if we can remediate from current status
    if (!this.canRemediate(existing.status)) {
      return 'cannot_remediate';
    }
    
    const now = new Date().toISOString();
    const oldStatus = existing.status;
    
    // Update remediation with note if provided
    let remediation = existing.remediation;
    if (remediation) {
      remediation = { ...remediation, note };
    } else {
      remediation = {
        type: 'MANUAL',
        priority: existing.severity,
        autoRemediate: false,
        note,
      };
    }
    
    // Transition to REMEDIATION_IN_PROGRESS and set remediation_origin = MANUAL
    this.db.prepare(`
      UPDATE alerts
      SET status = 'REMEDIATION_IN_PROGRESS', remediation = ?, remediation_origin = 'MANUAL', updated_at = ?, status_updated_at = ?
      WHERE id = ?
    `).run(JSON.stringify(remediation), now, now, id);
    
    // Create audit event (no auto-comment - changes appear in audit only)
    this.createAuditEvent(id, oldStatus, 'REMEDIATION_IN_PROGRESS', 'USER', 'Admin', 'UI', 'status');
    
    return this.getById(id);
  }
  
  // Complete manual remediation - called after delay
  completeManualRemediation(id: string): Alert | null {
    const existing = this.getById(id);
    if (!existing) return null;
    
    // Only complete if still in REMEDIATION_IN_PROGRESS
    if (existing.status !== 'REMEDIATION_IN_PROGRESS') {
      return existing;
    }
    
    const now = new Date().toISOString();
    
    // Transition to REMEDIATED_WAITING_FOR_CUSTOMER and set wasRemediated = true
    this.db.prepare(`
      UPDATE alerts
      SET status = 'REMEDIATED_WAITING_FOR_CUSTOMER', was_remediated = 1, updated_at = ?, status_updated_at = ?
      WHERE id = ?
    `).run(now, now, id);
    
    // Create audit event (no auto-comment - changes appear in audit only)
    this.createAuditEvent(id, 'REMEDIATION_IN_PROGRESS', 'REMEDIATED_WAITING_FOR_CUSTOMER', 'SYSTEM', 'Remediation Engine', 'SYSTEM', 'status');
    
    return this.getById(id);
  }
  
  // Start auto-remediation (for policies with autoRemediate=true)
  startAutoRemediation(id: string): Alert | null {
    const existing = this.getById(id);
    if (!existing) return null;
    
    // Only auto-remediate from OPEN
    if (existing.status !== 'OPEN') {
      return existing;
    }
    
    const now = new Date().toISOString();
    
    // Update remediation to mark as auto-remediated
    let remediation = existing.remediation;
    if (remediation) {
      remediation = { ...remediation, note: 'Auto-remediated by policy configuration' };
    } else {
      remediation = {
        type: 'AUTO',
        priority: existing.severity,
        autoRemediate: true,
        note: 'Auto-remediated by policy configuration',
      };
    }
    
    // Transition to REMEDIATION_IN_PROGRESS and set remediation_origin = AUTO
    this.db.prepare(`
      UPDATE alerts
      SET status = 'REMEDIATION_IN_PROGRESS', remediation = ?, remediation_origin = 'AUTO', updated_at = ?, status_updated_at = ?
      WHERE id = ?
    `).run(JSON.stringify(remediation), now, now, id);
    
    // Create audit event (SYSTEM actor, SCAN source - no auto-comment)
    this.createAuditEvent(id, 'OPEN', 'REMEDIATION_IN_PROGRESS', 'SYSTEM', 'Scan Engine', 'SCAN', 'status');
    
    return this.getById(id);
  }
  
  // Complete auto-remediation - called after delay
  // Now completes to REMEDIATED_WAITING_FOR_CUSTOMER (same as manual remediation)
  completeAutoRemediation(id: string): Alert | null {
    const existing = this.getById(id);
    if (!existing) return null;
    
    // Only complete if still in REMEDIATION_IN_PROGRESS
    if (existing.status !== 'REMEDIATION_IN_PROGRESS') {
      return existing;
    }
    
    const now = new Date().toISOString();
    
    // Transition to REMEDIATED_WAITING_FOR_CUSTOMER and set wasRemediated = true
    this.db.prepare(`
      UPDATE alerts
      SET status = 'REMEDIATED_WAITING_FOR_CUSTOMER', was_remediated = 1, updated_at = ?, status_updated_at = ?
      WHERE id = ?
    `).run(now, now, id);
    
    // Create audit event (no auto-comment - changes appear in audit only)
    this.createAuditEvent(id, 'REMEDIATION_IN_PROGRESS', 'REMEDIATED_WAITING_FOR_CUSTOMER', 'SYSTEM', 'Remediation Engine', 'SYSTEM', 'status');
    
    return this.getById(id);
  }
  
  // Get alerts eligible for re-detection during scan
  // Only auto-remediated alerts that user has RESOLVED
  getAutoRemediatedResolvedAlerts(): Alert[] {
    const rows = this.db.prepare(`
      SELECT id, run_id, policy_id, policy_name, severity, status, was_remediated,
             remediation_origin, created_severity,
             violation_type, asset_category, cloud_provider, data_store_type, saas_tool,
             asset_display_name, asset_location, asset_id, account_id,
             asset, description, evidence, remediation, policy_snapshot, assigned_to, 
             created_at, updated_at, status_updated_at
      FROM alerts
      WHERE remediation_origin = 'AUTO' AND status = 'RESOLVED'
    `).all() as AlertRow[];
    
    return rows.map((row) => this.rowToAlert(row));
  }
  
  // Legacy method for backward compatibility
  getRemediatedAlerts(): Alert[] {
    const rows = this.db.prepare(`
      SELECT id, run_id, policy_id, policy_name, severity, status, was_remediated,
             remediation_origin, created_severity,
             violation_type, asset_category, cloud_provider, data_store_type, saas_tool,
             asset_display_name, asset_location, asset_id, account_id,
             asset, description, evidence, remediation, policy_snapshot, assigned_to, 
             created_at, updated_at, status_updated_at
      FROM alerts
      WHERE was_remediated = 1
    `).all() as AlertRow[];
    
    return rows.map((row) => this.rowToAlert(row));
  }
  
  private rowToAlert(row: AlertRow): Alert {
    const comments = this.getCommentsByAlertId(row.id);
    // Map legacy status to current status for API responses
    let status = row.status as AlertStatus;
    if (row.status === 'REMEDIATED_WAITING_FOR_USER_VERIFICATION') {
      status = 'REMEDIATED_WAITING_FOR_CUSTOMER';
    }
    return {
      id: row.id,
      runId: row.run_id,
      policyId: row.policy_id,
      policyName: row.policy_name,
      severity: row.severity as Alert['severity'],
      status,
      wasRemediated: row.was_remediated === 1,
      // Remediation tracking fields
      remediationOrigin: (row.remediation_origin || 'NONE') as RemediationOrigin,
      createdSeverity: (row.created_severity || row.severity) as Alert['severity'],
      // Typed asset context fields
      violationType: row.violation_type as ViolationType,
      assetCategory: row.asset_category as AssetCategory,
      cloudProvider: row.cloud_provider as CloudProvider | null,
      dataStoreType: row.data_store_type as DataStoreType | null,
      saasTool: row.saas_tool as SaasTool | null,
      assetDisplayName: row.asset_display_name,
      assetLocation: row.asset_location,
      assetId: row.asset_id || undefined,
      accountId: row.account_id || undefined,
      // Legacy fields
      asset: JSON.parse(row.asset) as Asset,
      description: row.description,
      evidence: JSON.parse(row.evidence) as Record<string, unknown>,
      remediation: row.remediation ? JSON.parse(row.remediation) as AlertRemediation : undefined,
      policySnapshot: row.policy_snapshot ? JSON.parse(row.policy_snapshot) as PolicySnapshot : undefined,
      assignedTo: row.assigned_to ? JSON.parse(row.assigned_to) as Assignee : null,
      comments,
      createdAt: row.created_at,
      updatedAt: row.updated_at || undefined,
      statusUpdatedAt: row.status_updated_at || undefined,
    };
  }
  
  // Audit trail methods
  createAuditEvent(
    alertId: string,
    fromValue: string,
    toValue: string,
    actorType: AuditActorType,
    actorName: string,
    source: AuditSource,
    field: 'status' | 'severity' | 'assignee' = 'status'
  ): AlertAuditEvent {
    const id = `audit_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();
    
    this.db.prepare(`
      INSERT INTO alert_audit_events (id, alert_id, field, from_value, to_value, actor_type, actor_name, source, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, alertId, field, fromValue, toValue, actorType, actorName, source, now);
    
    return {
      id,
      alertId,
      field,
      fromValue,
      toValue,
      actorType,
      actorName,
      source,
      createdAt: now,
    };
  }
  
  getAuditEvents(alertId: string): AlertAuditEvent[] {
    const rows = this.db.prepare(`
      SELECT id, alert_id, field, from_value, to_value, actor_type, actor_name, source, created_at
      FROM alert_audit_events
      WHERE alert_id = ?
      ORDER BY created_at DESC
    `).all(alertId) as AlertAuditEventRow[];
    
    return rows.map((row) => ({
      id: row.id,
      alertId: row.alert_id,
      field: row.field as 'status' | 'severity' | 'assignee',
      fromValue: row.from_value,
      toValue: row.to_value,
      actorType: row.actor_type as AuditActorType,
      actorName: row.actor_name,
      source: row.source as AuditSource,
      createdAt: row.created_at,
    }));
  }
}
