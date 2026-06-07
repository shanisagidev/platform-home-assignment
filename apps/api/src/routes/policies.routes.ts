import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { PolicyService } from '../services/policy.service.js';
import { 
  VIOLATION_TYPES, 
  REMEDIATION_TYPES, 
  REMEDIATION_PRIORITIES,
  REMEDIATION_DUE_UNITS,
  ASSET_CATEGORIES,
  CLOUD_PROVIDERS,
  SAAS_TOOLS,
  isRemediationEnabled
} from '../models/policy.model.js';
import type { PolicyCreateRequest, PolicyUpdateRequest } from '../types/api.js';
import type { PolicyDefinition } from '../models/policy.model.js';

function validateDefinition(definition: PolicyDefinition): string | null {
  // Validate supportedAssets
  if (!definition.supportedAssets) {
    return 'definition.supportedAssets is required';
  }
  
  const { supportedAssets } = definition;
  
  if (!ASSET_CATEGORIES.includes(supportedAssets.assetCategory as typeof ASSET_CATEGORIES[number])) {
    return `assetCategory must be one of: ${ASSET_CATEGORIES.join(', ')}`;
  }
  
  if (supportedAssets.assetCategory === 'CLOUD') {
    if (!supportedAssets.cloudProviders || supportedAssets.cloudProviders.length === 0) {
      return 'At least one cloud provider with data stores is required';
    }
    for (const cp of supportedAssets.cloudProviders) {
      if (!CLOUD_PROVIDERS.includes(cp.provider as typeof CLOUD_PROVIDERS[number])) {
        return `Invalid cloud provider: ${cp.provider}`;
      }
      if (!cp.dataStores || cp.dataStores.length === 0) {
        return `At least one data store is required for ${cp.provider}`;
      }
    }
  } else if (supportedAssets.assetCategory === 'SAAS') {
    if (!supportedAssets.saasTools || supportedAssets.saasTools.length === 0) {
      return 'At least one SaaS tool is required';
    }
    for (const tool of supportedAssets.saasTools) {
      if (!SAAS_TOOLS.includes(tool as typeof SAAS_TOOLS[number])) {
        return `Invalid SaaS tool: ${tool}`;
      }
    }
  }
  
  // Validate violationType
  if (!definition.violationType || !VIOLATION_TYPES.includes(definition.violationType as typeof VIOLATION_TYPES[number])) {
    return `violationType is required and must be one of: ${VIOLATION_TYPES.join(', ')}`;
  }
  
  // Validate remediation config
  if (!definition.remediation) {
    return 'definition.remediation is required';
  }
  
  const { remediation } = definition;
  
  // remediationType can be null (no remediation)
  if (remediation.remediationType !== null) {
    if (!REMEDIATION_TYPES.includes(remediation.remediationType as typeof REMEDIATION_TYPES[number])) {
      return `remediationType must be null or one of: ${REMEDIATION_TYPES.join(', ')}`;
    }
    
    // If remediation is enabled, validate priority and due
    if (isRemediationEnabled(remediation)) {
      if (!remediation.remediationPriority || !REMEDIATION_PRIORITIES.includes(remediation.remediationPriority as typeof REMEDIATION_PRIORITIES[number])) {
        return `remediationPriority is required when remediationType is enabled. Must be one of: ${REMEDIATION_PRIORITIES.join(', ')}`;
      }
      if (!remediation.remediationDue || typeof remediation.remediationDue.value !== 'number' || remediation.remediationDue.value <= 0) {
        return 'remediationDue.value must be a positive number when remediationType is enabled';
      }
      if (!REMEDIATION_DUE_UNITS.includes(remediation.remediationDue.unit as typeof REMEDIATION_DUE_UNITS[number])) {
        return `remediationDue.unit must be one of: ${REMEDIATION_DUE_UNITS.join(', ')}`;
      }
    }
  }
  
  return null;
}

export function createPoliciesRoutes(db: Database): Router {
  const router = Router();
  const policyService = new PolicyService(db);
  
  // GET /api/policies - List all policies
  router.get('/', (_req, res) => {
    const policies = policyService.getAll();
    res.json(policies);
  });
  
  // POST /api/policies - Create a new policy
  router.post('/', (req, res) => {
    const { name, severity, enabled, description, definition } = req.body as PolicyCreateRequest;
    
    // Validate required fields
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity)) {
      res.status(400).json({ error: 'severity must be LOW, MEDIUM, HIGH, or CRITICAL' });
      return;
    }
    if (typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'enabled must be a boolean' });
      return;
    }
    if (!description || typeof description !== 'string') {
      res.status(400).json({ error: 'description is required' });
      return;
    }
    if (!definition) {
      res.status(400).json({ error: 'definition is required' });
      return;
    }
    
    // Validate definition structure
    const definitionError = validateDefinition(definition);
    if (definitionError) {
      res.status(400).json({ error: definitionError });
      return;
    }
    
    // Check policy limit
    if (!policyService.canCreatePolicy()) {
      res.status(409).json({ error: 'Policy limit reached (30). Delete an existing policy to create a new one.' });
      return;
    }
    
    const policy = policyService.create({
      name,
      severity,
      enabled,
      description,
      definition,
    });
    
    res.status(201).json(policy);
  });
  
  // GET /api/policies/:id - Get single policy
  router.get('/:id', (req, res) => {
    const policy = policyService.getById(req.params.id);
    
    if (!policy) {
      res.status(404).json({ error: 'Policy not found' });
      return;
    }
    
    res.json(policy);
  });
  
  // PATCH /api/policies/:id - Update policy
  router.patch('/:id', (req, res) => {
    const updates: PolicyUpdateRequest = {};
    const { name, severity, enabled, description, definition } = req.body;
    
    // Validate and collect updates
    if (name !== undefined) {
      if (typeof name !== 'string') {
        res.status(400).json({ error: 'name must be a string' });
        return;
      }
      updates.name = name;
    }
    
    if (severity !== undefined) {
      if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity)) {
        res.status(400).json({ error: 'severity must be LOW, MEDIUM, HIGH, or CRITICAL' });
        return;
      }
      updates.severity = severity;
    }
    
    if (enabled !== undefined) {
      if (typeof enabled !== 'boolean') {
        res.status(400).json({ error: 'enabled must be a boolean' });
        return;
      }
      updates.enabled = enabled;
    }
    
    if (description !== undefined) {
      if (typeof description !== 'string') {
        res.status(400).json({ error: 'description must be a string' });
        return;
      }
      updates.description = description;
    }
    
    if (definition !== undefined) {
      const definitionError = validateDefinition(definition);
      if (definitionError) {
        res.status(400).json({ error: definitionError });
        return;
      }
      updates.definition = definition;
    }
    
    // Ensure at least one field is being updated
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'At least one field must be provided for update' });
      return;
    }
    
    const updated = policyService.update(req.params.id, updates);
    
    if (!updated) {
      res.status(404).json({ error: 'Policy not found' });
      return;
    }
    
    res.json(updated);
  });
  
  // DELETE /api/policies/:id - Delete policy
  router.delete('/:id', (req, res) => {
    const result = policyService.delete(req.params.id);
    
    if (!result.success) {
      if (result.error === 'Policy not found') {
        res.status(404).json({ error: result.error });
      } else if (result.error === 'Cannot delete system policy') {
        res.status(403).json({ error: result.error });
      } else {
        res.status(400).json({ error: result.error });
      }
      return;
    }
    
    res.status(204).send();
  });
  
  return router;
}
