#!/bin/bash
# Health check script for Mock DSPM Portal
# Verifies that both API and Web UI are running correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default ports (can be overridden via environment variables)
API_PORT="${API_PORT:-8080}"
WEB_PORT="${WEB_PORT:-3000}"

API_URL="http://localhost:${API_PORT}"
WEB_URL="http://localhost:${WEB_PORT}"

echo "============================================"
echo "  Mock DSPM Portal - Health Check"
echo "============================================"
echo ""
echo "Checking endpoints:"
echo "  API: ${API_URL}"
echo "  Web: ${WEB_URL}"
echo ""

# Track failures
FAILED=0

# Check API health endpoint
echo -n "Checking API health... "
if curl -sf "${API_URL}/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
    FAILED=1
fi

# Check Web UI
echo -n "Checking Web UI...     "
if curl -sf "${WEB_URL}" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
    FAILED=1
fi

echo ""

# Summary
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  All health checks passed!${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo "You can now access:"
    echo "  Web UI: ${WEB_URL}"
    echo "  API:    ${API_URL}"
    echo ""
    echo "Login credentials:"
    echo "  Username: admin"
    echo "  Password: Aa123456"
    exit 0
else
    echo -e "${RED}============================================${NC}"
    echo -e "${RED}  Some health checks failed!${NC}"
    echo -e "${RED}============================================${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "  1. Ensure Docker containers are running:"
    echo "     docker compose ps"
    echo ""
    echo "  2. Wait a few more seconds and retry:"
    echo "     sleep 5 && ./scripts/healthcheck.sh"
    echo ""
    echo "  3. Check container logs:"
    echo "     docker compose logs"
    echo ""
    echo "  4. If ports are in use, copy .env.example to .env"
    echo "     and change WEB_PORT/API_PORT values."
    exit 1
fi
