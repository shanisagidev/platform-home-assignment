# Docker Commands for Mock DSPM Portal

This document contains all relevant Docker commands for building, running, and managing the Mock DSPM Portal.

## Prerequisites

- Docker Desktop installed and running
- Ports 8080 (API) and 3000 (Web) available

## Quick Start

```bash
# Build and start all services
docker compose up -d

# View logs
docker compose logs -f
```

## Building

### Build All Services
```bash
docker compose build
```

### Build with No Cache (Clean Build)
```bash
docker compose build --no-cache
```

### Build Specific Service
```bash
# Build only API
docker compose build api

# Build only Web
docker compose build web
```

## Running

### Start All Services (Detached)
```bash
docker compose up -d
```

### Start All Services (Foreground with Logs)
```bash
docker compose up
```

### Start Specific Service
```bash
docker compose up -d api
docker compose up -d web
```

## Stopping

### Stop All Services
```bash
docker compose down
```

### Stop and Remove Volumes (Clean Database)
```bash
docker compose down -v
```

### Stop Specific Service
```bash
docker compose stop api
docker compose stop web
```

## Logs

### View All Logs
```bash
docker compose logs
```

### Follow Logs (Live)
```bash
docker compose logs -f
```

### View Logs for Specific Service
```bash
docker compose logs api
docker compose logs web
```

### Follow Logs for Specific Service
```bash
docker compose logs -f api
```

### View Last N Lines
```bash
docker compose logs --tail=50 api
```

## Status & Health

### Check Running Containers
```bash
docker compose ps
```

### Check Container Health
```bash
docker inspect --format='{{.State.Health.Status}}' platform-home-assignment-api-1
```

## Troubleshooting

### Restart All Services
```bash
docker compose restart
```

### Restart Specific Service
```bash
docker compose restart api
```

### View Container Resource Usage
```bash
docker stats
```

### Execute Command in Running Container
```bash
# Access API container shell
docker compose exec api sh

# Access Web container shell
docker compose exec web sh
```

### Check API Health Endpoint
```bash
curl http://localhost:8080/api/health
```

### Check Policy Config Endpoint
```bash
curl -s "http://localhost:8080/api/policy-config" -H "Authorization: Bearer test" | python3 -m json.tool
```

## Complete Reset

### Full Cleanup and Rebuild
```bash
# Stop all containers and remove volumes
docker compose down -v

# Remove built images
docker compose down --rmi local

# Rebuild from scratch
docker compose build --no-cache

# Start fresh
docker compose up -d
```

### Kill Processes Using Required Ports
```bash
# Kill processes on ports 8080 and 3000
lsof -ti:8080,3000 | xargs kill -9 2>/dev/null
```

## Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| Web App | http://localhost:3000 | Frontend application |
| API | http://localhost:8080 | Backend API |
| Health Check | http://localhost:8080/api/health | API health status |
| Policy Config | http://localhost:8080/api/policy-config | Configuration endpoint |

## Environment Variables

### API Service
| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node environment |
| `PORT` | `8080` | API port |
| `DATABASE_PATH` | `/app/data/dspm.db` | SQLite database path |

### Web Service
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8080` | API URL for frontend |

## Docker Compose File Location

```
platform-home-assignment/
├── docker-compose.yml          # Main compose file
├── apps/
│   ├── api/
│   │   ├── Dockerfile          # API Dockerfile
│   │   └── .dockerignore       # API Docker ignore
│   └── web/
│       └── Dockerfile          # Web Dockerfile
```

## Common Issues

### Port Already in Use
```bash
# Find and kill process using port 8080
lsof -ti:8080 | xargs kill -9

# Or change port in docker-compose.yml
ports:
  - "8081:8080"  # Use 8081 instead
```

### Native Module Errors (better-sqlite3)
If you see errors about `better_sqlite3.node`, ensure:
1. The `.dockerignore` file exists in `apps/api/`
2. Rebuild with `--no-cache`: `docker compose build --no-cache api`

### Container Exits Immediately
```bash
# Check logs for error
docker compose logs api

# Common fix: rebuild the image
docker compose build --no-cache api
```
