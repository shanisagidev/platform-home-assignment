import type { Database } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { ScanRun } from '../models/scan.model.js';
import type { Policy, PolicyDefinition, Severity, CloudProvider, SaasTool, CloudAssetSelection } from '../models/policy.model.js';
import type { Asset, AlertRemediation, PolicySnapshot, AssetCategory, DataStoreType, ViolationType, Alert } from '../models/alert.model.js';
import type { ScanRunRow, PolicyRow } from '../types/api.js';
import { AlertService } from './alert.service.js';

// Random delay between 10 seconds and 50 seconds (in ms)
function getRandomDelay(): number {
  return Math.floor(Math.random() * (50000 - 10000 + 1)) + 10000;
}

// Maximum alerts per scan
const MAX_ALERTS_PER_SCAN = 30;

export class ScanService {
  constructor(private db: Database) {}
  
  startScan(): ScanRun {
    const scanId = `scan_${uuidv4().slice(0, 8)}`;
    const startedAt = new Date().toISOString();
    
    // Create scan run with RUNNING status
    this.db.prepare(`
      INSERT INTO scan_runs (id, status, started_at, scanned_assets_count, alerts_created_count)
      VALUES (?, 'RUNNING', ?, 0, 0)
    `).run(scanId, startedAt);
    
    // Random scan duration between 5 and 10 seconds
    const scanDurationMs = Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000;
    console.log(`[Scan] Starting scan ${scanId}, will complete in ${(scanDurationMs / 1000).toFixed(1)}s`);
    
    // Simulate scan with random 5-10 second duration
    // Wrapped in try-catch to handle case where reset happens during scan
    setTimeout(() => {
      try {
        this.completeScan(scanId);
      } catch (error: unknown) {
        // Log but don't crash - this can happen if reset occurs during scan
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('FOREIGN KEY') || message.includes('no such')) {
          console.log(`[Scan] Scan ${scanId} was cancelled (likely due to reset)`);
        } else {
          console.error(`[Scan] Error completing scan ${scanId}:`, error);
        }
      }
    }, scanDurationMs);
    
