#!/usr/bin/env bash
# =============================================================================
#  local-services.sh
#  Helper library for the non-Docker dev services that ride along with the
#  unified stack:
#    * issara-authorizer   -> python app.py            (http://localhost:9000)
#    * ILM-facelift        -> npm run dev (node 22)    (http://localhost:5173)
#
#  Sourced by up.sh / down.sh. Not meant to be run directly.
# =============================================================================

STACK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK_ROOT="$(cd "$STACK_DIR/.." && pwd)"
RUN_DIR="$STACK_DIR/.run"

AUTHORIZER_DIR="$WORK_ROOT/issara-authorizer"
FACELIFT_DIR="$WORK_ROOT/ILM-facelift"

AUTHORIZER_PORT="${AUTHORIZER_PORT:-9000}"
FACELIFT_PORT="${FACELIFT_PORT:-5173}"

# ---------------------------------------------------------------------------
# internals
# ---------------------------------------------------------------------------

_pid_file()  { echo "$RUN_DIR/$1.pid"; }
_log_file()  { echo "$RUN_DIR/$1.log"; }

_is_running() {
  local pid_file
  pid_file="$(_pid_file "$1")"
  [[ -f "$pid_file" ]] || return 1
  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  [[ -n "$pid" ]] || return 1
  kill -0 "$pid" 2>/dev/null
}

_port_busy() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

# Start a command in its own process group so the whole tree can be killed later.
# usage: _spawn <name> <workdir> <command string>
_spawn() {
  local name="$1" workdir="$2" cmd="$3"
  local log pid_file
  log="$(_log_file "$name")"
  pid_file="$(_pid_file "$name")"

  mkdir -p "$RUN_DIR"
  : > "$log"

  # `set -m` gives each background job its own process group (kill -- -PGID).
  local had_monitor=0
  case "$-" in *m*) had_monitor=1 ;; esac
  set -m
  ( cd "$workdir" && eval "$cmd" ) >>"$log" 2>&1 &
  local pid=$!
  [[ "$had_monitor" == "1" ]] || set +m

  echo "$pid" > "$pid_file"
  echo "$pid"
}

# Kill a pid, its process group, and any stragglers still holding the port.
# usage: _kill_service <name> <label> <port>
_kill_service() {
  local name="$1" label="$2" port="$3"
  local pid_file pid stopped=0
  pid_file="$(_pid_file "$name")"

  if [[ -f "$pid_file" ]]; then
    pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
      local i
      for i in 1 2 3 4 5 6 7 8 9 10; do
        kill -0 "$pid" 2>/dev/null || break
        sleep 0.5
      done
      if kill -0 "$pid" 2>/dev/null; then
        kill -KILL -- "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
      fi
      stopped=1
    fi
    rm -f "$pid_file"
  fi

  # Belt and braces: anything still listening on the port (orphaned reloader
  # child, a run started by hand, ...) goes too.
  if [[ -n "$port" ]] && _port_busy "$port"; then
    local leftovers
    leftovers="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "$leftovers" ]]; then
      # shellcheck disable=SC2086
      kill -TERM $leftovers 2>/dev/null || true
      sleep 1
      leftovers="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
      # shellcheck disable=SC2086
      [[ -n "$leftovers" ]] && kill -KILL $leftovers 2>/dev/null || true
      stopped=1
    fi
  fi

  if [[ "$stopped" == "1" ]]; then
    echo "    stopped $label"
  else
    echo "    $label was not running"
  fi
}

# ---------------------------------------------------------------------------
# issara-authorizer  (Flask, python app.py)
# ---------------------------------------------------------------------------

start_authorizer() {
  local python_bin=""
  if [[ -x "$AUTHORIZER_DIR/.venv/bin/python" ]]; then
    python_bin="$AUTHORIZER_DIR/.venv/bin/python"
  elif [[ -x "$AUTHORIZER_DIR/venv/bin/python" ]]; then
    python_bin="$AUTHORIZER_DIR/venv/bin/python"
  fi

  if [[ ! -f "$AUTHORIZER_DIR/app.py" ]]; then
    echo "    SKIP issara-authorizer: $AUTHORIZER_DIR/app.py not found"
    return 0
  fi
  if [[ -z "$python_bin" ]]; then
    echo "    SKIP issara-authorizer: no virtualenv at $AUTHORIZER_DIR/.venv (or ./venv)"
    return 0
  fi
  if [[ ! -f "$AUTHORIZER_DIR/.env" ]]; then
    echo "    WARN issara-authorizer: .env not found, starting with defaults"
  fi

  if _is_running authorizer; then
    echo "    issara-authorizer already running (pid $(cat "$(_pid_file authorizer)"))"
    return 0
  fi
  if _port_busy "$AUTHORIZER_PORT"; then
    echo "    SKIP issara-authorizer: port $AUTHORIZER_PORT already in use"
    return 0
  fi

  local pid
  pid="$(_spawn authorizer "$AUTHORIZER_DIR" "'$python_bin' app.py")"
  sleep 2
  if kill -0 "$pid" 2>/dev/null; then
    echo "    issara-authorizer  -> http://localhost:$AUTHORIZER_PORT  (pid $pid)"
  else
    echo "    ERROR issara-authorizer failed to start, last lines of log:"
    tail -n 15 "$(_log_file authorizer)" | sed 's/^/      /'
  fi
}

