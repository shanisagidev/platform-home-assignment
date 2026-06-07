# Mock DSPM Portal

A deliberate automation testing target application for Full-Stack Automation Engineer assessments.

## Quick Start

### Prerequisites

- **Docker Desktop** installed and running (includes Docker Compose v2)

### Start the Application

```bash
docker compose up -d
```

### Verify Installation

Wait ~10 seconds for containers to start, then run:

```bash
./scripts/healthcheck.sh
```

Or manually verify:

```bash
curl http://localhost:8080/api/health
curl http://localhost:3000
```

### Access the Application

| Service | URL                     |
| ------- | ----------------------- |
| Web UI  | http://localhost:3000   |
| API     | http://localhost:8080   |

### Login Credentials

| Username | Password |
| -------- | -------- |
| admin    | Aa123456 |

---

## Port Conflicts

If ports 3000 or 8080 are already in use on your machine:

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and change the ports:
   ```
   WEB_PORT=3001
   API_PORT=8081
   ```

3. Restart the containers:
   ```bash
   docker compose down
   docker compose up -d
   ```

4. Access the application on the new ports:
   - Web UI: http://localhost:3001
   - API: http://localhost:8081

---

## Architecture

```
├── apps/
│   ├── api/     # Node.js + Express + SQLite
│   └── web/     # React + Vite + TypeScript
├── scripts/
│   └── healthcheck.sh  # Verify installation
└── docker-compose.yml
```

## API Endpoints

| Method | Endpoint                  | Description       |
| ------ | ------------------------- | ----------------- |
| GET    | /api/health               | Health check      |
| POST   | /api/login                | Authenticate user |
| GET    | /api/policies             | List policies     |
| GET    | /api/alerts               | List alerts       |
| POST   | /api/scans                | Start a scan      |
| PATCH  | /api/alerts/:id           | Update alert      |
| POST   | /api/alerts/:id/remediate | Remediate alert   |
| GET    | /api/policy-config        | Get configuration |

**Authentication:** All endpoints (except `/api/login` and `/api/health`) require:

```
Authorization: Bearer <token>
```

## Key Features

- **Policies**: 8 seeded policies with severity levels and remediation config
- **Scans**: Generate alerts from policy evaluations
- **Alerts**: Status tracking, remediation flow, audit trail
- **Auto-remediation**: Policies can auto-remediate alerts

## Alert Status Flow

```
OPEN → IN_PROGRESS → RESOLVED
           ↓
   REMEDIATION_IN_PROGRESS → AWAITING_VERIFICATION → RESOLVED
```

See [Alert Status Flow](docs/alert-status-flowchart.md) for full details.

## Locator Strategy (for Automation)

This app intentionally **avoids overusing data-testid**. Use:

- `getByRole()` - buttons, links, dialogs
- `getByLabel()` - form inputs
- `getByText()` - status badges, visible text
- CSS selectors - table rows, cells

## Docker Commands

```bash
# Start (detached)
docker compose up -d

# Stop
docker compose down

# Rebuild (after code changes)
docker compose build --no-cache

# Reset database
docker compose down -v && docker compose up -d

# View logs
docker compose logs -f

# Check container status
docker compose ps
```

## Troubleshooting

### Health check fails

```bash
# Check if containers are running
docker compose ps

# View container logs
docker compose logs

# Wait and retry
sleep 10 && ./scripts/healthcheck.sh
```

### Reset everything

```bash
docker compose down -v
docker compose up -d
```

### Port already in use

See [Port Conflicts](#port-conflicts) section above.

## Documentation

| Document                                            | Description           |
| --------------------------------------------------- | --------------------- |
| [Docker Commands](docs/docker-commands.md)          | Full Docker reference |
| [Alert Status Flow](docs/alert-status-flowchart.md) | Status transitions    |
