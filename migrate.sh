#!/usr/bin/env bash
# =============================================================================
#  migrate.sh
#  Runs Django migrations inside the running backend containers for:
#    - ILM-prototype  (ilm-server-2)
#    - goldendreams_v2 (goldendreams-server)
#
#  cascade-api migrations run automatically on container start (npm run migrate).
#
#  Run AFTER import-db.sh has completed successfully:
#    ./import-db.sh && ./migrate.sh
# =============================================================================

set -euo pipefail

run_migrate() {
  local container="$1"
  echo ""
  echo "==> Running migrations in '$container' ..."
  docker exec "$container" python manage.py migrate
  echo "    Migrations done for '$container'."
}

# ---------------------------------------------------------------------------
#  ILM-prototype Django
# ---------------------------------------------------------------------------
run_migrate "ilm-server-2"

# ---------------------------------------------------------------------------
#  goldendreams_v2 Django
# ---------------------------------------------------------------------------
run_migrate "goldendreams-server"

echo ""
echo "All Django migrations complete."
echo "Note: cascade-api migrations are applied automatically on container startup."
