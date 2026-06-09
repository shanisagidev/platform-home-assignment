import type { APIRequestContext } from '@playwright/test';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const API_BASE_URL = 'http://localhost:8080';

export const POLL_INTERVAL_MS = 3_000;
export const REMEDIATION_TIMEOUT_MS = 120_000;
export const SCAN_TIMEOUT_MS = 90_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Alert {
  id: string;
  status: string;
  policyId: string;
  violationType: string;
  assetDisplayName: string;
  policySnapshot?: {
    autoRemediate: boolean;
  };
  comments?: AlertComment[];
}

export interface AlertComment {
  id: string;
  message: string;
  author: { id: string; name: string };
  createdAt: string;
}

export interface ScanRun {
  id: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(
  request: APIRequestContext,
  credentials: { username: string; password: string },
): Promise<string> {
  const res = await request.post(`${API_BASE_URL}/api/login`, {
    data: credentials,
  });
  if (!res.ok()) {
    throw new Error(`Login failed with status ${res.status()}`);
  }
  const body = await res.json();
  return body.token as string;
}

// ---------------------------------------------------------------------------
// Scans
// ---------------------------------------------------------------------------

export async function startScan(
  request: APIRequestContext,
  headers: Record<string, string>,
): Promise<ScanRun> {
  const res = await request.post(`${API_BASE_URL}/api/scans`, { headers });
  if (res.status() !== 201) {
    throw new Error(`Start scan failed with status ${res.status()}`);
  }
  return res.json() as Promise<ScanRun>;
}

export async function waitForScanToComplete(
  request: APIRequestContext,
  headers: Record<string, string>,
  scanId: string,
  timeoutMs = SCAN_TIMEOUT_MS,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await request.get(`${API_BASE_URL}/api/scans/${scanId}`, { headers });
    if (!res.ok()) throw new Error(`GET /api/scans/${scanId} returned ${res.status()}`);
    const body: ScanRun = await res.json();
    if (body.status === 'COMPLETED') return;
    await delay(POLL_INTERVAL_MS);
  }
  throw new Error(`Scan ${scanId} did not complete within ${timeoutMs / 1000}s`);
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

/**
 * Searches for the first alert in OPEN or REMEDIATION_IN_PROGRESS status
 * that has autoRemediate: true in its policy snapshot.
 * Returns the alert ID.
 */
export async function findAutoRemediateAlert(
  request: APIRequestContext,
  headers: Record<string, string>,
): Promise<string> {
  for (const status of ['OPEN', 'REMEDIATION_IN_PROGRESS']) {
    const res = await request.get(
      `${API_BASE_URL}/api/alerts?status=${status}`,
      { headers },
    );
    if (!res.ok()) throw new Error(`GET /api/alerts?status=${status} returned ${res.status()}`);
    const alerts: Alert[] = await res.json();
    const match = alerts.find((a) => a.policySnapshot?.autoRemediate === true);
    if (match) {
      console.log(`Found auto-remediate alert: id=${match.id}, status=${match.status}`);
      return match.id;
    }
  }
  throw new Error(
    'No alert with Auto Remediate ON found in OPEN or REMEDIATION_IN_PROGRESS status',
  );
}

/**
 * Polls GET /api/alerts/:id until status is REMEDIATED_WAITING_FOR_CUSTOMER.
 */
export async function waitForAutoRemediation(
  request: APIRequestContext,
  headers: Record<string, string>,
  alertId: string,
  timeoutMs = REMEDIATION_TIMEOUT_MS,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await request.get(`${API_BASE_URL}/api/alerts/${alertId}`, { headers });
    if (!res.ok()) throw new Error(`GET /api/alerts/${alertId} returned ${res.status()}`);
    const alert: Alert = await res.json();
    if (alert.status === 'REMEDIATED_WAITING_FOR_CUSTOMER') {
      console.log(`Alert ${alertId} remediation complete`);
      return;
    }
    console.log(`Waiting for remediation… current status: ${alert.status}`);
    await delay(POLL_INTERVAL_MS);
  }
  throw new Error(
    `Alert ${alertId} did not reach REMEDIATED_WAITING_FOR_CUSTOMER within ${timeoutMs / 1000}s`,
  );
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function resetTestData(
  request: APIRequestContext,
  headers: Record<string, string>,
): Promise<void> {
  await request.post(`${API_BASE_URL}/api/admin/reset`, { headers });
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
