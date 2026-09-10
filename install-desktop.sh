#!/usr/bin/env bash
set -euo pipefail
APP_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
mkdir -p "$DESKTOP_DIR"
sed "s|@APP_ROOT@|$APP_ROOT|g" "$APP_ROOT/excalidraw-local.desktop.in" > "$DESKTOP_DIR/excalidraw-local.desktop"
chmod 644 "$DESKTOP_DIR/excalidraw-local.desktop"
update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
echo "Installed launcher: Excalidraw Local"