    return this.getById(scanId)!;
  }
  
  private completeScan(scanId: string): void {
    // Check if scan still exists (might have been deleted by reset)
    const scanExists = this.db.prepare(
      `SELECT 1 FROM scan_runs WHERE id = ?`
    ).get(scanId);
    
    if (!scanExists) {
      console.log(`[Scan] Scan ${scanId} no longer exists (likely reset), skipping completion`);
      return;
    }
    
    const alertService = new AlertService(this.db);
    
    // Get all policies
    const policyRows = this.db.prepare(`
      SELECT id, name, severity, enabled, description, definition, is_system_policy, created_at, updated_at
      FROM policies
    `).all() as PolicyRow[];
    
    // Convert to Policy objects and categorize
    const policies: Policy[] = policyRows.map(row => {
      const definition = JSON.parse(row.definition) as PolicyDefinition;
      return {
        id: row.id,
        name: row.name,
        severity: row.severity as Severity,
        enabled: row.enabled === 1,
        description: row.description,
        definition,
        isSystemPolicy: row.is_system_policy === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at || undefined,
      };
    });
    
    // Separate policies into categories for prioritization
    // Auto-remediate preconfigured policies (always create alerts)
    const autoRemediatePreconfigured = policies.filter(p => 
      p.isSystemPolicy && p.definition.remediation?.autoRemediate
    );
    
    // Auto-remediate custom policies (only if enabled)
    const autoRemediateCustomEnabled = policies.filter(p => 
      !p.isSystemPolicy && p.enabled && p.definition.remediation?.autoRemediate
    );
    
    // Regular preconfigured policies (always create alerts)
    const regularPreconfigured = policies.filter(p => 
      p.isSystemPolicy && !p.definition.remediation?.autoRemediate
    );
    
    // Regular custom policies (only if enabled)
    const regularCustomEnabled = policies.filter(p => 
      !p.isSystemPolicy && p.enabled && !p.definition.remediation?.autoRemediate
    );
    
    // Build ordered list: prioritize auto-remediate, then preconfigured
    const orderedPolicies = [
      ...autoRemediatePreconfigured,
      ...autoRemediateCustomEnabled,
      ...regularPreconfigured,
      ...regularCustomEnabled,
    ];
    
    let alertsCreated = 0;
    const alertsToAutoRemediate: string[] = [];
    
    // Create alerts respecting the cap
    for (const policy of orderedPolicies) {
      if (alertsCreated >= MAX_ALERTS_PER_SCAN) {
        console.log(`[Scan] Alert cap reached (${MAX_ALERTS_PER_SCAN}), stopping alert creation`);
        break;
      }
      
      // Generate valid asset context based on policy's Supported Assets
      const assetContext = this.generateValidAssetContext(policy);
      if (!assetContext) {
        console.warn(`Policy ${policy.id} has no valid asset configuration, skipping`);
        continue;
      }
      
      const alertId = this.createAlertForPolicy(scanId, policy, assetContext);
      alertsCreated++;
      
      // Check if this alert should be auto-remediated
      const remConfig = policy.definition.remediation;
      if (remConfig && remConfig.autoRemediate && 
          remConfig.remediationType && remConfig.remediationType !== 'NO_REMEDIATION_AVAILABLE') {
        alertsToAutoRemediate.push(alertId);
      }
    }
    
    // Process auto-remediation for applicable alerts
    for (const alertId of alertsToAutoRemediate) {
      alertService.startAutoRemediation(alertId);
      
      const delay = getRandomDelay();
      console.log(`[Auto-Remediation] Alert ${alertId}: will complete in ${Math.round(delay / 1000)}s`);
      
      setTimeout(() => {
        try {
          console.log(`[Auto-Remediation] Alert ${alertId}: completing auto-remediation`);
          alertService.completeAutoRemediation(alertId);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          if (message.includes('FOREIGN KEY') || message.includes('no such') || message.includes('not found')) {
            console.log(`[Auto-Remediation] Alert ${alertId} no longer exists (likely reset)`);
          } else {
            console.error(`[Auto-Remediation] Error completing remediation for ${alertId}:`, error);
          }
        }
      }, delay);
    }
    
    if (alertsToAutoRemediate.length > 0) {
      console.log(`Started auto-remediation for ${alertsToAutoRemediate.length} alerts`);
    }
    
    // NEW Re-detection logic: 
    // Only for AUTO-remediated alerts that user has RESOLVED
    // Creates identical alert that goes through auto-remediation again
    const autoRemediatedResolvedAlerts = alertService.getAutoRemediatedResolvedAlerts();
    let redetectedCount = 0;
    
    for (const alert of autoRemediatedResolvedAlerts) {
      if (alertsCreated >= MAX_ALERTS_PER_SCAN) {
        break;
      }
      
      // Check if the policy still has autoRemediate=true
      const policyRow = this.db.prepare(`
        SELECT definition FROM policies WHERE id = ?
      `).get(alert.policyId) as { definition: string } | undefined;
      
      if (!policyRow) continue;
      
      const policyDef = JSON.parse(policyRow.definition) as PolicyDefinition;
      if (!policyDef.remediation?.autoRemediate) {
        continue; // Policy no longer has autoRemediate, skip re-detection
      }
      
      // Create identical alert using ORIGINAL severity (createdSeverity)
      const redetectId = `alert_${uuidv4().slice(0, 8)}`;
      const now = new Date().toISOString();
      
      this.db.prepare(`
        INSERT INTO alerts (
          id, run_id, policy_id, policy_name, severity, status, was_remediated,
          remediation_origin, created_severity,
          violation_type, asset_category, cloud_provider, data_store_type, saas_tool,
          asset_display_name, asset_location, asset_id, account_id,
          asset, description, evidence, remediation, policy_snapshot, created_at
        )
        VALUES (?, ?, ?, ?, ?, 'OPEN', 0, 'NONE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        redetectId,
        scanId,
        alert.policyId,
        alert.policyName,
        alert.createdSeverity, // Use ORIGINAL severity, not modified
        alert.createdSeverity, // created_severity = original severity
        alert.violationType,
        alert.assetCategory,
        alert.cloudProvider,
        alert.dataStoreType,
        alert.saasTool,
        alert.assetDisplayName,
        alert.assetLocation,
        alert.assetId || null,
        alert.accountId || null,
        JSON.stringify(alert.asset),
        alert.description.replace(/^Re-detected: /, ''), // Remove previous re-detect prefix
        JSON.stringify({ 
          ...alert.evidence, 
          redetectedFrom: alert.id,
          redetectedAt: now 
        }),
        alert.remediation ? JSON.stringify(alert.remediation) : null,
        alert.policySnapshot ? JSON.stringify(alert.policySnapshot) : null,
        now
      );
      
      alertsCreated++;
      redetectedCount++;
      
      // This re-detected alert should also go through auto-remediation
      alertService.startAutoRemediation(redetectId);
      
      const delay = getRandomDelay();
      console.log(`[Re-detection] Alert ${redetectId}: re-detected from ${alert.id}, will auto-remediate in ${Math.round(delay / 1000)}s`);
      
      setTimeout(() => {
        try {
          console.log(`[Auto-Remediation] Alert ${redetectId}: completing auto-remediation (re-detected)`);
          alertService.completeAutoRemediation(redetectId);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          if (message.includes('FOREIGN KEY') || message.includes('no such') || message.includes('not found')) {
            console.log(`[Auto-Remediation] Alert ${redetectId} no longer exists (likely reset)`);
          } else {
            console.error(`[Auto-Remediation] Error completing remediation for ${redetectId}:`, error);
          }
        }
      }, delay);
    }
    
    if (redetectedCount > 0) {
      console.log(`Re-detected ${redetectedCount} issues from auto-remediated resolved alerts`);
    }
    
    // Update scan run to COMPLETED
    const completedAt = new Date().toISOString();
    this.db.prepare(`
      UPDATE scan_runs
      SET status = 'COMPLETED', 
          completed_at = ?, 
          scanned_assets_count = ?,
          alerts_created_count = ?
      WHERE id = ?
    `).run(completedAt, alertsCreated, alertsCreated, scanId);
  }
  
  // Helper method to create an alert for a policy
  private createAlertForPolicy(
    scanId: string, 
    policy: Policy, 
    assetContext: ReturnType<typeof this.generateValidAssetContext>
  ): string {
    if (!assetContext) throw new Error('Invalid asset context');
    
    const alertId = `alert_${uuidv4().slice(0, 8)}`;
    const policySnapshot = this.createPolicySnapshot(policy);
    const remediation = this.generateRemediation(policy);
    const now = new Date().toISOString();
    
    // Generate legacy asset object for backward compatibility
    const legacyAsset: Asset = {
      id: assetContext.assetId,
      type: assetContext.dataStoreType || assetContext.saasTool || 'UNKNOWN',
      location: assetContext.assetLocation,
      metadata: {
        name: assetContext.assetDisplayName,
        provider: assetContext.cloudProvider,
        saasTool: assetContext.saasTool,
      },
    };
    
    // Generate structured evidence
    const scannedCount = Math.floor(Math.random() * 500) + 100;
    const matchedCount = Math.floor(Math.random() * Math.min(50, scannedCount)) + 1;
    const fileTypes = ['csv', 'json', 'parquet', 'txt', 'xlsx', 'pdf'];
    const matchedByType: Record<string, number> = {};
    let remaining = matchedCount;
    for (const ft of fileTypes.slice(0, Math.floor(Math.random() * 3) + 1)) {
      const count = Math.min(remaining, Math.floor(Math.random() * 20) + 1);
      matchedByType[ft] = count;
      remaining -= count;
      if (remaining <= 0) break;
    }
    if (remaining > 0) {
      matchedByType['other'] = remaining;
    }
    
    const evidence = {
      // Identity
      policyId: policy.id,
      policyName: policy.name,
      assetId: assetContext.assetId,
      assetDisplayName: assetContext.assetDisplayName,
      
      // Detection context
      violationType: policy.definition.violationType,
      detectedAt: now,
      riskScore: Math.floor(Math.random() * 40) + 60,
      
      // Asset context snapshot
      assetContext: {
        category: assetContext.assetCategory,
        cloudProvider: assetContext.cloudProvider,
        dataStoreType: assetContext.dataStoreType,
        saasTool: assetContext.saasTool,
        location: assetContext.assetLocation,
        accountId: assetContext.accountId,
      },
      
      // Findings breakdown
      findings: {
        scannedObjectsCount: scannedCount,
        matchedObjectsCount: matchedCount,
        matchedByType,
        sampleItems: this.generateSampleItems(assetContext, matchedCount),
      },
    };
    
    const description = this.generateDescription(policy, assetContext);
    
    // Insert alert with typed fields including created_severity
    this.db.prepare(`
      INSERT INTO alerts (
        id, run_id, policy_id, policy_name, severity, status, was_remediated,
        remediation_origin, created_severity,
        violation_type, asset_category, cloud_provider, data_store_type, saas_tool,
        asset_display_name, asset_location, asset_id, account_id,
        asset, description, evidence, remediation, policy_snapshot, created_at
      )
      VALUES (?, ?, ?, ?, ?, 'OPEN', 0, 'NONE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      alertId,
      scanId,
      policy.id,
      policy.name,
      policy.severity,
      policy.severity, // created_severity = policy severity at creation
      policy.definition.violationType,
      assetContext.assetCategory,
      assetContext.cloudProvider,
      assetContext.dataStoreType,
      assetContext.saasTool,
      assetContext.assetDisplayName,
      assetContext.assetLocation,
      assetContext.assetId,
      assetContext.accountId,
      JSON.stringify(legacyAsset),
      description,
      JSON.stringify(evidence),
      remediation ? JSON.stringify(remediation) : null,
      JSON.stringify(policySnapshot),
      now
    );
    
    return alertId;
  }
  
  // Generate valid asset context based on policy's Supported Assets configuration
  private generateValidAssetContext(policy: Policy): {
    assetCategory: AssetCategory;
    cloudProvider: CloudProvider | null;
    dataStoreType: DataStoreType | null;
    saasTool: SaasTool | null;
    assetDisplayName: string;
    assetLocation: string;
    assetId: string;
    accountId: string;
  } | null {
    const { supportedAssets } = policy.definition;
    
    if (supportedAssets.assetCategory === 'CLOUD') {
      const cloudProviders = supportedAssets.cloudProviders;
      if (!cloudProviders || cloudProviders.length === 0) {
        return null;
      }
      
      // Select random cloud provider from policy config
      const randomProviderConfig = cloudProviders[Math.floor(Math.random() * cloudProviders.length)];
      const provider = randomProviderConfig.provider as CloudProvider;
      
      if (!randomProviderConfig.dataStores || randomProviderConfig.dataStores.length === 0) {
        return null;
      }
      
      // Select random data store from policy config
      const dataStore = randomProviderConfig.dataStores[Math.floor(Math.random() * randomProviderConfig.dataStores.length)] as DataStoreType;
      
      // Generate synthetic asset details
      const assetId = `${provider.toLowerCase()}-${dataStore.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`;
      const accountId = `${provider.toLowerCase()}-account-${Math.random().toString(36).slice(2, 6)}`;
      const region = this.getRandomRegion(provider);
      const assetDisplayName = this.generateAssetDisplayName(provider, dataStore);
      const assetLocation = `${provider}/${region}/${assetDisplayName}`;
      
      return {
        assetCategory: 'CLOUD',
        cloudProvider: provider,
        dataStoreType: dataStore,
        saasTool: null,
        assetDisplayName,
        assetLocation,
        assetId,
        accountId,
      };
    } else if (supportedAssets.assetCategory === 'SAAS') {
      const saasTools = supportedAssets.saasTools;
      if (!saasTools || saasTools.length === 0) {
        return null;
      }
      
      // Select random SaaS tool from policy config
      const saasTool = saasTools[Math.floor(Math.random() * saasTools.length)] as SaasTool;
      
      // Generate synthetic asset details
      const assetId = `${saasTool.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`;
      const accountId = `org-${Math.random().toString(36).slice(2, 6)}`;
      const assetDisplayName = this.generateSaasAssetDisplayName(saasTool);
      const assetLocation = `${saasTool}/${assetDisplayName}`;
      
      return {
        assetCategory: 'SAAS',
        cloudProvider: null,
        dataStoreType: null,
        saasTool,
        assetDisplayName,
        assetLocation,
        assetId,
        accountId,
      };
    }
    
    return null;
  }
  
  private getRandomRegion(provider: CloudProvider): string {
    const regions: Record<CloudProvider, string[]> = {
      AWS: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
      GCP: ['us-central1', 'us-east1', 'europe-west1', 'asia-east1'],
      AZURE: ['eastus', 'westus2', 'westeurope', 'southeastasia'],
    };
    const providerRegions = regions[provider];
    return providerRegions[Math.floor(Math.random() * providerRegions.length)];
  }
  
  private generateAssetDisplayName(provider: CloudProvider, dataStore: DataStoreType): string {
    const prefixes: Record<string, string[]> = {
      S3: ['data-', 'logs-', 'backup-', 'analytics-'],
      RDS: ['prod-db-', 'staging-db-', 'analytics-db-'],
      DYNAMODB: ['users-', 'sessions-', 'events-'],
      API_GATEWAY: ['api-', 'gateway-', 'public-api-'],
      CLOUDWATCH: ['logs-', 'metrics-', 'alarms-'],
      GCS: ['data-', 'exports-', 'backups-'],
      BIGQUERY: ['analytics-', 'warehouse-', 'reports-'],
      CLOUDSQL: ['app-db-', 'replica-', 'main-db-'],
      PUBSUB: ['events-', 'notifications-', 'stream-'],
      CLOUDLOGGING: ['app-logs-', 'audit-logs-', 'system-logs-'],
      BLOB_STORAGE: ['documents-', 'media-', 'archive-'],
      SQL_DATABASE: ['primary-', 'reporting-', 'app-db-'],
      COSMOS_DB: ['global-data-', 'session-store-', 'catalog-'],
      API_MANAGEMENT: ['api-mgmt-', 'gateway-', 'apis-'],
      MONITOR: ['diagnostics-', 'metrics-', 'logs-'],
    };
    const prefix = prefixes[dataStore]?.[Math.floor(Math.random() * (prefixes[dataStore]?.length || 1))] || 'resource-';
    return `${prefix}${Math.random().toString(36).slice(2, 8)}`;
  }
  
  private generateSaasAssetDisplayName(saasTool: SaasTool): string {
    const patterns: Record<SaasTool, string[]> = {
      JIRA: ['PROJ-', 'TEAM-', 'DEV-'],
      SERVICENOW: ['incident-', 'request-', 'change-'],
      GITHUB: ['repo-', 'org-', 'project-'],
      SNOWFLAKE: ['warehouse-', 'database-', 'schema-'],
      GRAFANA: ['dashboard-', 'alerts-', 'panel-'],
    };
    const prefix = patterns[saasTool]?.[Math.floor(Math.random() * (patterns[saasTool]?.length || 1))] || 'asset-';
    return `${prefix}${Math.random().toString(36).slice(2, 8)}`;
  }
  
  private createPolicySnapshot(policy: Policy): PolicySnapshot {
    const { definition } = policy;
    const remConfig = definition.remediation;
    
    return {
      violationType: definition.violationType,
      supportedAssets: definition.supportedAssets,
      remediationType: remConfig?.remediationType || null,
      autoRemediate: remConfig?.autoRemediate || false,
      remediationPriority: remConfig?.remediationPriority || null,
      remediationDue: remConfig?.remediationDue || null,
    };
  }
  
  private generateDescription(policy: Policy, assetContext: {
    assetCategory: AssetCategory;
    cloudProvider: CloudProvider | null;
    dataStoreType: DataStoreType | null;
    saasTool: SaasTool | null;
    assetDisplayName: string;
    assetLocation: string;
    assetId: string;
  }): string {
    const violationType = policy.definition.violationType;
    const assetType = assetContext.dataStoreType || assetContext.saasTool || 'resource';
    const assetName = assetContext.assetDisplayName;
    
    const descriptions: Record<string, string> = {
      'SENSITIVE_DATA_EXPOSED': `Sensitive data detected in ${assetType} "${assetName}" without proper encryption controls.`,
      'UNENCRYPTED_DATA': `Unencrypted data found in ${assetType} "${assetName}". TLS/SSL encryption required.`,
      'OVERLY_PERMISSIVE_ACCESS': `${assetType} "${assetName}" has overly permissive access permissions.`,
      'DATA_RETENTION_EXCEEDED': `Data in ${assetType} "${assetName}" has exceeded the configured retention period.`,
      'MISSING_CLASSIFICATION': `Asset "${assetName}" is missing required data classification tags.`,
      'PUBLIC_ACCESS': `${assetType} "${assetName}" has public access enabled which may violate security policies.`,
    };
    
    return descriptions[violationType] || `Policy violation detected for asset ${assetContext.assetId}`;
  }
  
  private generateSampleItems(assetContext: {
    assetCategory: AssetCategory;
    cloudProvider?: CloudProvider | null;
    dataStoreType?: DataStoreType | null;
    saasTool?: SaasTool | null;
    assetDisplayName: string;
  }, matchedCount: number): string[] {
    const samples: string[] = [];
    const count = Math.min(5, matchedCount);
    const extensions = ['csv', 'json', 'parquet', 'xlsx'];
    const prefixes = ['data', 'export', 'backup', 'archive', 'report'];
    
    for (let i = 0; i < count; i++) {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const ext = extensions[Math.floor(Math.random() * extensions.length)];
      const id = Math.random().toString(36).slice(2, 8);
      samples.push(`${assetContext.assetDisplayName}/${prefix}_${id}.${ext}`);
    }
    
    return samples;
  }
  
  private generateRemediation(policy: Policy): AlertRemediation | null {
    const remConfig = policy.definition.remediation;
    if (!remConfig || !remConfig.remediationType || remConfig.remediationType === 'NO_REMEDIATION_AVAILABLE') {
      return null;
    }
    
    // Calculate due date from remediationDue
    let dueDate: string | undefined;
    if (remConfig.remediationDue) {
      let dueMs = 0;
      switch (remConfig.remediationDue.unit) {
        case 'MINUTES': dueMs = remConfig.remediationDue.value * 60 * 1000; break;
        case 'HOURS': dueMs = remConfig.remediationDue.value * 60 * 60 * 1000; break;
        case 'DAYS': dueMs = remConfig.remediationDue.value * 24 * 60 * 60 * 1000; break;
      }
      dueDate = new Date(Date.now() + dueMs).toISOString();
    }
    
    return {
      type: remConfig.remediationType,
      priority: remConfig.remediationPriority || 'MEDIUM',
      dueDate,
      autoRemediate: remConfig.autoRemediate,
    };
  }
  
  // Get current scan status (is any scan running?)
  getCurrentStatus(): {
    status: 'IDLE' | 'RUNNING';
    scanId?: string;
    startedAt?: string;
  } {
    const runningRow = this.db.prepare(`
      SELECT id, started_at
      FROM scan_runs
      WHERE status = 'RUNNING'
      ORDER BY started_at DESC
      LIMIT 1
    `).get() as { id: string; started_at: string } | undefined;
    
    if (runningRow) {
      return {
        status: 'RUNNING',
        scanId: runningRow.id,
        startedAt: runningRow.started_at,
      };
    }
    
    return { status: 'IDLE' };
  }
  
  // Get the most recently completed scan
  getLastCompletedScan(): ScanRun | null {
    const row = this.db.prepare(`
      SELECT id, status, started_at, completed_at, scanned_assets_count, alerts_created_count
      FROM scan_runs
      WHERE status = 'COMPLETED'
      ORDER BY completed_at DESC
      LIMIT 1
    `).get() as ScanRunRow | undefined;
    
    return row ? this.rowToScanRun(row) : null;
  }
  
  getAll(): ScanRun[] {
    const rows = this.db.prepare(`
      SELECT id, status, started_at, completed_at, scanned_assets_count, alerts_created_count
      FROM scan_runs
      ORDER BY started_at DESC
    `).all() as ScanRunRow[];
    
    return rows.map(this.rowToScanRun);
  }
  
  getById(id: string): ScanRun | null {
    const row = this.db.prepare(`
      SELECT id, status, started_at, completed_at, scanned_assets_count, alerts_created_count
      FROM scan_runs
      WHERE id = ?
    `).get(id) as ScanRunRow | undefined;
    
    return row ? this.rowToScanRun(row) : null;
  }
  
  private rowToScanRun(row: ScanRunRow): ScanRun {
    return {
      id: row.id,
      status: row.status as ScanRun['status'],
      startedAt: row.started_at,
      completedAt: row.completed_at || undefined,
      scannedAssetsCount: row.scanned_assets_count,
      alertsCreatedCount: row.alerts_created_count,
    };
  }
}
