const { app, BrowserWindow, Menu, dialog, ipcMain, session } = require("electron");
const fs = require("fs/promises");
const path = require("path");

let mainWindow;
let activeFilePath = null;

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

function installApplicationMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: "File",
      submenu: [
        { label: "New Canvas", accelerator: "CmdOrCtrl+N", click: requestNewCanvas },
        { label: "Save", accelerator: "CmdOrCtrl+S", click: () => requestSave(false) },
        { label: "Save As…", accelerator: "CmdOrCtrl+Shift+S", click: () => requestSave(true) },
        { role: "quit" }
      ]
    },
    { label: "Edit", submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }] }
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
    mainWindow?.setTitle(`Excalidraw Local — ${path.basename(targetPath)}`);
    return { canceled: false, path: targetPath };
  });
  ipcMain.handle("scene:new", async () => {
    activeFilePath = null;
    await persistActiveFilePath();
    mainWindow?.setTitle("Excalidraw Local");
  });
  ipcMain.handle("app:quit", () => app.quit());
  await restoreActiveFilePath();
  installApplicationMenu();
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("web-contents-created", (_, contents) => {
  contents.on("will-navigate", (event) => event.preventDefault());
});
