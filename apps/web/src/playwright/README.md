# Playwright Automation Tests

End-to-end and API automation tests for the DSPM Portal, covering the full alert lifecycle — from scan initiation through remediation to resolution.

---

## Project Structure

```
playwright/
├── tests/
│   ├── alert-life-cycle.spec.ts        # E2E: Manual remediation flow (UI)
│   └── auto-remediation-api.spec.ts    # API: Auto-remediation flow (REST)
├── pages/
│   ├── login-page.ts                   # Login page object
│   ├── alerts-page.ts                  # Alerts page + detail drawer
│   ├── policies-page.ts                # Policies page (scan trigger)
│   └── upper-navbar.ts                 # Top navbar (reset environment)
├── fixtures/
│   └── pages.fixture.ts                # Custom test fixture wiring page objects
└── utils/
    └── api-helpers.ts                  # Shared REST API helpers (login, scan, poll)
```

---

## Test Suites

### 1. `alert-life-cycle.spec.ts` — Manual Remediation (UI / E2E)

**"Verify Alert lifecycle: Manual Remediation"**

Exercises the complete manual remediation workflow through the browser UI.

| Step | Action |
|------|--------|
| 1 | Log in as `admin` |
| 2 | Trigger a new security scan from the Policies page and wait for it to complete |
| 3 | Navigate to the Alerts page |
| 4 | Filter alerts by **Status: Open** and **Auto Remediate: OFF** |
| 5 | Open the first matching alert |
| 6 | Change status → **In Progress** |
| 7 | Assign alert to **Security Analyst** |
| 8 | Expand the Remediation section, add a remediation note, and click **Remediate** |
| 9 | Wait for status to automatically transition to **Awaiting User Verification** (up to 5 min) |
| 10 | Change status → **Resolved** |
| 11 | Add a comment and verify it is visible |
| ✦ Cleanup | Reset environment via the upper navbar after each test |

---

### 2. `auto-remediation-api.spec.ts` — Auto-Remediation (REST API)

**"Verify Alert lifecycle: Auto Remediation (REST API)"**

Validates the auto-remediation lifecycle using direct REST API calls (no browser required).

| Step | Action |
|------|--------|
| 1 | `POST /api/login` — acquire auth token |
| 2 | `POST /api/scans` — start a scan |
| 3 | Poll `GET /api/scans/:id` until status is `COMPLETED` |
| 4 | `GET /api/alerts` — find an alert with `autoRemediate: true` in `OPEN` or `REMEDIATION_IN_PROGRESS` |
| 5 | Poll `GET /api/alerts/:id` until status reaches `REMEDIATED_WAITING_FOR_CUSTOMER` |
| 6 | `PATCH /api/alerts/:id` — change status to `RESOLVED` |
| 7 | `POST /api/alerts/:id/comments` — add a verification comment |
| 8 | `GET /api/alerts/:id` — verify comment is persisted |
| 9 | Start a second scan and verify the resolved alert is **not re-detected** *(known bug — expected to fail)* |
| ✦ Cleanup | `POST /api/admin/reset` — reset test data after each test |

---

## Automation Flow Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                        Test Execution                         │
└───────────────────────────────────────────────────────────────┘

  [Login]
     │
     ▼
  [Trigger Security Scan]
     │
     ▼
  [Wait for Scan COMPLETED]
     │
     ▼
  [Find Matching Alert]
     │
     ├── Manual (UI):   Status=Open, AutoRemediate=OFF
     └── Auto   (API):  Status=Open|REMEDIATION_IN_PROGRESS, AutoRemediate=ON
     │
     ▼
  [Manual path]                          [Auto path]
  Change status → In Progress            Poll until REMEDIATED_WAITING_FOR_CUSTOMER
  Assign to Security Analyst                  │
  Add remediation note                        │
  Click Remediate                             │
  Wait → Awaiting User Verification ──────────┘
     │
     ▼
  [Change status → Resolved]
     │
     ▼
  [Add comment & verify]
     │
     ▼ (auto-api only)
  [Start 2nd scan → verify no re-detection]
     │
     ▼
  [Cleanup: Reset environment]
