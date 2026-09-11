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
  useEffect(() => window.excalidrawLocal?.onSaveRequest(saveToFile), [saveToFile]);
  useEffect(() => window.excalidrawLocal?.onNewCanvasRequest(newCanvas), [newCanvas]);

  return <Excalidraw excalidrawAPI={(api) => { apiRef.current = api; }} theme="light" initialData={initialData} onChange={saveScene} />;
}

createRoot(document.getElementById("root")).render(<App />);
