const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("excalidrawLocal", {
  saveScene: (scene, forceSaveAs = false) => ipcRenderer.invoke("scene:save", scene, forceSaveAs),
  onSaveRequest: (callback) => {
    const listener = (_, forceSaveAs) => callback(Boolean(forceSaveAs));
    ipcRenderer.on("scene:save-request", listener);
    return () => ipcRenderer.removeListener("scene:save-request", listener);
  }
});
