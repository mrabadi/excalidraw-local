import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Excalidraw, serializeAsJSON } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import "./style.css";

// Keep every Excalidraw font request within the packaged application's dist/fonts/.
window.EXCALIDRAW_ASSET_PATH = new URL("./", window.location.href).href;
const SCENE_STORAGE_KEY = "excalidraw-local:last-scene";
const MODE_STORAGE_KEY = "excalidraw-local:mode";
const PROFESSIONAL_APP_STATE = {
  currentItemRoughness: 0,
  currentItemFontFamily: 10,
  currentItemArrowType: "elbow",
  currentItemStrokeColor: "#222624",
  currentItemBackgroundColor: "transparent",
  viewBackgroundColor: "#FAFAF7"
};
const SKETCH_APP_STATE = {
  currentItemRoughness: 1,
  currentItemFontFamily: 5,
  currentItemArrowType: "round",
  currentItemStrokeColor: "#1e1e1e",
  currentItemBackgroundColor: "transparent",
  viewBackgroundColor: "#ffffff"
};

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
  const [mode] = useState(() => localStorage.getItem(MODE_STORAGE_KEY) === "professional" ? "professional" : "sketch");
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
  useEffect(() => window.excalidrawLocal?.onModeRequest(async (nextMode) => {
    const resolvedMode = nextMode === "professional" ? "professional" : "sketch";
    localStorage.setItem(MODE_STORAGE_KEY, resolvedMode);
    await window.excalidrawLocal.setMode(resolvedMode);
    window.location.reload();
  }), []);
  useEffect(() => {
    apiRef.current?.updateScene({ appState: mode === "professional" ? PROFESSIONAL_APP_STATE : SKETCH_APP_STATE });
  }, [mode]);
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
