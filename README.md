# Excalidraw Local

A launchable Ubuntu desktop version of Excalidraw designed to work without internet access.

## Build once

Requires Node.js 20+ and Bubblewrap (`bwrap`). From this directory:

```bash
npm install
npm run build
./install-desktop.sh
```

Launch it from the Ubuntu application menu as **Excalidraw Local**, or run `./launch-sandboxed.sh`.

## Network isolation

The desktop launcher runs the packaged Electron binary in Bubblewrap with `--unshare-net`: it receives an empty network namespace, so it has no network interfaces or DNS access. The Electron renderer is also sandboxed, loads only packaged `file:` assets, rejects all permission requests, blocks navigation/popups, and has a CSP with `connect-src 'none'`.

The sandbox permits the display socket and your home directory, so native Open/Save As dialogs work with host files and start in `$HOME`. It deliberately does not mount broader system paths or permit a network interface. There is no cloud, collaboration, analytics, or external asset loading.

## Data

The current drawing is automatically restored when the app is reopened. Use Excalidraw's export/save controls to write `.excalidraw` files under your home directory. The app has no cloud persistence.
