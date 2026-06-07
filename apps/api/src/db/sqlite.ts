import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

export function initDatabase(dbPath: string): Database.Database {
  // Ensure directory exists
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  const db = new Database(dbPath);
  
  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  
  // Create tables
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    
    -- Policies table
    CREATE TABLE IF NOT EXISTS policies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      enabled INTEGER NOT NULL DEFAULT 1,
      description TEXT NOT NULL,
      definition TEXT NOT NULL,
      is_system_policy INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT
    );
    
    -- Scan runs table
    CREATE TABLE IF NOT EXISTS scan_runs (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK (status IN ('RUNNING', 'COMPLETED')),
      started_at TEXT NOT NULL,
      completed_at TEXT,
      scanned_assets_count INTEGER NOT NULL DEFAULT 0,
      alerts_created_count INTEGER NOT NULL DEFAULT 0
    );
    
    -- Alerts table with typed asset fields
    -- Note: status CHECK constraint allows legacy value for historical data readability
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      policy_id TEXT NOT NULL,
      policy_name TEXT NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      status TEXT NOT NULL CHECK (status IN ('OPEN', 'IN_PROGRESS', 'REMEDIATION_IN_PROGRESS', 'REMEDIATED_WAITING_FOR_USER_VERIFICATION', 'REMEDIATED_WAITING_FOR_CUSTOMER', 'RESOLVED', 'REOPEN')) DEFAULT 'OPEN',
      was_remediated INTEGER NOT NULL DEFAULT 0,
      -- Remediation tracking fields
      remediation_origin TEXT NOT NULL CHECK (remediation_origin IN ('AUTO', 'MANUAL', 'NONE')) DEFAULT 'NONE',
      created_severity TEXT NOT NULL CHECK (created_severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')) DEFAULT 'MEDIUM',
      -- Typed asset context fields
      violation_type TEXT NOT NULL DEFAULT 'PUBLIC_ACCESS',
      asset_category TEXT NOT NULL CHECK (asset_category IN ('CLOUD', 'SAAS')) DEFAULT 'CLOUD',
      cloud_provider TEXT CHECK (cloud_provider IN ('AWS', 'GCP', 'AZURE') OR cloud_provider IS NULL),
      data_store_type TEXT,
      saas_tool TEXT CHECK (saas_tool IN ('JIRA', 'SERVICENOW', 'GITHUB', 'SNOWFLAKE', 'GRAFANA') OR saas_tool IS NULL),
      asset_display_name TEXT NOT NULL DEFAULT 'Unknown Asset',
      asset_location TEXT NOT NULL DEFAULT '',
      asset_id TEXT,
      account_id TEXT,
      -- Legacy fields
      asset TEXT NOT NULL,
      description TEXT NOT NULL,
      evidence TEXT NOT NULL,
      remediation TEXT,
      policy_snapshot TEXT,
      assigned_to TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT,
      status_updated_at TEXT,
      FOREIGN KEY (run_id) REFERENCES scan_runs(id),
      FOREIGN KEY (policy_id) REFERENCES policies(id)
    );
    
    -- Alert comments table
    CREATE TABLE IF NOT EXISTS alert_comments (
      id TEXT PRIMARY KEY,
      alert_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (alert_id) REFERENCES alerts(id)
    );
    
    -- Alert audit events table (append-only audit trail)
    CREATE TABLE IF NOT EXISTS alert_audit_events (
      id TEXT PRIMARY KEY,
      alert_id TEXT NOT NULL,
      field TEXT NOT NULL CHECK (field IN ('status', 'severity', 'assignee')),
      from_value TEXT NOT NULL,
      to_value TEXT NOT NULL,
      actor_type TEXT NOT NULL CHECK (actor_type IN ('USER', 'SYSTEM')),
      actor_name TEXT NOT NULL,
      source TEXT NOT NULL CHECK (source IN ('UI', 'SCAN', 'SYSTEM')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (alert_id) REFERENCES alerts(id)
    );
    
    -- Indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_alerts_run_id ON alerts(run_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_policy_id ON alerts(policy_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
    CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
    CREATE INDEX IF NOT EXISTS idx_alerts_was_remediated ON alerts(was_remediated);
    CREATE INDEX IF NOT EXISTS idx_alert_comments_alert_id ON alert_comments(alert_id);
    CREATE INDEX IF NOT EXISTS idx_alert_audit_events_alert_id ON alert_audit_events(alert_id);
  `);
  
  // Migration: Add new columns to existing policies table if they don't exist
  const policyColumns = db.prepare("PRAGMA table_info(policies)").all() as { name: string }[];
  const policyColumnNames = policyColumns.map(c => c.name);
  
  if (!policyColumnNames.includes('is_system_policy')) {
    db.exec('ALTER TABLE policies ADD COLUMN is_system_policy INTEGER NOT NULL DEFAULT 0');
  }
  if (!policyColumnNames.includes('updated_at')) {
    db.exec('ALTER TABLE policies ADD COLUMN updated_at TEXT');
  }
  
  // Migration: Add new columns to existing alerts table if they don't exist
  const alertColumns = db.prepare("PRAGMA table_info(alerts)").all() as { name: string }[];
  const alertColumnNames = alertColumns.map(c => c.name);
  
  if (!alertColumnNames.includes('assigned_to')) {
    db.exec('ALTER TABLE alerts ADD COLUMN assigned_to TEXT');
  }
  if (!alertColumnNames.includes('status_updated_at')) {
    db.exec('ALTER TABLE alerts ADD COLUMN status_updated_at TEXT');
  }
  if (!alertColumnNames.includes('policy_snapshot')) {
    db.exec("ALTER TABLE alerts ADD COLUMN policy_snapshot TEXT DEFAULT NULL");
  }
  if (!alertColumnNames.includes('was_remediated')) {
    db.exec("ALTER TABLE alerts ADD COLUMN was_remediated INTEGER NOT NULL DEFAULT 0");
  }
  
  // Migration: Add remediation tracking columns
  if (!alertColumnNames.includes('remediation_origin')) {
    db.exec("ALTER TABLE alerts ADD COLUMN remediation_origin TEXT NOT NULL DEFAULT 'NONE'");
    // Backfill: set to AUTO for alerts that were auto-remediated based on policy snapshot
    db.exec(`
      UPDATE alerts 
      SET remediation_origin = 'AUTO' 
      WHERE policy_snapshot IS NOT NULL 
        AND json_extract(policy_snapshot, '$.autoRemediate') = 1
        AND was_remediated = 1
    `);
    // Set to MANUAL for other remediated alerts
    db.exec(`
      UPDATE alerts 
      SET remediation_origin = 'MANUAL' 
      WHERE was_remediated = 1 
        AND remediation_origin = 'NONE'
    `);
  }
  if (!alertColumnNames.includes('created_severity')) {
    db.exec("ALTER TABLE alerts ADD COLUMN created_severity TEXT");
    // Backfill: copy current severity as created_severity
    db.exec("UPDATE alerts SET created_severity = severity WHERE created_severity IS NULL");
  }
  
  // Migration: Migrate REMEDIATED_WAITING_FOR_USER_VERIFICATION to REMEDIATED_WAITING_FOR_CUSTOMER
  db.exec(`
    UPDATE alerts 
    SET status = 'REMEDIATED_WAITING_FOR_CUSTOMER' 
    WHERE status = 'REMEDIATED_WAITING_FOR_USER_VERIFICATION'
  `);
  
  // Migration: Add typed asset context columns
  if (!alertColumnNames.includes('violation_type')) {
    db.exec("ALTER TABLE alerts ADD COLUMN violation_type TEXT NOT NULL DEFAULT 'PUBLIC_ACCESS'");
  }
  if (!alertColumnNames.includes('asset_category')) {
    db.exec("ALTER TABLE alerts ADD COLUMN asset_category TEXT NOT NULL DEFAULT 'CLOUD'");
  }
  if (!alertColumnNames.includes('cloud_provider')) {
    db.exec("ALTER TABLE alerts ADD COLUMN cloud_provider TEXT");
  }
  if (!alertColumnNames.includes('data_store_type')) {
    db.exec("ALTER TABLE alerts ADD COLUMN data_store_type TEXT");
  }
  if (!alertColumnNames.includes('saas_tool')) {
    db.exec("ALTER TABLE alerts ADD COLUMN saas_tool TEXT");
  }
  if (!alertColumnNames.includes('asset_display_name')) {
    db.exec("ALTER TABLE alerts ADD COLUMN asset_display_name TEXT NOT NULL DEFAULT 'Unknown Asset'");
  }
  if (!alertColumnNames.includes('asset_location')) {
    db.exec("ALTER TABLE alerts ADD COLUMN asset_location TEXT NOT NULL DEFAULT ''");
  }
  if (!alertColumnNames.includes('asset_id')) {
    db.exec("ALTER TABLE alerts ADD COLUMN asset_id TEXT");
  }
  if (!alertColumnNames.includes('account_id')) {
    db.exec("ALTER TABLE alerts ADD COLUMN account_id TEXT");
  }
  
  // Migration: Check if we need to migrate to new status state machine
  const statusCheck = db.prepare("SELECT sql FROM sqlite_master WHERE name='alerts'").get() as { sql: string } | undefined;
  if (statusCheck && (statusCheck.sql.includes('ACKNOWLEDGED') || statusCheck.sql.includes('remediation_status'))) {
    console.log('  → Migrating alerts table to new status state machine...');
    db.pragma('foreign_keys = OFF');
    
    db.exec(`
      -- Create new alerts table with new status state machine
      CREATE TABLE IF NOT EXISTS alerts_new (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        policy_id TEXT NOT NULL,
        policy_name TEXT NOT NULL,
        severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        status TEXT NOT NULL CHECK (status IN ('OPEN', 'IN_PROGRESS', 'REMEDIATION_IN_PROGRESS', 'REMEDIATED_WAITING_FOR_USER_VERIFICATION', 'REMEDIATED_WAITING_FOR_CUSTOMER', 'RESOLVED', 'REOPEN')) DEFAULT 'OPEN',
        was_remediated INTEGER NOT NULL DEFAULT 0,
        asset TEXT NOT NULL,
        description TEXT NOT NULL,
        evidence TEXT NOT NULL,
        remediation TEXT,
        policy_snapshot TEXT,
        assigned_to TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT,
        status_updated_at TEXT,
        FOREIGN KEY (run_id) REFERENCES scan_runs(id),
        FOREIGN KEY (policy_id) REFERENCES policies(id)
      );
      
      -- Copy data from old table, mapping old statuses to new ones
      INSERT OR IGNORE INTO alerts_new (id, run_id, policy_id, policy_name, severity, status, was_remediated, asset, description, evidence, remediation, policy_snapshot, assigned_to, created_at, updated_at, status_updated_at)
        SELECT 
          id, run_id, policy_id, policy_name, severity,
          CASE status
            WHEN 'ACKNOWLEDGED' THEN 'IN_PROGRESS'
            WHEN 'WAITING_ON_CUSTOMER' THEN 'IN_PROGRESS'
            WHEN 'REMEDIATED' THEN 'RESOLVED'
            WHEN 'SUPPRESSED' THEN 'RESOLVED'
            ELSE status
          END,
          CASE WHEN status = 'REMEDIATED' THEN 1 ELSE 0 END,
          asset, description, evidence, remediation, policy_snapshot, assigned_to, created_at, updated_at, status_updated_at
        FROM alerts;
      
      -- Drop old table
      DROP TABLE IF EXISTS alerts;
      
      -- Rename new table
      ALTER TABLE alerts_new RENAME TO alerts;
      
      -- Recreate indexes
      CREATE INDEX IF NOT EXISTS idx_alerts_run_id ON alerts(run_id);
      CREATE INDEX IF NOT EXISTS idx_alerts_policy_id ON alerts(policy_id);
      CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
      CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
      CREATE INDEX IF NOT EXISTS idx_alerts_was_remediated ON alerts(was_remediated);
    `);
    
    db.pragma('foreign_keys = ON');
    console.log('  → Migration complete');
  }
  
  // Migration: Update audit events table to only track status (remove remediationStatus)
  const auditCheck = db.prepare("SELECT sql FROM sqlite_master WHERE name='alert_audit_events'").get() as { sql: string } | undefined;
  if (auditCheck && auditCheck.sql.includes('remediationStatus')) {
    console.log('  → Migrating audit events table...');
    db.pragma('foreign_keys = OFF');
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS alert_audit_events_new (
        id TEXT PRIMARY KEY,
        alert_id TEXT NOT NULL,
        field TEXT NOT NULL CHECK (field IN ('status', 'severity', 'assignee')),
        from_value TEXT NOT NULL,
        to_value TEXT NOT NULL,
        actor_type TEXT NOT NULL CHECK (actor_type IN ('USER', 'SYSTEM')),
        actor_name TEXT NOT NULL,
        source TEXT NOT NULL CHECK (source IN ('UI', 'SCAN', 'SYSTEM')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (alert_id) REFERENCES alerts(id)
      );
      
      INSERT OR IGNORE INTO alert_audit_events_new (id, alert_id, field, from_value, to_value, actor_type, actor_name, source, created_at)
        SELECT id, alert_id, 'status', from_value, to_value, actor_type, actor_name, 
          CASE source WHEN 'UI' THEN 'UI' WHEN 'SCAN' THEN 'SCAN' ELSE 'SYSTEM' END,
          created_at
        FROM alert_audit_events
        WHERE field = 'status';
      
      DROP TABLE IF EXISTS alert_audit_events;
      ALTER TABLE alert_audit_events_new RENAME TO alert_audit_events;
      CREATE INDEX IF NOT EXISTS idx_alert_audit_events_alert_id ON alert_audit_events(alert_id);
    `);
    
    db.pragma('foreign_keys = ON');
    console.log('  → Audit events migration complete');
  }
  
  // Migration: Update audit events field constraint to include severity and assignee
  const auditFieldCheck = db.prepare("SELECT sql FROM sqlite_master WHERE name='alert_audit_events'").get() as { sql: string } | undefined;
  if (auditFieldCheck && !auditFieldCheck.sql.includes("'severity'")) {
    console.log('  → Migrating audit events to support severity/assignee fields...');
    db.pragma('foreign_keys = OFF');
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS alert_audit_events_new (
        id TEXT PRIMARY KEY,
        alert_id TEXT NOT NULL,
        field TEXT NOT NULL CHECK (field IN ('status', 'severity', 'assignee')),
        from_value TEXT NOT NULL,
        to_value TEXT NOT NULL,
        actor_type TEXT NOT NULL CHECK (actor_type IN ('USER', 'SYSTEM')),
        actor_name TEXT NOT NULL,
        source TEXT NOT NULL CHECK (source IN ('UI', 'SCAN', 'SYSTEM')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (alert_id) REFERENCES alerts(id)
      );
      
      INSERT OR IGNORE INTO alert_audit_events_new (id, alert_id, field, from_value, to_value, actor_type, actor_name, source, created_at)
        SELECT id, alert_id, field, from_value, to_value, actor_type, actor_name, source, created_at
        FROM alert_audit_events;
      
      DROP TABLE IF EXISTS alert_audit_events;
      ALTER TABLE alert_audit_events_new RENAME TO alert_audit_events;
      CREATE INDEX IF NOT EXISTS idx_alert_audit_events_alert_id ON alert_audit_events(alert_id);
    `);
    
    db.pragma('foreign_keys = ON');
    console.log('  → Audit field constraint migration complete');
  }
  
  return db;
}
