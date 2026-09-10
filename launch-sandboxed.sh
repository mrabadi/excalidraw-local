#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP_BIN="$APP_ROOT/dist/linux-unpacked/excalidraw-local"
DATA_ROOT="${XDG_DATA_HOME:-$HOME/.local/share}/excalidraw-local"
RUNTIME_ROOT="${XDG_RUNTIME_DIR:-/tmp}/excalidraw-local-runtime"

if [[ ! -x "$APP_BIN" ]]; then
  echo "Build the app first: cd '$APP_ROOT' && npm install && npm run build" >&2
  exit 1
fi
command -v bwrap >/dev/null || { echo "bubblewrap (bwrap) is required" >&2; exit 1; }
mkdir -p "$DATA_ROOT" "$RUNTIME_ROOT"

DISPLAY_ARGS=()
HAS_DISPLAY=false
if [[ -n "${WAYLAND_DISPLAY:-}" && -n "${XDG_RUNTIME_DIR:-}" && -S "$XDG_RUNTIME_DIR/$WAYLAND_DISPLAY" ]]; then
  DISPLAY_ARGS+=(--bind "$XDG_RUNTIME_DIR/$WAYLAND_DISPLAY" "/run/user/$(id -u)/$WAYLAND_DISPLAY" --setenv WAYLAND_DISPLAY "$WAYLAND_DISPLAY" --setenv XDG_RUNTIME_DIR "/run/user/$(id -u)")
  HAS_DISPLAY=true
fi
if [[ -n "${DISPLAY:-}" && -d /tmp/.X11-unix ]]; then
  DISPLAY_ARGS+=(--ro-bind /tmp/.X11-unix /tmp/.X11-unix --setenv DISPLAY "$DISPLAY")
  if [[ -n "${XAUTHORITY:-}" && -f "$XAUTHORITY" ]]; then DISPLAY_ARGS+=(--ro-bind "$XAUTHORITY" /tmp/Xauthority --setenv XAUTHORITY /tmp/Xauthority); fi
  HAS_DISPLAY=true
fi
if [[ "$HAS_DISPLAY" != true ]]; then
  echo "No usable Wayland or X11 display found." >&2
  exit 1
fi

exec bwrap --die-with-parent --unshare-user --unshare-pid --unshare-ipc --unshare-uts --unshare-cgroup --unshare-net \
  --new-session --proc /proc --dev /dev --ro-bind /usr /usr --ro-bind /lib /lib \
  --ro-bind /lib64 /lib64 --ro-bind /bin /bin --ro-bind /etc /etc --ro-bind "$APP_ROOT/dist" /app/dist \
  --bind "$DATA_ROOT" /data --tmpfs /tmp --dir /run --dir /run/user --dir "/run/user/$(id -u)" \
  --setenv HOME /data --setenv XDG_CONFIG_HOME /data/config --setenv XDG_DATA_HOME /data/share \
  --setenv XDG_CACHE_HOME /data/cache --setenv ELECTRON_DISABLE_SECURITY_WARNINGS true \
  "${DISPLAY_ARGS[@]}" /app/dist/linux-unpacked/excalidraw-local --ozone-platform-hint=auto "$@"
