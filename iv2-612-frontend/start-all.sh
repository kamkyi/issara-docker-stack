#!/bin/zsh
# start-all.sh — Start all workspace services

WORKSPACE="$HOME"
LOGS_DIR="$WORKSPACE/.service-logs"
mkdir -p "$LOGS_DIR"
LOCK_FILE="$LOGS_DIR/start-all.lock"
NVM_SCRIPT="$HOME/.nvm/nvm.sh"
NODE_VERSION="v22.14.0"

# Prevent concurrent runs of this script
if [[ -f "$LOCK_FILE" ]]; then
  existing_pid=$(cat "$LOCK_FILE" 2>/dev/null)
  if [[ -n "$existing_pid" ]] && kill -0 "$existing_pid" 2>/dev/null; then
    echo "[WARN] start-all.sh is already running (PID: $existing_pid). Exiting."
    exit 1
  fi
fi
echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo "${CYAN}[INFO]${NC}  $1"; }
log_ok()    { echo "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo "${RED}[ERROR]${NC} $1"; }

use_node() {
  local version="$1"

  if [[ ! -s "$NVM_SCRIPT" ]]; then
    log_error "nvm was not found at $NVM_SCRIPT"
    return 1
  fi

  source "$NVM_SCRIPT"

  if ! nvm use "$version" >> "$LOGS_DIR/nvm.log" 2>&1; then
    log_error "Node $version is not available through nvm."
    log_error "Run: source ~/.nvm/nvm.sh && nvm install $version"
    log_error "Check $LOGS_DIR/nvm.log for nvm output."
    return 1
  fi
}

echo ""
echo "========================================"
echo "   Starting all workspace services..."
echo "========================================"
echo ""

# ─────────────────────────────────────────
# 1. ILM-prototype (Docker Compose) — port 8000
# ─────────────────────────────────────────
log_info "Starting ILM-prototype (Docker)..."
if docker ps --format '{{.Names}}' | grep -q 'ilm-server-2'; then
  log_warn "ILM-prototype already running — skipping"
else
  (cd "$WORKSPACE/ILM-prototype" && docker-compose up -d) >> "$LOGS_DIR/ilm-prototype.log" 2>&1
  if [[ $? -eq 0 ]]; then log_ok "ILM-prototype started → http://localhost:8000"
  else log_error "ILM-prototype failed. Check $LOGS_DIR/ilm-prototype.log"; fi
fi

# ─────────────────────────────────────────
# 2. issara-authorizer (Flask) — port 9000
# ─────────────────────────────────────────
log_info "Starting issara-authorizer (Flask)..."
if lsof -iTCP:9000 -sTCP:LISTEN -n -P 2>/dev/null | grep -q LISTEN; then
  log_warn "Port 9000 already in use — issara-authorizer skipping"
else
  nohup "$WORKSPACE/issara-authorizer/.venv/bin/python3.14" "$WORKSPACE/issara-authorizer/app.py" \
    >> "$LOGS_DIR/issara-authorizer.log" 2>&1 &
  echo $! > "$LOGS_DIR/issara-authorizer.pid"
  log_ok "issara-authorizer started → http://localhost:9000 (PID: $!)"
fi

# ─────────────────────────────────────────
# 3. ILM-facelift (npm dev) — port 5173
# ─────────────────────────────────────────
log_info "Starting ILM-facelift (npm run dev)..."
if lsof -iTCP:5173 -sTCP:LISTEN -n -P 2>/dev/null | grep -q LISTEN; then
  log_warn "Port 5173 already in use — ILM-facelift skipping"
else
  (
    cd "$WORKSPACE/ILM-facelift" || exit 1
    use_node "$NODE_VERSION" || exit 1
    nohup npm run dev >> "$LOGS_DIR/ilm-facelift.log" 2>&1 &
    echo $! > "$LOGS_DIR/ilm-facelift.pid"
  )
  if [[ $? -eq 0 ]]; then log_ok "ILM-facelift started → http://localhost:5173"
  else log_error "ILM-facelift failed. Check $LOGS_DIR/ilm-facelift.log"; fi
fi

# ─────────────────────────────────────────
# 4. goldendreams_v2 (Docker Compose) — port 8001
#    Must start before cascade-api (provides goldendreams_v2_default network)
# ─────────────────────────────────────────
log_info "Starting goldendreams_v2 (Docker)..."
if docker ps --format '{{.Names}}' | grep -q 'goldendreams-server'; then
  log_warn "goldendreams_v2 already running — skipping"
else
  # Use the parallel compose file to avoid port conflicts with ILM-prototype/cascade-api:
  # - server: 8001->8000
  # - database: 3308->3306 (3306=ilm-database-2, 3307=cascade-db)
  # Start only required services to avoid phpMyAdmin (8081) conflicting with gd-lite (8081).
  (
    cd "$WORKSPACE/goldendreams_v2" && \
    docker-compose -f parallel.docker-compose.yml up -d \
      database server cache celery-broker-redis
  ) >> "$LOGS_DIR/goldendreams-v2.log" 2>&1
  if [[ $? -eq 0 ]]; then log_ok "goldendreams_v2 started → http://localhost:8001"
  else log_error "goldendreams_v2 failed. Check $LOGS_DIR/goldendreams-v2.log"; fi
fi

# ─────────────────────────────────────────
# 5. cascade-api (Docker Compose) — ports 3000, 3309
#    Requires ilm-prototype_default + goldendreams_v2_default networks
# ─────────────────────────────────────────
log_info "Starting cascade-api (Docker)..."
if docker ps --format '{{.Names}}' | grep -q 'cascade-api'; then
  log_warn "cascade-api already running — skipping"
else
  (cd "$WORKSPACE/cascade-api" && DB_EXPOSED_PORT=3309 docker-compose up -d) >> "$LOGS_DIR/cascade-api.log" 2>&1
  if [[ $? -eq 0 ]]; then log_ok "cascade-api started → http://localhost:3000"
  else log_error "cascade-api failed. Check $LOGS_DIR/cascade-api.log"; fi
fi

# ─────────────────────────────────────────
# 6. GD-Fronted-v3 (Docker Compose) — ports 80, 4000
# ─────────────────────────────────────────
log_info "Starting GD-Fronted-v3 (Docker)..."
if docker ps --format '{{.Names}}' | grep -q 'goldendreams-client-web'; then
  log_warn "GD-Fronted-v3 already running — skipping"
else
  (cd "$WORKSPACE/GD-Fronted-v3" && docker-compose up -d) >> "$LOGS_DIR/gd-fronted-v3.log" 2>&1
  if [[ $? -eq 0 ]]; then log_ok "GD-Fronted-v3 started → client:80 | client-business:4000"
  else log_error "GD-Fronted-v3 failed. Check $LOGS_DIR/gd-fronted-v3.log"; fi
fi

# ─────────────────────────────────────────
# 7. gd-lite (npm run start) — port 8081
# ─────────────────────────────────────────
log_info "Starting gd-lite (Expo)..."
if lsof -iTCP:8081 -sTCP:LISTEN -n -P 2>/dev/null | grep -q LISTEN; then
  log_warn "Port 8081 already in use — gd-lite skipping"
else
  (
    cd "$WORKSPACE/gd-lite" || exit 1
    use_node "$NODE_VERSION" || exit 1
    nohup npm run start >> "$LOGS_DIR/gd-lite.log" 2>&1 &
    echo $! > "$LOGS_DIR/gd-lite.pid"
  )
  if [[ $? -eq 0 ]]; then log_ok "gd-lite started → http://localhost:8081"
  else log_error "gd-lite failed. Check $LOGS_DIR/gd-lite.log"; fi
fi

# ─────────────────────────────────────────
# Summary
# ─────────────────────────────────────────
echo ""
echo "========================================"
echo "   All services launched!"
echo "========================================"
echo ""
echo "  ILM-prototype      → http://localhost:8000"
echo "  issara-authorizer  → http://localhost:9000"
echo "  ILM-facelift       → http://localhost:5173"
echo "  cascade-api        → http://localhost:3000"
echo "  goldendreams_v2    → http://localhost:8001"
echo "  GD client-web      → http://localhost:80"
echo "  GD client-business → http://localhost:4000"
echo "  GD phpmyadmin      → http://localhost:4002"
echo "  gd-lite (Expo)     → http://localhost:8081"
echo ""
echo "  Logs: $LOGS_DIR/"
echo ""
