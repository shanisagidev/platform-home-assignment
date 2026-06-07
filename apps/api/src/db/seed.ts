import type { Database } from 'better-sqlite3';
import type { PolicyDefinition } from '../models/policy.model.js';

export function seedDatabase(db: Database): void {
  // Check if user already exists
  const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get('user_admin_1');
  
  if (!existingUser) {
    // Seed admin user
    db.prepare(`
      INSERT INTO users (id, username, display_name, password, role)
      VALUES (?, ?, ?, ?, ?)
    `).run('user_admin_1', 'admin', 'Admin', 'Aa123456', 'ADMIN');
    
    console.log('  → Admin user created');
  }
  
  // Check if policies need to be reseeded (old schema vs new)
  const existingPolicies = db.prepare('SELECT COUNT(*) as count FROM policies WHERE is_system_policy = 1').get() as { count: number };
  
  // Check if we have the new schema by testing for violationType in definition
  let needsReseed = false;
  if (existingPolicies.count > 0) {
    const samplePolicy = db.prepare('SELECT definition FROM policies WHERE is_system_policy = 1 LIMIT 1').get() as { definition: string } | undefined;
    if (samplePolicy) {
      try {
        const def = JSON.parse(samplePolicy.definition);
        // Old schema has "conditions", new schema has "supportedAssets" and "violationType"
        if (!def.violationType || !def.supportedAssets) {
          needsReseed = true;
        }
      } catch {
        needsReseed = true;
      }
    }
  } else {
    needsReseed = true;
  }
  
  if (!needsReseed) {
    console.log('  → System policies already up to date');
    return;
  }
  
  // Disable foreign keys temporarily to allow deletion
  db.pragma('foreign_keys = OFF');
  
  // Delete alerts that reference system policies (they'll be recreated by scans)
  db.prepare(`DELETE FROM alert_comments WHERE alert_id IN (SELECT id FROM alerts WHERE policy_id LIKE 'policy_%')`).run();
  db.prepare(`DELETE FROM alert_audit_events WHERE alert_id IN (SELECT id FROM alerts WHERE policy_id LIKE 'policy_%')`).run();
  db.prepare(`DELETE FROM alerts WHERE policy_id LIKE 'policy_%'`).run();
  
  // Delete existing system policies
  db.prepare('DELETE FROM policies WHERE is_system_policy = 1').run();
  
  db.pragma('foreign_keys = ON');
  
  // Seed policies with new structured definitions
  const policies: Array<{
    id: string;
    name: string;
    severity: string;
    enabled: boolean;
    description: string;
    definition: PolicyDefinition;
  }> = [
    {
      id: 'policy_001',
      name: 'Sensitive Data Exposure in S3',
      severity: 'CRITICAL',
      enabled: true,
      description: 'Detects when sensitive data (PII, credentials, secrets) is stored in S3 buckets without proper encryption or access controls.',
      definition: {
        supportedAssets: {
          assetCategory: 'CLOUD',
          cloudProviders: [
            { provider: 'AWS', dataStores: ['S3', 'RDS', 'DYNAMODB'] },
          ],
        },
        violationType: 'SENSITIVE_DATA_EXPOSED',
        dataClassificationCategories: ['USER_DATA'],
        remediation: {
          remediationType: 'ENABLE_ENCRYPTION',
          autoRemediate: false,
          remediationPriority: 'CRITICAL',
          remediationDue: { value: 24, unit: 'HOURS' },
        },
      },
    },
    {
      id: 'policy_002',
      name: 'Unencrypted Database Connections',
      severity: 'HIGH',
      enabled: true,
      description: 'Identifies database connections that do not use TLS/SSL encryption, potentially exposing data in transit.',
      definition: {
        supportedAssets: {
          assetCategory: 'CLOUD',
          cloudProviders: [
            { provider: 'AWS', dataStores: ['RDS', 'DYNAMODB'] },
            { provider: 'GCP', dataStores: ['CLOUDSQL', 'BIGQUERY'] },
            { provider: 'AZURE', dataStores: ['SQL_DATABASE', 'COSMOS_DB'] },
          ],
        },
        violationType: 'UNENCRYPTED_DATA',
        remediation: {
          remediationType: 'ENABLE_ENCRYPTION',
          autoRemediate: true,
          remediationPriority: 'HIGH',
          remediationDue: { value: 48, unit: 'HOURS' },
        },
      },
    },
    {
      id: 'policy_003',
      name: 'Excessive API Permissions',
      severity: 'MEDIUM',
      enabled: true,
      description: 'Flags API keys or service accounts with overly broad permissions that violate the principle of least privilege.',
      definition: {
        supportedAssets: {
          assetCategory: 'CLOUD',
          cloudProviders: [
            { provider: 'AWS', dataStores: ['API_GATEWAY'] },
            { provider: 'GCP', dataStores: ['PUBSUB'] },
            { provider: 'AZURE', dataStores: ['API_MANAGEMENT'] },
          ],
        },
        violationType: 'OVERLY_PERMISSIVE_ACCESS',
        remediation: {
          remediationType: 'RESTRICT_ACCESS',
          autoRemediate: false,
          remediationPriority: 'MEDIUM',
          remediationDue: { value: 3, unit: 'DAYS' },
        },
      },
    },
    {
      id: 'policy_004',
      name: 'Data Retention Violation',
      severity: 'MEDIUM',
      enabled: false,
      description: 'Detects data stored beyond the configured retention period, which may violate compliance requirements.',
      definition: {
        supportedAssets: {
          assetCategory: 'CLOUD',
          cloudProviders: [
            { provider: 'AWS', dataStores: ['S3', 'CLOUDWATCH'] },
            { provider: 'GCP', dataStores: ['GCS', 'CLOUDLOGGING'] },
            { provider: 'AZURE', dataStores: ['BLOB_STORAGE', 'MONITOR'] },
          ],
        },
        violationType: 'DATA_RETENTION_EXCEEDED',
        maxRetentionDays: 365,
        dataClassificationCategories: ['USER_DATA', 'LOGS', 'ANALYTICS'],
        remediation: {
          remediationType: 'MOVE_TO_SECURE_LOCATION',
          autoRemediate: true,
          remediationPriority: 'LOW',
          remediationDue: { value: 7, unit: 'DAYS' },
        },
      },
    },
    {
      id: 'policy_005',
      name: 'Cross-Region Data Transfer',
      severity: 'LOW',
      enabled: true,
      description: 'Monitors data transfers between geographic regions to ensure compliance with data residency requirements.',
      definition: {
        supportedAssets: {
          assetCategory: 'CLOUD',
          cloudProviders: [
            { provider: 'AWS', dataStores: ['S3', 'RDS'] },
            { provider: 'GCP', dataStores: ['GCS', 'BIGQUERY'] },
            { provider: 'AZURE', dataStores: ['BLOB_STORAGE', 'SQL_DATABASE'] },
          ],
        },
        violationType: 'PUBLIC_ACCESS',
        remediation: {
          remediationType: null,
          autoRemediate: false,
          remediationPriority: null,
          remediationDue: null,
        },
      },
    },
    {
      id: 'policy_006',
      name: 'Missing Data Classification',
      severity: 'LOW',
      enabled: true,
      description: 'Identifies data assets that have not been classified according to the organization data classification policy.',
      definition: {
        supportedAssets: {
          assetCategory: 'CLOUD',
          cloudProviders: [
            { provider: 'AWS', dataStores: ['S3', 'RDS', 'DYNAMODB'] },
            { provider: 'GCP', dataStores: ['GCS', 'BIGQUERY', 'CLOUDSQL'] },
            { provider: 'AZURE', dataStores: ['BLOB_STORAGE', 'SQL_DATABASE', 'COSMOS_DB'] },
          ],
        },
        violationType: 'MISSING_CLASSIFICATION',
        dataClassificationCategories: ['USER_DATA', 'LOGS', 'ANALYTICS'],
        remediation: {
          remediationType: 'ADD_REQUIRED_TAG',
          autoRemediate: false,
          remediationPriority: 'LOW',
          remediationDue: { value: 5, unit: 'DAYS' },
        },
      },
    },
    {
      id: 'policy_007',
      name: 'Stale Access Credentials',
      severity: 'HIGH',
      enabled: true,
      description: 'Detects access credentials (API keys, service accounts) that have not been rotated within the required timeframe.',
      definition: {
        supportedAssets: {
          assetCategory: 'SAAS',
          saasTools: ['GITHUB', 'SNOWFLAKE', 'GRAFANA'],
        },
        violationType: 'OVERLY_PERMISSIVE_ACCESS',
        maxRetentionDays: 90,
        remediation: {
          remediationType: 'ROTATE_CREDENTIALS',
          autoRemediate: false,
          remediationPriority: 'HIGH',
          remediationDue: { value: 24, unit: 'HOURS' },
        },
      },
    },
    {
      id: 'policy_008',
      name: 'Shadow IT Detection',
      severity: 'CRITICAL',
      enabled: true,
      description: 'Identifies unauthorized cloud services or storage locations being used to store organizational data.',
      definition: {
        supportedAssets: {
          assetCategory: 'SAAS',
          saasTools: ['JIRA', 'SERVICENOW', 'GITHUB', 'SNOWFLAKE', 'GRAFANA'],
        },
        violationType: 'PUBLIC_ACCESS',
        remediation: {
          remediationType: 'DISABLE_PUBLIC_ACCESS',
          autoRemediate: false,
          remediationPriority: 'CRITICAL',
          remediationDue: { value: 12, unit: 'HOURS' },
        },
      },
    },
  ];
  
  const insertPolicy = db.prepare(`
    INSERT INTO policies (id, name, severity, enabled, description, definition, is_system_policy)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);
  
  for (const policy of policies) {
    insertPolicy.run(
      policy.id,
      policy.name,
      policy.severity,
      policy.enabled ? 1 : 0,
      policy.description,
      JSON.stringify(policy.definition)
    );
  }
  
  console.log(`  → ${policies.length} system policies created`);
}
