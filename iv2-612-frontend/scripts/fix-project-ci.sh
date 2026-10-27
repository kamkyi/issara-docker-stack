#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MODE="${1:---fix}"

case "$MODE" in
--fix)
	echo "Applying Biome fixes across the entire project..."
	npm run lint:fix
	;;
--check)
	echo "Skipping auto-fix (check mode)..."
	;;
*)
	echo "Usage: $0 [--fix|--check]" >&2
	exit 1
	;;
esac

echo "Running lint..."
npm run lint

echo "Running typecheck..."
npm run typecheck

echo "Done. Project checks passed."
