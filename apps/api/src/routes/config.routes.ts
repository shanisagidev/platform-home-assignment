import { Router } from 'express';
import {
  CLOUD_PROVIDERS,
  CLOUD_DATA_STORES,
  SAAS_TOOLS,
  VIOLATION_TYPES,
  VIOLATION_TYPE_LABELS,
  DATA_CLASSIFICATION_CATEGORIES,
  REMEDIATION_TYPES,
  REMEDIATION_TYPE_LABELS,
  REMEDIATION_PRIORITIES,
  REMEDIATION_DUE_UNITS,
} from '../models/policy.model.js';
import { ALL_STATUSES, STATUS_LABELS } from '../models/alert.model.js';

// Display labels for cloud providers
const CLOUD_PROVIDER_LABELS: Record<string, string> = {
  AWS: 'AWS',
  GCP: 'Google Cloud',
  AZURE: 'Azure',
};

// Display labels for data stores (per provider)
const CLOUD_DATASTORE_LABELS: Record<string, Record<string, string>> = {
  AWS: {
    S3: 'S3',
    RDS: 'RDS',
    DYNAMODB: 'DynamoDB',
    API_GATEWAY: 'API Gateway',
    CLOUDWATCH: 'CloudWatch',
  },
  GCP: {
    GCS: 'Cloud Storage',
    BIGQUERY: 'BigQuery',
    CLOUDSQL: 'Cloud SQL',
    PUBSUB: 'Pub/Sub',
    CLOUDLOGGING: 'Cloud Logging',
  },
  AZURE: {
    BLOB_STORAGE: 'Blob Storage',
    SQL_DATABASE: 'SQL Database',
    COSMOS_DB: 'Cosmos DB',
    API_MANAGEMENT: 'API Management',
    MONITOR: 'Monitor',
  },
};

// Display labels for SaaS tools
const SAAS_TOOL_LABELS: Record<string, string> = {
  JIRA: 'Jira',
  SERVICENOW: 'ServiceNow',
  GITHUB: 'GitHub',
  SNOWFLAKE: 'Snowflake',
  GRAFANA: 'Grafana',
};

// Severity labels
const SEVERITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

// Data classification labels
const DATA_CLASSIFICATION_LABELS: Record<string, string> = {
  USER_DATA: 'User Data',
  LOGS: 'Logs',
  ANALYTICS: 'Analytics',
};

// Remediation priority labels
const REMEDIATION_PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

// Remediation due unit labels
const REMEDIATION_DUE_UNIT_LABELS: Record<string, string> = {
  MINUTES: 'Minutes',
  HOURS: 'Hours',
  DAYS: 'Days',
};

export function createConfigRoutes(): Router {
  const router = Router();

  // GET /api/policy-config - Return all policy configuration options with labels
  router.get('/', (_req, res) => {
    const config = {
      assets: {
        cloudProviders: [...CLOUD_PROVIDERS],
        cloudDataStoresByProvider: {
          AWS: [...CLOUD_DATA_STORES.AWS],
          GCP: [...CLOUD_DATA_STORES.GCP],
          AZURE: [...CLOUD_DATA_STORES.AZURE],
        },
        saasTools: [...SAAS_TOOLS],
      },
      enums: {
        violationTypes: [...VIOLATION_TYPES],
        severities: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        dataClassificationCategories: [...DATA_CLASSIFICATION_CATEGORIES],
        remediationTypes: [...REMEDIATION_TYPES],
        remediationPriorities: [...REMEDIATION_PRIORITIES],
        remediationDueUnits: [...REMEDIATION_DUE_UNITS],
        alertStatuses: [...ALL_STATUSES],
      },
      labels: {
        cloudProviders: CLOUD_PROVIDER_LABELS,
        cloudDatastores: CLOUD_DATASTORE_LABELS,
        saasTools: SAAS_TOOL_LABELS,
        violationTypes: VIOLATION_TYPE_LABELS,
        severities: SEVERITY_LABELS,
        remediationTypes: REMEDIATION_TYPE_LABELS,
        dataClassificationCategories: DATA_CLASSIFICATION_LABELS,
        remediationPriorities: REMEDIATION_PRIORITY_LABELS,
        remediationDueUnits: REMEDIATION_DUE_UNIT_LABELS,
        alertStatuses: STATUS_LABELS,
      },
    };

    res.json(config);
  });

  return router;
}
