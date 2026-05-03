#!/usr/bin/env bash
# Flump-specific watch loop: re-runs Boilergen generate every time a YAML
# under schemas/unity-mobile-shooter/ changes, writing into the Flump
# repo's Assets/_Project/.
#
# Set FLUMP_REPO env var to point at your Flump checkout, or pass as $1.
#
# Usage:
#   FLUMP_REPO=~/dev/Flump bin/flump-watch.sh
#   bin/flump-watch.sh ~/dev/Flump

set -euo pipefail

FLUMP_REPO="${1:-${FLUMP_REPO:-}}"

if [ -z "$FLUMP_REPO" ]; then
  echo "Error: FLUMP_REPO env var or argument required."
  echo
  echo "Examples:"
  echo "  FLUMP_REPO=~/dev/Flump bin/flump-watch.sh"
  echo "  bin/flump-watch.sh ~/dev/Flump"
  exit 1
fi

ASSETS="$FLUMP_REPO/Assets/_Project"
if [ ! -d "$ASSETS" ]; then
  echo "Error: $ASSETS does not exist."
  echo "Make sure FLUMP_REPO points at the Flump repo root (the dir containing Assets/, ProjectSettings/, etc.)"
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BOILERGEN="$REPO_ROOT/boilergen"

if [ ! -f "$BOILERGEN/dist/cli/index.js" ]; then
  echo "Building Boilergen first…"
  (cd "$BOILERGEN" && npm install && npm run build)
fi

echo "✓ Watching schemas/unity-mobile-shooter/ → $ASSETS"
echo "  Edit any YAML — .asset files refresh automatically."
echo "  Ctrl+C to stop."
echo

cd "$BOILERGEN"
exec node dist/cli/index.js watch \
  schemas/unity-mobile-shooter \
  --plugin plugins/unity-mobile-shooter \
  --output "$ASSETS"
