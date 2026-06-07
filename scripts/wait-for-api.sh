#!/bin/bash
# Wait for API to be healthy before starting web

set -e

API_URL="${API_URL:-http://localhost:8080}"
MAX_RETRIES=30
RETRY_INTERVAL=2

echo "Waiting for API at $API_URL to be healthy..."

for i in $(seq 1 $MAX_RETRIES); do
    if curl -sf "$API_URL/health" > /dev/null 2>&1; then
        echo "API is healthy!"
        exit 0
    fi
    echo "Attempt $i/$MAX_RETRIES: API not ready, waiting ${RETRY_INTERVAL}s..."
    sleep $RETRY_INTERVAL
done

echo "ERROR: API did not become healthy after $MAX_RETRIES attempts"
exit 1

