#!/usr/bin/env bash
# =============================================================================
#  build-no-cache.sh
#  Builds ALL images from scratch (--no-cache) then starts every service.
#  Run from the same directory as docker-compose.unified.yml
# =============================================================================

set -euo pipefail

COMPOSE_FILE="$(cd "$(dirname "$0")" && pwd)/docker-compose.unified.yml"
ENV_FILE="/Volumes/portable/work/cascade-api/.env"
PROJECT="cascade-stack"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found."
  echo "Copy cascade-api/.env.example to cascade-api/.env and set DB_PASSWORD."
  exit 1
fi

echo "==> [1/3] Tearing down existing containers ..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" -p "$PROJECT" down

echo "==> [2/3] Building all images with --no-cache ..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" -p "$PROJECT" build --no-cache

echo "==> [3/3] Starting all services ..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" -p "$PROJECT" up -d

echo ""
echo "All services are up. Check status with:"
echo "  docker compose -f $COMPOSE_FILE -p $PROJECT ps"
