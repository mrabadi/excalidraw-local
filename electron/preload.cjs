const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("excalidrawLocal", {
  saveScene: (scene, forceSaveAs = false) => ipcRenderer.invoke("scene:save", scene, forceSaveAs),
  newCanvas: () => ipcRenderer.invoke("scene:new"),
  openScene: (filePath = null) => ipcRenderer.invoke("scene:open", filePath),
  saveExport: (format, payload) => ipcRenderer.invoke("scene:export", format, payload),
  setMode: (mode) => ipcRenderer.invoke("settings:set-mode", mode),
  quit: () => ipcRenderer.invoke("app:quit"),
  onSaveRequest: (callback) => {
    const listener = (_, forceSaveAs) => callback(Boolean(forceSaveAs));
    ipcRenderer.on("scene:save-request", listener);
    return () => ipcRenderer.removeListener("scene:save-request", listener);
  },
  onNewCanvasRequest: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("scene:new-request", listener);
    return () => ipcRenderer.removeListener("scene:new-request", listener);
  },
  onOpenRequest: (callback) => {
    const listener = (_, filePath) => callback(filePath);
    ipcRenderer.on("scene:open-request", listener);
    return () => ipcRenderer.removeListener("scene:open-request", listener);
  },
  onExportRequest: (callback) => {
    const listener = (_, format) => callback(format);
    ipcRenderer.on("scene:export-request", listener);
    return () => ipcRenderer.removeListener("scene:export-request", listener);
  },
  onModeRequest: (callback) => {
    const listener = (_, mode) => callback(mode);
    ipcRenderer.on("settings:mode-request", listener);
    return () => ipcRenderer.removeListener("settings:mode-request", listener);
  }
});
