const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("excalidrawLocal", {
  saveScene: (scene, forceSaveAs = false) => ipcRenderer.invoke("scene:save", scene, forceSaveAs),
  newCanvas: () => ipcRenderer.invoke("scene:new"),
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
  }
});