# Locate a node 22 toolchain without going through `nvm use` (which trips over
# a `prefix` set in ~/.npmrc). Honours .nvmrc when it pins a v22.
_resolve_node22_bin() {
  local versions_dir="${NVM_DIR:-$HOME/.nvm}/versions/node"
  local want=""

  if [[ -f "$FACELIFT_DIR/.nvmrc" ]]; then
    want="$(tr -d ' \t\r\n' < "$FACELIFT_DIR/.nvmrc")"
    want="v${want#v}"
    if [[ "$want" == v22.* && -x "$versions_dir/$want/bin/node" ]]; then
      echo "$versions_dir/$want/bin"
      return 0
    fi
  fi

  local latest
  latest="$(ls -1 "$versions_dir" 2>/dev/null | grep '^v22\.' | sort -t. -k2,2n -k3,3n | tail -n 1)"
  if [[ -n "$latest" && -x "$versions_dir/$latest/bin/node" ]]; then
    echo "$versions_dir/$latest/bin"
    return 0
  fi

  return 1
}

# ---------------------------------------------------------------------------
# ILM-facelift  (vite dev server on node 22)
# ---------------------------------------------------------------------------

start_facelift() {
  if [[ ! -f "$FACELIFT_DIR/package.json" ]]; then
    echo "    SKIP ILM-facelift: $FACELIFT_DIR/package.json not found"
    return 0
  fi
  if [[ ! -d "$FACELIFT_DIR/node_modules" ]]; then
    echo "    SKIP ILM-facelift: node_modules missing, run 'npm install' first"
    return 0
  fi

  if _is_running facelift; then
    echo "    ILM-facelift already running (pid $(cat "$(_pid_file facelift)"))"
    return 0
  fi
  if _port_busy "$FACELIFT_PORT"; then
    echo "    SKIP ILM-facelift: port $FACELIFT_PORT already in use"
    return 0
  fi

  local node_bin
  node_bin="$(_resolve_node22_bin || true)"

  local node_setup=""
  if [[ -n "$node_bin" ]]; then
    node_setup="export PATH=\"$node_bin:\$PATH\"; unset npm_config_prefix;"
  elif node --version 2>/dev/null | grep -q '^v22\.'; then
    node_bin="$(dirname "$(command -v node)")"
  else
    echo "    SKIP ILM-facelift: node 22 not found (no v22.* under ${NVM_DIR:-$HOME/.nvm}/versions/node, and \`node -v\` is $(node --version 2>/dev/null || echo none))"
    return 0
  fi

  local node_version
  node_version="$("$node_bin/node" --version 2>/dev/null || echo '?')"

  local pid
  pid="$(_spawn facelift "$FACELIFT_DIR" "$node_setup npm run dev")"
  sleep 3
  if kill -0 "$pid" 2>/dev/null; then
    echo "    ILM-facelift       -> http://localhost:$FACELIFT_PORT  (pid $pid, node $node_version)"
  else
    echo "    ERROR ILM-facelift failed to start, last lines of log:"
    tail -n 15 "$(_log_file facelift)" | sed 's/^/      /'
  fi
}

# ---------------------------------------------------------------------------
# public entrypoints
# ---------------------------------------------------------------------------

start_local_services() {
  echo "==> Starting local (non-Docker) services ..."
  start_authorizer
  start_facelift
  echo "    logs: $RUN_DIR/*.log"
}

stop_local_services() {
  echo "==> Stopping local (non-Docker) services ..."
  _kill_service facelift   "ILM-facelift dev server" "$FACELIFT_PORT"
  _kill_service authorizer "issara-authorizer"       "$AUTHORIZER_PORT"
}
