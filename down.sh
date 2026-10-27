#!/usr/bin/env bash
# =============================================================================
#  down.sh
#  Stops and removes all containers/networks created by the unified compose,
#  and stops the local (non-Docker) dev services: the ILM-facelift frontend
#  and issara-authorizer.
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

if [[ "${SKIP_LOCAL_SERVICES:-0}" != "1" ]]; then
  # shellcheck source=local-services.sh
  source "$STACK_DIR/local-services.sh"
  stop_local_services
  echo ""
fi

echo "==> Stopping and removing all containers ..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" -p "$PROJECT" down

echo ""
echo "All services are down."
