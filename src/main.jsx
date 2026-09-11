import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Excalidraw, serializeAsJSON } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import "./style.css";

// Keep every Excalidraw font request within the packaged application's dist/fonts/.
window.EXCALIDRAW_ASSET_PATH = new URL("./", window.location.href).href;
const SCENE_STORAGE_KEY = "excalidraw-local:last-scene";

function loadPreviousScene() {
  try {
    const stored = localStorage.getItem(SCENE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : undefined;
  } catch {
    return undefined;
  }
}

function App() {
  const [initialData] = useState(loadPreviousScene);
  const apiRef = useRef(null);
  const saveScene = useCallback((elements, appState, files) => {
    try {
      localStorage.setItem(SCENE_STORAGE_KEY, serializeAsJSON(elements, appState, files, "local"));
    } catch (error) {
      console.error("Could not save the local scene", error);
    }
  }, []);
  const saveToFile = useCallback(async (forceSaveAs) => {
    if (!apiRef.current || !window.excalidrawLocal) return;
    const scene = serializeAsJSON(
      apiRef.current.getSceneElementsIncludingDeleted(),
      apiRef.current.getAppState(),
      apiRef.current.getFiles(),
      "local"
    );
    const result = await window.excalidrawLocal.saveScene(scene, forceSaveAs);
  }, []);
  const newCanvas = useCallback(async () => {
    if (!apiRef.current || !window.excalidrawLocal) return;
    apiRef.current.resetScene();
    localStorage.removeItem(SCENE_STORAGE_KEY);
    await window.excalidrawLocal.newCanvas();
  }, []);
  const openScene = useCallback(async (filePath = null) => {
    if (!apiRef.current || !window.excalidrawLocal) return;
    const result = await window.excalidrawLocal.openScene(filePath);
    if (result.canceled || result.error) return;
    apiRef.current.resetScene();
    apiRef.current.updateScene(result.scene);
    localStorage.setItem(SCENE_STORAGE_KEY, JSON.stringify(result.scene));
  }, []);
  useEffect(() => window.excalidrawLocal?.onSaveRequest(saveToFile), [saveToFile]);
  useEffect(() => window.excalidrawLocal?.onNewCanvasRequest(newCanvas), [newCanvas]);
  useEffect(() => window.excalidrawLocal?.onOpenRequest(openScene), [openScene]);
  useEffect(() => {
    const interceptSaveShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        event.stopImmediatePropagation();
        saveToFile(event.shiftKey);
      }
    };
    window.addEventListener("keydown", interceptSaveShortcut, true);
    return () => window.removeEventListener("keydown", interceptSaveShortcut, true);
  }, [saveToFile]);

  return <Excalidraw excalidrawAPI={(api) => { apiRef.current = api; }} theme="light" initialData={initialData} onChange={saveScene} />;
}

createRoot(document.getElementById("root")).render(<App />);
