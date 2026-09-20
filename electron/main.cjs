const { app, BrowserWindow, Menu, dialog, ipcMain, session } = require("electron");
const fs = require("fs/promises");
const path = require("path");
const { renderPngAsPdf } = require("./png-pdf.cjs");

let mainWindow;
let activeFilePath = null;
let recentFiles = [];
let mode = "sketch";

function activeFileRecordPath() {
  return path.join(app.getPath("userData"), "active-file.json");
}
async function restoreActiveFilePath() {
  try {
    const record = JSON.parse(await fs.readFile(activeFileRecordPath(), "utf8"));
    activeFilePath = typeof record.path === "string" ? record.path : null;
  } catch {
    activeFilePath = null;
  }
}
async function persistActiveFilePath() {
  await fs.mkdir(app.getPath("userData"), { recursive: true });
  await fs.writeFile(activeFileRecordPath(), JSON.stringify({ path: activeFilePath }), "utf8");
}
function recentFilesRecordPath() {
  return path.join(app.getPath("userData"), "recent-files.json");
}
async function restoreRecentFiles() {
  try {
    const record = JSON.parse(await fs.readFile(recentFilesRecordPath(), "utf8"));
    recentFiles = Array.isArray(record.paths) ? record.paths.filter((item) => typeof item === "string") : [];
  } catch {
    recentFiles = [];
  }
}
async function recordRecentFile(filePath) {
  recentFiles = [filePath, ...recentFiles.filter((item) => item !== filePath)].slice(0, 10);
  await fs.mkdir(app.getPath("userData"), { recursive: true });
  await fs.writeFile(recentFilesRecordPath(), JSON.stringify({ paths: recentFiles }), "utf8");
  installApplicationMenu();
}
function modeRecordPath() {
  return path.join(app.getPath("userData"), "mode.json");
}
async function restoreMode() {
  try {
    const record = JSON.parse(await fs.readFile(modeRecordPath(), "utf8"));
    mode = record.mode === "professional" ? "professional" : "sketch";
  } catch {
    mode = "sketch";
  }
}
async function persistMode() {
  await fs.mkdir(app.getPath("userData"), { recursive: true });
  await fs.writeFile(modeRecordPath(), JSON.stringify({ mode }), "utf8");
}

// Defense in depth: the launcher removes networking, and this blocks it in Chromium.
function blockNetworkRequests() {
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const allowed = details.url.startsWith("file:") || details.url.startsWith("data:") || details.url.startsWith("blob:");
    callback({ cancel: !allowed });
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 860,
    minHeight: 600,
    title: "Excalidraw Local",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });
  mainWindow = window;
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.webContents.on("will-attach-webview", (event) => event.preventDefault());
  window.webContents.on("will-prevent-unload", (event) => event.preventDefault());
  window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

function requestSave(forceSaveAs) {
  mainWindow?.webContents.send("scene:save-request", forceSaveAs);
}
function requestNewCanvas() {
  mainWindow?.webContents.send("scene:new-request");
}
function requestOpen(filePath = null) {
  mainWindow?.webContents.send("scene:open-request", filePath);
}
function requestMode(nextMode) {
  mainWindow?.webContents.send("settings:mode-request", nextMode);
}
function requestExport(format) {
  mainWindow?.webContents.send("scene:export-request", format);
}

function defaultExportPath(extension) {
  const baseName = activeFilePath
    ? path.basename(activeFilePath, path.extname(activeFilePath))
    : "Untitled";
  return path.join(app.getPath("home"), `${baseName}.${extension}`);
}

function installApplicationMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: "File",
      submenu: [
        { label: "New Canvas", accelerator: "CmdOrCtrl+N", click: requestNewCanvas },
        { label: "Save", accelerator: "CmdOrCtrl+S", click: () => requestSave(false) },
        { label: "Save As…", accelerator: "CmdOrCtrl+Shift+S", click: () => requestSave(true) },
        { label: "Open…", accelerator: "CmdOrCtrl+O", click: () => requestOpen() },
        {
          label: "Open Recent",
          submenu: recentFiles.length
            ? recentFiles.map((filePath) => ({ label: path.basename(filePath), sublabel: filePath, click: () => requestOpen(filePath) }))
            : [{ label: "No recent files", enabled: false }]
        },
        { type: "separator" },
        { label: "Export…", click: () => requestExport() },
        { role: "quit" }
      ]
    },
    { label: "Edit", submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }] },
    {
      label: "Settings",
      submenu: [{
        label: "Mode",
        submenu: [
          { label: "Sketch", type: "checkbox", checked: mode === "sketch", click: () => requestMode("sketch") },
          { label: "Professional", type: "checkbox", checked: mode === "professional", click: () => requestMode("professional") }
        ]
      }]
    }
  ]));
}

