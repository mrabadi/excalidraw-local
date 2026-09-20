# Excalidraw Local

An offline, launchable Ubuntu desktop app built with [Excalidraw](https://github.com/excalidraw/excalidraw). It runs inside a networkless Bubblewrap sandbox while retaining normal access to files in your home directory.

## Features

- Native top-level File menu: New Canvas, Save, Save As, Open, Open Recent, and Quit.
- Standard shortcuts: `Ctrl+N`, `Ctrl+S`, `Ctrl+Shift+S`, and `Ctrl+O`.
- `.excalidraw` documents open and save through native system dialogs, defaulting to `$HOME`.
- The current drawing and active document are restored after restart.
- Bundled Excalidraw fonts and assets, including Excalifont.
- Ubuntu is available in the font picker and bundled into the app. Verdana and Helvetica are used only when installed on the host; their proprietary font files are not redistributed.
- Settings → Mode switches between Sketch and Professional immediately. Professional mode uses architect strokes, Verdana, elbow arrows, and the Equivar light figure palette: Green01, Brown01, Purple01, Blue01, Yellow02, Red01, and Orange01, with generated lighter tints plus graphite and warm white.
- No cloud sync, collaboration server, analytics, or external asset requests at runtime.

## Requirements

- Ubuntu 22.04 or another Linux distribution with a working Wayland or X11 desktop session.
- Node.js 20 or newer and npm.
- [Bubblewrap](https://github.com/containers/bubblewrap) (`bwrap`).

On Ubuntu/Debian, install Bubblewrap with:

```bash
sudo apt update
sudo apt install bubblewrap
```

Ubuntu desktop installations normally include the Ubuntu font. If yours does not, install it with `sudo apt install fonts-ubuntu`. Verdana is optional and must be installed separately by the user because it is not redistributed by this project.

Install Node.js 20+ using your preferred system package manager or [NodeSource](https://github.com/nodesource/distributions).

## Build and install

```bash
git clone git@github.com:mrabadi/excalidraw-local.git
cd excalidraw-local
./install.sh
```

Launch **Excalidraw Local** from the application menu, or run:

```bash
./launch-sandboxed.sh
```

`npm install` and the first Electron build download dependencies. Once built, launching the app does not require an internet connection.

The installer creates a per-user application-menu entry; it does not require `sudo`. To rebuild after source changes, run `./install.sh` again.

## File behavior

- **Save** writes to the current document. The first Save prompts for a filename.
- **Save As** always prompts for a destination.
- **Open Recent** lists the ten most recently opened or saved documents.
- **New Canvas** clears the active document, so the next Save prompts for a new filename.

## Security model

The launcher invokes Bubblewrap with `--unshare-net`, giving the app an empty network namespace: no network interfaces and no DNS access. Electron also blocks network requests, permissions, navigation, and popups; the packaged UI has a `connect-src 'none'` Content Security Policy.

The sandbox deliberately mounts your **home directory** so native Open/Save dialogs can read and write your files. That means the app can access files under `$HOME`; do not run untrusted modifications of this project. Other host system paths are not mounted, and runtime networking remains disabled.

## Development

```bash
npm run build
./launch-sandboxed.sh
```

The desktop launcher is generated per user by `install-desktop.sh` and is intentionally not committed.