```

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Docker Desktop | Latest | Must be running before starting the stack |
| Docker Compose | v2 | Included with Docker Desktop; or `brew install docker-compose` on macOS |
| Node.js | ≥ 18 | Required for running tests |
| Playwright browsers | — | Installed via `npx playwright install` (first time only) |

---

## How to Start the System

All commands are run from the **repo root** (`platform-home-assignment/`).

### 1. Start the application stack

```bash
docker compose up -d
```

This starts two services:

| Service | URL |
|---------|-----|
| Web UI (React) | http://localhost:3000 |
| API (Express + SQLite) | http://localhost:8080 |

### 2. Verify the stack is healthy

Wait ~10 seconds, then run:

```bash
curl http://localhost:8080/api/health
```

Expected response: `{ "status": "ok" }`

To stop the stack:

```bash
docker compose down
```

To reset the database (wipe all data and restart fresh):

```bash
docker compose down -v && docker compose up -d
```

### 3. Install test dependencies

```bash
# From the repo root
npm install

# Install Playwright browsers (first time only)
npx playwright install
```

---

## How to Run UI Tests

The UI test (`alert-life-cycle.spec.ts`) launches a real Chromium browser and interacts with the web app at `http://localhost:3000`.

> The application stack must be running before executing UI tests.

```bash
# Run headlessly (default)
npx playwright test alert-life-cycle.spec.ts

# Run with a visible browser window
npx playwright test alert-life-cycle.spec.ts --headed

# Run in interactive UI mode (step through actions live)
npx playwright test alert-life-cycle.spec.ts --ui

# Run with the debugger (pauses at each step)
npx playwright test alert-life-cycle.spec.ts --debug
```

---

## How to Run API Tests

The API test (`auto-remediation-api.spec.ts`) makes direct REST calls to `http://localhost:8080` — no browser is launched.

> The application stack must be running before executing API tests.

```bash
# Run the API test
npx playwright test auto-remediation-api.spec.ts

# Run with verbose output
npx playwright test auto-remediation-api.spec.ts --reporter=line
```

> **Note:** Step 9 in this test is marked as a **known expected failure** (`test.fail()`). It documents a bug where resolved auto-remediated alerts are re-detected on the next scan. Playwright reports it as an "expected failure" — not a CI error.

---

## Running All Tests

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests headlessly (Chromium) |
| `npm run test:headed` | Run all tests with a visible browser window |
| `npm run test:ui` | Open Playwright's interactive UI mode |
| `npm run test:debug` | Run with the step-by-step debugger |
| `npm run test:report` | Open the last HTML test report |

### View results

Traces, screenshots, and videos are automatically captured on failure. View them via the HTML report:

```bash
npm run test:report
```

---

## Troubleshooting

### Tests fail immediately — cannot connect to server

Make sure the Docker stack is up and healthy:

```bash
docker compose ps
curl http://localhost:8080/api/health
```

### Tests leave dirty data between runs

Each test cleans up after itself, but if a test was aborted mid-run, data may remain. Reset manually:

```bash
docker compose down -v && docker compose up -d
```

### UI test times out waiting for scan or remediation

The backend remediation can take up to 5 minutes. The test timeout is set to 10 minutes to accommodate this. If you see consistent timeouts, check API logs:

```bash
docker compose logs api -f
```

### Port 3000 or 8080 already in use

Stop the conflicting process or change ports in a `.env` file (see the root `README.md` Port Conflicts section).

---

## Known Issues

| Issue | Test | Status |
|-------|------|--------|
| Resolved auto-remediated alerts are re-detected on the next scan | `auto-remediation-api.spec.ts` Step 9 | Known bug — marked `test.fail()`, reported as expected failure |

---

## Configuration

`playwright.config.ts` (repo root):

| Setting | Value |
|---------|-------|
| `baseURL` | `http://localhost:3000` |
| `testDir` | `apps/web/src/playwright/tests` |
| `reporter` | HTML |
| `trace` | On first retry |
| `screenshot` | On failure |
| `video` | Retained on failure |
| `retries` (CI) | 2 |
| `workers` (CI) | 1 (serial) |

---

## Page Objects

| Class | File | Responsibility |
|-------|------|----------------|
| `LoginPage` | `pages/login-page.ts` | Fill credentials and sign in |
| `PoliciesPage` | `pages/policies-page.ts` | Trigger scans, verify completion |
| `AlertsPage` | `pages/alerts-page.ts` | Filter alerts, open drawer, change status, assign, remediate, comment |
| `UpperNavbar` | `pages/upper-navbar.ts` | Reset the environment between tests |

---

## Test Credentials

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `Aa123456` |

> These are seeded test credentials for the local development environment only.
