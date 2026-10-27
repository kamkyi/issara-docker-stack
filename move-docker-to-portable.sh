#!/usr/bin/env bash
# =============================================================================
#  move-docker-to-portable.sh
#  1. Resizes Docker.raw virtual disk to TARGET_GB (default 32 GB)
#  2. Copies it sparsely to /Volumes/portable/docker  (only real data moves)
#  3. Updates Docker Desktop DataFolder setting
#  4. Relaunches Docker Desktop
#
#  Docker.raw is a sparse file — actual data on disk is far less than its
#  virtual size. This script shrinks the virtual cap, then copies sparsely
#  so only ~real data is written to the portable drive.
# =============================================================================

set -euo pipefail

TARGET_GB=32
PORTABLE_DOCKER_DIR="/Volumes/portable/docker/vms/0/data"
INTERNAL_DATA_DIR="$HOME/Library/Containers/com.docker.docker/Data/vms/0/data"
SETTINGS="$HOME/Library/Group Containers/group.com.docker/settings-store.json"
QEMU_IMG="/Volumes/Portable/AndroidStudio/emulator/qemu-img"
SRC="$INTERNAL_DATA_DIR/Docker.raw"
DST="$PORTABLE_DOCKER_DIR/Docker.raw"

# ---------------------------------------------------------------------------
#  Pre-flight checks
# ---------------------------------------------------------------------------
if [[ ! -d "/Volumes/portable" ]]; then
  echo "ERROR: /Volumes/portable is not mounted. Plug in the drive first."
  exit 1
fi

if [[ ! -f "$SRC" ]]; then
  echo "ERROR: Docker.raw not found at $SRC"
  echo "       Docker may already be moved, or it is in a different location."
  exit 1
fi

if [[ ! -x "$QEMU_IMG" ]]; then
  echo "ERROR: qemu-img not found at $QEMU_IMG"
  exit 1
fi

LOGICAL_SIZE=$(ls -lh "$SRC" | awk '{print $5}')
ACTUAL_SIZE=$(du -sh "$SRC" | awk '{print $1}')
echo "Docker.raw  logical (virtual) size : $LOGICAL_SIZE"
echo "Docker.raw  actual disk usage      : $ACTUAL_SIZE"
echo ""
echo "This will:"
echo "  1. Quit Docker Desktop"
echo "  2. Shrink virtual disk  →  ${TARGET_GB} GB"
echo "  3. Copy sparsely        →  $PORTABLE_DOCKER_DIR  (~$ACTUAL_SIZE written)"
echo "  4. Update DataFolder in Docker Desktop settings"
echo "  5. Relaunch Docker Desktop"
echo ""
read -r -p "Proceed? [y/N] " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }

# ---------------------------------------------------------------------------
#  Step 1: Quit Docker Desktop
# ---------------------------------------------------------------------------
echo ""
echo "==> [1/5] Quitting Docker Desktop ..."
osascript -e 'quit app "Docker Desktop"' 2>/dev/null || true
sleep 5

# ---------------------------------------------------------------------------
#  Step 2: Shrink virtual disk size to TARGET_GB (skip if already at target)
# ---------------------------------------------------------------------------
echo "==> [2/5] Checking virtual disk size ..."
CURRENT_VIRTUAL=$(ls -lh "$SRC" | awk '{print $5}')
if [[ "$CURRENT_VIRTUAL" == "${TARGET_GB}G" ]]; then
  echo "    Already at ${TARGET_GB} GB — skipping shrink."
else
  echo "    Shrinking Docker.raw virtual disk from $CURRENT_VIRTUAL to ${TARGET_GB}G ..."
  "$QEMU_IMG" resize -f raw --shrink "$SRC" "${TARGET_GB}G"
  echo "    Virtual disk size is now ${TARGET_GB} GB."
fi

# ---------------------------------------------------------------------------
#  Step 3: Copy sparsely to portable (only actual data is written)
# ---------------------------------------------------------------------------
echo "==> [3/5] Copying Docker.raw sparsely to $PORTABLE_DOCKER_DIR ..."
echo "    (only ~$ACTUAL_SIZE of real data will be written — not ${TARGET_GB} GB)"
mkdir -p "$PORTABLE_DOCKER_DIR"
# rsync shows progress and preserves permissions correctly
rsync --progress --sparse "$SRC" "$DST"
echo "    Copy done."
echo "    Destination size: $(du -sh "$DST" | awk '{print $1}')"

# Remove source after successful copy
echo "    Removing original from internal drive ..."
rm "$SRC"

# ---------------------------------------------------------------------------
#  Step 4: Update DataFolder in settings-store.json
# ---------------------------------------------------------------------------
echo "==> [4/5] Updating Docker Desktop settings ..."
python3 - <<PYEOF
import json

settings_path = "$SETTINGS"
new_data_folder = "$PORTABLE_DOCKER_DIR"

with open(settings_path, "r") as f:
    settings = json.load(f)

old = settings.get("DataFolder", "(not set)")
settings["DataFolder"] = new_data_folder

with open(settings_path, "w") as f:
    json.dump(settings, f, indent=2)

print(f"    DataFolder: {old}")
print(f"             → {new_data_folder}")
PYEOF

# ---------------------------------------------------------------------------
#  Step 5: Relaunch Docker Desktop
# ---------------------------------------------------------------------------
echo "==> [5/5] Relaunching Docker Desktop ..."
open -a "Docker Desktop"

echo ""
echo "All done!"
echo "  Virtual disk cap : ${TARGET_GB} GB  (on portable drive)"
echo "  Location         : $PORTABLE_DOCKER_DIR"
echo ""
echo "Once Docker is running, verify with:"
echo "  docker info | grep 'Docker Root Dir'"
