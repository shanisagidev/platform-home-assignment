import { Router } from "express";
import type { Database } from "better-sqlite3";
import { AlertService } from "../services/alert.service.js";
import {
  ALL_STATUSES,
  VALID_TRANSITIONS,
  REMEDIATABLE_STATUSES,
} from "../models/alert.model.js";
import type { AlertStatus } from "../models/alert.model.js";

const VALID_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

// Random delay between 10 seconds and 50 seconds (in ms)
function getRandomDelay(): number {
  return Math.floor(Math.random() * (50000 - 10000 + 1)) + 10000;
}

export function createAlertsRoutes(db: Database): Router {
  const router = Router();
  const alertService = new AlertService(db);

  // GET /api/alerts - List all alerts with optional filters
  router.get("/", (req, res) => {
    const { status, severity, policyId, runId } = req.query;

    const filters: Record<string, string> = {};
    if (typeof status === "string") filters.status = status;
    if (typeof severity === "string") filters.severity = severity;
    if (typeof policyId === "string") filters.policyId = policyId;
    if (typeof runId === "string") filters.runId = runId;

    const alerts = alertService.getAll(filters);
    res.json(alerts);
  });

  // GET /api/alerts/statuses - Get available statuses and valid transitions
  router.get("/statuses", (_req, res) => {
    res.json({
      allStatuses: ALL_STATUSES,
      validTransitions: VALID_TRANSITIONS,
      remediatableStatuses: REMEDIATABLE_STATUSES,
    });
  });

  // GET /api/alerts/:id - Get single alert (includes comments)
  router.get("/:id", (req, res) => {
    const alert = alertService.getById(req.params.id);

    if (!alert) {
      res.status(404).json({ error: "Alert not found" });
      return;
    }

    // Include valid transitions for this alert's current status
    const validTransitions = alertService.getValidTransitions(alert.status);
    const canRemediate = alertService.canRemediate(alert.status);

    res.json({
      ...alert,
      validTransitions,
      canRemediate,
    });
  });

  // PATCH /api/alerts/:id - Update alert (status, severity, assignee)
  router.patch("/:id", (req, res) => {
    const { status, severity, assignedToId } = req.body;

    // Get current alert to check valid transitions
    const currentAlert = alertService.getById(req.params.id);
    if (!currentAlert) {
      res.status(404).json({ error: "Alert not found" });
      return;
    }

    // Validate status if provided
    if (status !== undefined) {
      // Check if status is a valid status
      if (!ALL_STATUSES.includes(status)) {
        res
          .status(400)
          .json({
            error: `Invalid status. Must be one of: ${ALL_STATUSES.join(", ")}`,
          });
        return;
      }

      // SYSTEM-only statuses cannot be set by user
      if (status === "REMEDIATION_IN_PROGRESS") {
        res
          .status(400)
          .json({
            error:
              "REMEDIATION_IN_PROGRESS can only be set via the remediate action endpoint (POST /api/alerts/:id/remediate).",
          });
        return;
      }

      // Check if transition is valid
      const validTransitions = alertService.getValidTransitions(
        currentAlert.status
      );
      if (!validTransitions.includes(status)) {
        res.status(400).json({
          error: `Invalid status transition from ${
            currentAlert.status
          } to ${status}. Valid transitions: ${
            validTransitions.length > 0 ? validTransitions.join(", ") : "none"
          }`,
        });
        return;
      }
    }

    // Validate severity if provided
    if (severity !== undefined && !VALID_SEVERITIES.includes(severity)) {
      res
        .status(400)
        .json({
          error: `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(
            ", "
          )}`,
        });
      return;
    }

    // Validate assignedToId if provided
    if (assignedToId !== undefined && assignedToId !== null) {
      const assignee = alertService.getAssigneeById(assignedToId);
      if (!assignee) {
        res.status(400).json({ error: "Invalid assignee ID" });
        return;
      }
    }

    const result = alertService.update(req.params.id, {
      status,
      severity,
      assignedToId,
    });

    if (result === null) {
      res.status(404).json({ error: "Alert not found" });
      return;
    }

    if (result === "invalid_transition") {
      res.status(400).json({ error: "Invalid status transition" });
      return;
    }

    // Add valid transitions to response
    const validTransitions = alertService.getValidTransitions(result.status);
    const canRemediate = alertService.canRemediate(result.status);

    res.json({
      ...result,
      validTransitions,
      canRemediate,
    });
  });

  // POST /api/alerts/:id/comments - Add comment to alert
  router.post("/:id/comments", (req, res) => {
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    // Use a simple author for now (would come from auth in real app)
    const author = { id: "u_admin", name: "Admin" };

    const comment = alertService.addComment(
      req.params.id,
      message.trim(),
      author
    );

    if (!comment) {
      res.status(404).json({ error: "Alert not found" });
      return;
    }

    res.status(201).json(comment);
  });

  // POST /api/alerts/:id/remediate - Start manual remediation
  // This triggers: IN_PROGRESS -> REMEDIATION_IN_PROGRESS -> REMEDIATED_WAITING_FOR_CUSTOMER
  router.post("/:id/remediate", (req, res) => {
    const { note } = req.body || {};

    const result = alertService.startRemediation(req.params.id, note);

    if (result === null) {
      res.status(404).json({ error: "Alert not found" });
      return;
    }

    if (result === "cannot_remediate") {
      const alert = alertService.getById(req.params.id);
      res.status(400).json({
        error: `Cannot remediate alert in status ${
          alert?.status
        }. Remediation is only available from: ${REMEDIATABLE_STATUSES.join(
          ", "
        )}`,
      });
      return;
    }

    // Schedule async completion after random delay (10s - 2min)
    const delay = getRandomDelay();
    console.log(
      `[Remediation] Alert ${
        req.params.id
      }: starting remediation, will complete in ${Math.round(delay / 1000)}s`
    );

    const alertId = req.params.id;
    setTimeout(() => {
      try {
        console.log(
          `[Remediation] Alert ${alertId}: completing manual remediation`
        );
        alertService.completeManualRemediation(alertId);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('FOREIGN KEY') || message.includes('no such') || message.includes('not found')) {
          console.log(`[Remediation] Alert ${alertId} no longer exists (likely reset)`);
        } else {
          console.error(`[Remediation] Error completing remediation for ${alertId}:`, error);
        }
      }
    }, delay);

    // Return immediately with REMEDIATION_IN_PROGRESS status
    const validTransitions = alertService.getValidTransitions(result.status);
    const canRemediate = alertService.canRemediate(result.status);

    res.json({
      ...result,
      validTransitions,
      canRemediate,
      remediationEta: new Date(Date.now() + delay).toISOString(),
    });
  });

  // GET /api/alerts/:id/audit - Get audit trail for alert
  router.get("/:id/audit", (req, res) => {
    const alert = alertService.getById(req.params.id);

    if (!alert) {
      res.status(404).json({ error: "Alert not found" });
      return;
    }

    const events = alertService.getAuditEvents(req.params.id);
    res.json(events);
  });

  return router;
}

// Separate router for assignees
export function createAssigneesRoutes(db: Database): Router {
  const router = Router();
  const alertService = new AlertService(db);

  // GET /api/assignees - Get list of assignees
  router.get("/", (_req, res) => {
    const assignees = alertService.getAssignees();
    res.json(assignees);
  });

  return router;
}
