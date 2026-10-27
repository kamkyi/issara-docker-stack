#!/bin/zsh
# stop-all.sh — Stop all workspace services

WORKSPACE="$HOME"
LOGS_DIR="$WORKSPACE/.service-logs"

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

echo ""
echo "========================================"
echo "   Stopping all workspace services..."
echo "========================================"
echo ""

# ─────────────────────────────────────────
# 1. ILM-prototype (Docker Compose)
# ─────────────────────────────────────────
log_info "Stopping ILM-prototype (Docker)..."
if docker ps --format '{{.Names}}' | grep -q 'ilm-server-2'; then
  (cd "$WORKSPACE/ILM-prototype" && docker-compose down) >> "$LOGS_DIR/ilm-prototype.log" 2>&1
  if [[ $? -eq 0 ]]; then log_ok "ILM-prototype stopped"
  else log_error "ILM-prototype failed to stop. Check $LOGS_DIR/ilm-prototype.log"; fi
else
  log_warn "ILM-prototype not running — skipping"
fi

# ─────────────────────────────────────────
# 2. issara-authorizer (Flask)
# ─────────────────────────────────────────
log_info "Stopping issara-authorizer (Flask)..."
PID_FILE="$LOGS_DIR/issara-authorizer.pid"
if [[ -f "$PID_FILE" ]]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID" && rm -f "$PID_FILE"
    log_ok "issara-authorizer stopped (PID: $PID)"
  else
    log_warn "issara-authorizer PID $PID not running — cleaning up stale pid file"
    rm -f "$PID_FILE"
  fi
else
  log_warn "issara-authorizer PID file not found — skipping"
fi

# ─────────────────────────────────────────
# 3. ILM-facelift (npm run dev)
# ─────────────────────────────────────────
log_info "Stopping ILM-facelift (npm run dev)..."
PID_FILE="$LOGS_DIR/ilm-facelift.pid"
if [[ -f "$PID_FILE" ]]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID" && rm -f "$PID_FILE"
    log_ok "ILM-facelift stopped (PID: $PID)"
  else
    log_warn "ILM-facelift PID $PID not running — cleaning up stale pid file"
    rm -f "$PID_FILE"
  fi
else
  log_warn "ILM-facelift PID file not found — skipping"
fi

# ─────────────────────────────────────────
# 4. cascade-api (Docker Compose)
# ─────────────────────────────────────────
log_info "Stopping cascade-api (Docker)..."
if docker ps --format '{{.Names}}' | grep -q 'cascade-api'; then
  (cd "$WORKSPACE/cascade-api" && docker-compose down) >> "$LOGS_DIR/cascade-api.log" 2>&1
  if [[ $? -eq 0 ]]; then log_ok "cascade-api stopped"
  else log_error "cascade-api failed to stop. Check $LOGS_DIR/cascade-api.log"; fi
else
  log_warn "cascade-api not running — skipping"
fi

# ─────────────────────────────────────────
# 5. goldendreams_v2 (Docker Compose)
# ─────────────────────────────────────────
log_info "Stopping goldendreams_v2 (Docker)..."
if docker ps --format '{{.Names}}' | grep -q 'goldendreams-server'; then
  (cd "$WORKSPACE/goldendreams_v2" && docker-compose down) >> "$LOGS_DIR/goldendreams-v2.log" 2>&1
  if [[ $? -eq 0 ]]; then log_ok "goldendreams_v2 stopped"
  else log_error "goldendreams_v2 failed to stop. Check $LOGS_DIR/goldendreams-v2.log"; fi
else
  log_warn "goldendreams_v2 not running — skipping"
fi

# ─────────────────────────────────────────
# 6. GD-Fronted-v3 (Docker Compose)
# ─────────────────────────────────────────
log_info "Stopping GD-Fronted-v3 (Docker)..."
if docker ps --format '{{.Names}}' | grep -q 'goldendreams-client-web'; then
  (cd "$WORKSPACE/GD-Fronted-v3" && docker-compose down) >> "$LOGS_DIR/gd-fronted-v3.log" 2>&1
  if [[ $? -eq 0 ]]; then log_ok "GD-Fronted-v3 stopped"
  else log_error "GD-Fronted-v3 failed to stop. Check $LOGS_DIR/gd-fronted-v3.log"; fi
else
  log_warn "GD-Fronted-v3 not running — skipping"
fi

# ─────────────────────────────────────────
# 7. gd-lite (npm run start)
# ─────────────────────────────────────────
log_info "Stopping gd-lite (Expo)..."
PID_FILE="$LOGS_DIR/gd-lite.pid"
if [[ -f "$PID_FILE" ]]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID" && rm -f "$PID_FILE"
    log_ok "gd-lite stopped (PID: $PID)"
  else
    log_warn "gd-lite PID $PID not running — cleaning up stale pid file"
    rm -f "$PID_FILE"
  fi
else
  log_warn "gd-lite PID file not found — skipping"
fi

# ─────────────────────────────────────────
# Summary
# ─────────────────────────────────────────
echo ""
echo "========================================"
echo "   All services stopped!"
echo "========================================"
echo ""
