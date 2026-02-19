#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPENAPI_FILE="${1:-$SCRIPT_DIR/openapi-agent-bot-skills-tasks.yaml}"
PORT="${PORT:-8090}"
CONTAINER_NAME="agenttown-swagger-ui"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required but was not found in PATH."
  exit 1
fi

if [[ ! -f "$OPENAPI_FILE" ]]; then
  echo "OpenAPI file not found: $OPENAPI_FILE"
  exit 1
fi

docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

echo "Starting Swagger UI on http://localhost:${PORT}"
echo "Using spec: $OPENAPI_FILE"

docker run --rm \
  --name "$CONTAINER_NAME" \
  -p "${PORT}:8080" \
  -e SWAGGER_JSON=/spec/openapi.yaml \
  -v "${OPENAPI_FILE}:/spec/openapi.yaml:ro" \
  swaggerapi/swagger-ui:latest