app.commandLine.appendSwitch("disable-background-networking");
app.commandLine.appendSwitch("disable-component-update");
app.commandLine.appendSwitch("disable-features", "MediaRouter,OptimizationHints,AutofillServerCommunication,CertificateTransparencyComponentUpdater");
app.commandLine.appendSwitch("disable-gpu");
app.on("web-contents-created", (_, contents) => {
  contents.setWindowOpenHandler(() => ({ action: "deny" }));
});
app.whenReady().then(async () => {
  blockNetworkRequests();
  session.defaultSession.setPermissionRequestHandler((_, __, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  ipcMain.handle("scene:save", async (_, scene, forceSaveAs) => {
    let targetPath = forceSaveAs ? null : activeFilePath;
    if (!targetPath) {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: "Save Excalidraw drawing",
        defaultPath: path.join(app.getPath("home"), "Untitled.excalidraw"),
        filters: [{ name: "Excalidraw drawing", extensions: ["excalidraw"] }]
      });
      if (result.canceled || !result.filePath) return { canceled: true };
      targetPath = result.filePath.endsWith(".excalidraw") ? result.filePath : `${result.filePath}.excalidraw`;
    }
    await fs.writeFile(targetPath, scene, "utf8");
    activeFilePath = targetPath;
    await persistActiveFilePath();
    await recordRecentFile(targetPath);
    mainWindow?.setTitle(`Excalidraw Local — ${path.basename(targetPath)}`);
    return { canceled: false, path: targetPath };
  });
  ipcMain.handle("scene:new", async () => {
    activeFilePath = null;
    await persistActiveFilePath();
    mainWindow?.setTitle("Excalidraw Local");
  });
  ipcMain.handle("scene:open", async (_, requestedPath) => {
    let targetPath = requestedPath;
    if (!targetPath) {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: "Open Excalidraw drawing",
        defaultPath: app.getPath("home"),
        properties: ["openFile"],
        filters: [{ name: "Excalidraw drawing", extensions: ["excalidraw", "json"] }]
      });
      if (result.canceled || !result.filePaths[0]) return { canceled: true };
      [targetPath] = result.filePaths;
    }
    try {
      const scene = JSON.parse(await fs.readFile(targetPath, "utf8"));
      activeFilePath = targetPath;
      await persistActiveFilePath();
      await recordRecentFile(targetPath);
      mainWindow?.setTitle(`Excalidraw Local — ${path.basename(targetPath)}`);
      return { canceled: false, scene, path: targetPath };
    } catch (error) {
      return { canceled: false, error: `Could not open ${targetPath}: ${error.message}` };
    }
  });
  ipcMain.handle("scene:export", async (_, format, payload) => {
    const formats = {
      png: { extension: "png", name: "PNG image" },
      pdf: { extension: "pdf", name: "PDF document" }
    };
    const requestedFormat = formats[format];
    if (!requestedFormat || !payload || typeof payload.data !== "string") {
      throw new Error("Invalid export request");
    }
    const result = await dialog.showSaveDialog(mainWindow, {
      title: `Export ${requestedFormat.name}`,
      defaultPath: defaultExportPath(requestedFormat.extension),
      properties: ["showOverwriteConfirmation"],
      filters: [{ name: requestedFormat.name, extensions: [requestedFormat.extension] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    const targetPath = result.filePath.endsWith(`.${requestedFormat.extension}`)
      ? result.filePath
      : `${result.filePath}.${requestedFormat.extension}`;
    if (format === "png") {
      await fs.writeFile(targetPath, Buffer.from(payload.data, "base64"));
    } else {
      await fs.writeFile(
        targetPath,
        renderPngAsPdf(Buffer.from(payload.data, "base64")),
      );
    }
    return { canceled: false, path: targetPath };
  });
  ipcMain.handle("app:quit", () => app.quit());
  ipcMain.handle("settings:set-mode", async (_, nextMode) => {
    mode = nextMode === "professional" ? "professional" : "sketch";
    await persistMode();
    installApplicationMenu();
  });
  await restoreActiveFilePath();
  await restoreRecentFiles();
  await restoreMode();
  installApplicationMenu();
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("web-contents-created", (_, contents) => {
  contents.on("will-navigate", (event) => event.preventDefault());
});
