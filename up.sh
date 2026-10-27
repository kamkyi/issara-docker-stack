#!/usr/bin/env bash
# =============================================================================
#  up.sh
#  Starts all services using cached images (no rebuild), plus the two local
#  (non-Docker) dev services: issara-authorizer and the ILM-facelift frontend.
#  Run from the same directory as docker-compose.unified.yml
#
#  Env toggles:
#    SKIP_LOCAL_SERVICES=1   docker containers only
# =============================================================================

set -euo pipefail

STACK_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$STACK_DIR/docker-compose.unified.yml"
ENV_FILE="/Volumes/portable/work/cascade-api/.env"
PROJECT="cascade-stack"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found."
  echo "Copy cascade-api/.env.example to cascade-api/.env and set DB_PASSWORD."
  exit 1
fi

echo "==> Starting all services ..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" -p "$PROJECT" up -d

if [[ "${SKIP_LOCAL_SERVICES:-0}" != "1" ]]; then
  echo ""
  # shellcheck source=local-services.sh
  source "$STACK_DIR/local-services.sh"
  start_local_services
fi

echo ""
echo "All services are up. Check status with:"
echo "  docker compose -f $COMPOSE_FILE -p $PROJECT ps"
echo ""
echo "Common URLs:"
echo "  ILM API:               http://localhost:8000"
echo "  Goldendreams API:      http://localhost:8001"
echo "  Cascade API:           http://localhost:3000"
echo "  GD phpMyAdmin:         http://localhost:4002"
echo "  issara-authorizer:     http://localhost:9000"
echo "  ILM-facelift (vite):   http://localhost:5173"
