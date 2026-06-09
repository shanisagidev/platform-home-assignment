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

- **Docker** and **Docker Compose** must be running (starts the API on `http://localhost:8080` and the web app on `http://localhost:3000`)
- **Node.js** ≥ 18
- Playwright browsers installed

---

## Setup

### 1. Start the application stack

```bash
docker-compose up --build
```

Wait for both services to be healthy before running tests.

### 2. Install dependencies

```bash
# From the repo root
npm install

# Install Playwright browsers (first time only)
npx playwright install
```

---

## Running the Tests

All commands are run from the **repo root** (`platform-home-assignment/`).

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests headlessly (Chromium) |
| `npm run test:headed` | Run all tests with a visible browser window |
| `npm run test:ui` | Open Playwright's interactive UI mode |
| `npm run test:debug` | Run with the step-by-step debugger |
| `npm run test:report` | Open the last HTML test report |

### Run a specific test file

```bash
npx playwright test alert-life-cycle.spec.ts
npx playwright test auto-remediation-api.spec.ts
```

### Run with trace / video on failure

Traces and videos are automatically captured on failure (configured in `playwright.config.ts`). View them via the HTML report:

```bash
npm run test:report
```

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
