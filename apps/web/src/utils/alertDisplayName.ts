/**
 * Generate a deterministic, human-readable Alert Display Name
 * Format: "Detected <Violation Type> in <Asset Type> \"<Asset Name>\"."
 * 
 * Examples:
 * - "Detected Overly Permissive Access in GITHUB \"repo-6bytfl\"."
 * - "Detected Sensitive Data Exposed in S3 \"customer-data-prod\"."
 * - "Detected Unencrypted Data in RDS \"orders-db\"."
 * 
 * This ensures:
 * - Re-detected alerts (same policy + asset) have the SAME display name
 * - Alerts are easily distinguishable without exposing raw IDs
 */

import type { Alert } from '../types/domain';
import type { PolicyConfigLabels } from '../services/policyConfig.service';

// Violation type labels for display (fallback if no config provided)
const VIOLATION_TYPE_LABELS: Record<string, string> = {
  'SENSITIVE_DATA_EXPOSED': 'Sensitive Data Exposed',
  'UNENCRYPTED_DATA': 'Unencrypted Data',
  'OVERLY_PERMISSIVE_ACCESS': 'Overly Permissive Access',
  'DATA_RETENTION_EXCEEDED': 'Data Retention Exceeded',
  'MISSING_CLASSIFICATION': 'Missing Classification',
  'PUBLIC_ACCESS': 'Public Access',
};

type AlertForDisplayName = Pick<Alert, 
  'policyName' | 'assetDisplayName' | 'violationType' | 
  'dataStoreType' | 'saasTool' | 'cloudProvider'
>;

export function getAlertDisplayName(
  alert: AlertForDisplayName, 
  configLabels?: PolicyConfigLabels | null
): string {
  // Get violation type label
  const violationType = alert.violationType || 'Unknown Violation';
  const violationLabel = configLabels?.violationTypes?.[violationType] 
    || VIOLATION_TYPE_LABELS[violationType] 
    || violationType.replace(/_/g, ' ');
  
  // Get asset type (prefer SaaS tool, then datastore, then provider)
  let assetType = 'Asset';
  if (alert.saasTool) {
    assetType = configLabels?.saasTools?.[alert.saasTool] || alert.saasTool;
  } else if (alert.dataStoreType) {
    // Get datastore label if available
    if (configLabels?.cloudDatastores && alert.cloudProvider) {
      const providerDatastores = configLabels.cloudDatastores[alert.cloudProvider];
      if (providerDatastores) {
        assetType = providerDatastores[alert.dataStoreType] || alert.dataStoreType;
      } else {
        assetType = alert.dataStoreType;
      }
    } else {
      assetType = alert.dataStoreType;
    }
  } else if (alert.cloudProvider) {
    assetType = configLabels?.cloudProviders?.[alert.cloudProvider] || alert.cloudProvider;
  }
  
  // Get asset name
  const assetName = alert.assetDisplayName || 'Unknown';
  
  return `Detected ${violationLabel} in ${assetType} "${assetName}".`;
}

/**
 * Get a shorter version for contexts where space is limited
 */
export function getAlertShortName(alert: Pick<Alert, 'policyName'>): string {
  return alert.policyName || 'Unknown Policy';
}
