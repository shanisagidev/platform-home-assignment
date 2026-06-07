import type { Database } from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { Policy, PolicyDefinition, Severity } from "../models/policy.model.js";
import type {
  PolicyRow,
  PolicyCreateRequest,
  PolicyUpdateRequest,
} from "../types/api.js";

const POLICY_LIMIT = 30;

export class PolicyService {
  constructor(private db: Database) {}

  getCount(): number {
    const result = this.db
      .prepare("SELECT COUNT(*) as count FROM policies")
      .get() as { count: number };
    return result.count;
  }

  canCreatePolicy(): boolean {
    return this.getCount() < POLICY_LIMIT;
  }

  getAll(): Policy[] {
    const rows = this.db
      .prepare(
        `
      SELECT id, name, severity, enabled, description, definition, is_system_policy, created_at, updated_at
      FROM policies
      ORDER BY 
        CASE severity
          WHEN 'CRITICAL' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MEDIUM' THEN 3
          WHEN 'LOW' THEN 4
        END,
        name
    `
      )
      .all() as PolicyRow[];

    return rows.map(this.rowToPolicy);
  }

  getById(id: string): Policy | null {
    const row = this.db
      .prepare(
        `
      SELECT id, name, severity, enabled, description, definition, is_system_policy, created_at, updated_at
      FROM policies
      WHERE id = ?
    `
      )
      .get(id) as PolicyRow | undefined;

    return row ? this.rowToPolicy(row) : null;
  }

  create(data: PolicyCreateRequest): Policy {
    const id = `custom_${uuidv4().slice(0, 8)}`;
    const createdAt = new Date().toISOString();

    this.db
      .prepare(
        `
      INSERT INTO policies (id, name, severity, enabled, description, definition, is_system_policy, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `
      )
      .run(
        id,
        data.name,
        data.severity,
        data.enabled ? 1 : 0,
        data.description,
        JSON.stringify(data.definition),
        createdAt
      );

    return this.getById(id)!;
  }

  update(id: string, updates: PolicyUpdateRequest): Policy | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const updatedAt = new Date().toISOString();

    // Build dynamic update query
    const fields: string[] = ["updated_at = ?"];
    const values: (string | number)[] = [updatedAt];

    if (updates.name !== undefined) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.severity !== undefined) {
      fields.push("severity = ?");
      values.push(updates.severity);
    }
    if (updates.enabled !== undefined) {
      fields.push("enabled = ?");
      values.push(updates.enabled ? 1 : 0);
    }
    if (updates.description !== undefined) {
      fields.push("description = ?");
      values.push(updates.description);
    }
    if (updates.definition !== undefined) {
      fields.push("definition = ?");
      values.push(JSON.stringify(updates.definition));
    }

    values.push(id);

    this.db
      .prepare(
        `
      UPDATE policies
      SET ${fields.join(", ")}
      WHERE id = ?
    `
      )
      .run(...values);

    return this.getById(id);
  }

  delete(id: string): { success: boolean; error?: string } {
    const existing = this.getById(id);
    if (!existing) {
      return { success: false, error: "Policy not found" };
    }

    if (existing.isSystemPolicy) {
      return { success: false, error: "Cannot delete system policy" };
    }

    // Temporarily disable foreign key checks to allow deletion
    // Alerts will remain with their policyName for historical reference
    this.db.pragma("foreign_keys = OFF");
    try {
      this.db.prepare("DELETE FROM policies WHERE id = ?").run(id);
    } finally {
      this.db.pragma("foreign_keys = ON");
    }

    return { success: true };
  }

  private rowToPolicy(row: PolicyRow): Policy {
    return {
      id: row.id,
      name: row.name,
      severity: row.severity as Severity,
      enabled: row.enabled === 1,
      description: row.description,
      definition: JSON.parse(row.definition) as PolicyDefinition,
      isSystemPolicy: row.is_system_policy === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at || undefined,
    };
  }
}
