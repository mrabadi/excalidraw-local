#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_ROOT"

command -v node >/dev/null || { echo "Node.js 20+ is required." >&2; exit 1; }
command -v npm >/dev/null || { echo "npm is required." >&2; exit 1; }
command -v bwrap >/dev/null || { echo "Bubblewrap is required: sudo apt install bubblewrap" >&2; exit 1; }

if [[ ! -d node_modules ]]; then
  npm install
fi
npm run build
./install-desktop.sh

echo "Excalidraw Local is installed. Launch it from the application menu."
