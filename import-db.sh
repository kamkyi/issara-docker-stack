#!/usr/bin/env bash
# =============================================================================
#  import-db.sh
#  Imports backup.sql into the running MySQL containers for:
#    - ILM-prototype  (ilm-database-2  → ilm_2)
#    - goldendreams_v2 (goldendreams-database → goldendreams_v2)
#
#  Run AFTER the containers are already up:
#    ./up.sh && ./import-db.sh
# =============================================================================

set -euo pipefail

ILM_SQL="/Volumes/portable/work/ILM-prototype/backup.sql"
GD_SQL="/Volumes/portable/work/goldendreams_v2/backup.sql"

# ---------------------------------------------------------------------------
#  Helpers
# ---------------------------------------------------------------------------

wait_for_mysql() {
  local container="$1"
  echo "  Waiting for MySQL in '$container' to be ready..."
  until docker exec "$container" mysqladmin ping -h 127.0.0.1 --silent 2>/dev/null; do
    sleep 2
  done
  echo "  '$container' is ready."
}

import_sql() {
  local container="$1"
  local db="$2"
  local password="$3"
  local sql_file="$4"

  echo ""
  echo "==> Importing into $container ($db) ..."
  wait_for_mysql "$container"
  docker exec -i "$container" \
    mysql -u root -p"${password}" "${db}" < "${sql_file}"
  echo "    Import done."
}

# ---------------------------------------------------------------------------
#  ILM-prototype
# ---------------------------------------------------------------------------
import_sql "ilm-database-2" "ilm_2" "password" "$ILM_SQL"

# ---------------------------------------------------------------------------
#  goldendreams_v2
# ---------------------------------------------------------------------------
import_sql "goldendreams-database" "goldendreams_v2" "password" "$GD_SQL"

echo ""
echo "All imports complete."
