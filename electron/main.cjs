const { app, BrowserWindow, session, shell } = require("electron");
const path = require("path");

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
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.webContents.on("will-attach-webview", (event) => event.preventDefault());
  window.webContents.setPermissionRequestHandler((_, __, callback) => callback(false));
  window.webContents.setPermissionCheckHandler(() => false);
  window.webContents.on("will-prevent-unload", (event) => event.preventDefault());
  window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

app.commandLine.appendSwitch("disable-background-networking");
app.commandLine.appendSwitch("disable-component-update");
app.commandLine.appendSwitch("disable-features", "MediaRouter,OptimizationHints,AutofillServerCommunication,CertificateTransparencyComponentUpdater");
app.commandLine.appendSwitch("disable-gpu");
app.on("web-contents-created", (_, contents) => {
  contents.setWindowOpenHandler(() => ({ action: "deny" }));
});
app.whenReady().then(() => {
  blockNetworkRequests();
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("web-contents-created", (_, contents) => {
  contents.on("will-navigate", (event) => event.preventDefault());
});
