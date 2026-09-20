import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Excalidraw, exportToBlob, exportToCanvas, serializeAsJSON } from "@excalidraw/excalidraw";
import { setLocalProfessionalPalette } from "@excalidraw/excalidraw/colors";
import "../node_modules/@excalidraw/excalidraw/dist/prod/index.css";
import "./style.css";

// Keep every Excalidraw font request within the packaged application's dist/fonts/.
window.EXCALIDRAW_ASSET_PATH = new URL("./", window.location.href).href;
const SCENE_STORAGE_KEY = "excalidraw-local:last-scene";
const MODE_STORAGE_KEY = "excalidraw-local:mode";
const PROFESSIONAL_APP_STATE = {
  currentItemRoughness: 0,
  currentItemFontFamily: 2,
  currentItemArrowType: "elbow",
  currentItemEndArrowhead: "triangle",
  currentItemStrokeColor: "#222624",
  currentItemBackgroundColor: "transparent",
  currentItemFillStyle: "solid",
  viewBackgroundColor: "#ffffff"
};
const SKETCH_APP_STATE = {
  currentItemRoughness: 1,
  currentItemFontFamily: 5,
  currentItemArrowType: "round",
  currentItemEndArrowhead: "arrow",
  currentItemStrokeColor: "#1e1e1e",
  currentItemBackgroundColor: "transparent",
  currentItemFillStyle: "hachure",
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
  const [mode, setDrawingMode] = useState(() => localStorage.getItem(MODE_STORAGE_KEY) === "professional" ? "professional" : "sketch");
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [isExportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportPadding, setExportPadding] = useState(0);
  const [exportBackground, setExportBackground] = useState("transparent");
  const [exportPreview, setExportPreview] = useState(null);
  const [exportError, setExportError] = useState("");
  const apiRef = useRef(null);
  const setExcalidrawAPIRef = useCallback((api) => {
    apiRef.current = api;
    setExcalidrawAPI(api);
  }, []);
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
  const getExportOptions = useCallback(() => ({
    elements: apiRef.current.getSceneElements(),
    appState: {
      ...apiRef.current.getAppState(),
      exportBackground: exportBackground === "canvas"
    },
    files: apiRef.current.getFiles(),
    exportPadding: exportPadding
  }), [exportBackground, exportPadding]);
  const updateExportPreview = useCallback(async () => {
    if (!apiRef.current) return;
    const canvas = await exportToCanvas(getExportOptions());
    setExportPreview({ url: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height });
  }, [getExportOptions]);
  const exportScene = useCallback(async (format) => {
    if (!apiRef.current || !window.excalidrawLocal) return;
    try {
      const options = getExportOptions();
      const canvas = await exportToCanvas(options);
      const blob = await exportToBlob({ ...options, mimeType: "image/png" });
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error);
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      const result = await window.excalidrawLocal.saveExport(format, {
        data: dataUrl.split(",", 2)[1],
        width: canvas.width,
        height: canvas.height
      });
      if (!result.canceled) {
        setExportError("");
        setExportDialogOpen(false);
      }
    } catch (error) {
      console.error(`Could not export ${format}`, error);
      setExportError(`Could not export ${format.toUpperCase()}: ${error?.message || "an unexpected error occurred"}`);
    }
  }, [getExportOptions]);
  const newCanvas = useCallback(async () => {
    if (!apiRef.current || !window.excalidrawLocal) return;
    apiRef.current.resetScene();
    // resetScene restores Excalidraw's built-in defaults. Reapply the active
    // local mode so a new canvas behaves exactly like the current mode.
    setLocalProfessionalPalette(mode === "professional");
    apiRef.current.updateScene({
      appState: mode === "professional" ? PROFESSIONAL_APP_STATE : SKETCH_APP_STATE
    });
    localStorage.removeItem(SCENE_STORAGE_KEY);
    await window.excalidrawLocal.newCanvas();
  }, [mode]);
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
  useEffect(() => window.excalidrawLocal?.onExportRequest(() => {
    setExportError("");
    setExportDialogOpen(true);
  }), []);
  useEffect(() => {
    if (!isExportDialogOpen) return;
    updateExportPreview().catch((error) => console.error("Could not preview export", error));
  }, [isExportDialogOpen, updateExportPreview]);
  useEffect(() => window.excalidrawLocal?.onModeRequest(async (nextMode) => {
    const resolvedMode = nextMode === "professional" ? "professional" : "sketch";
    localStorage.setItem(MODE_STORAGE_KEY, resolvedMode);
    setLocalProfessionalPalette(resolvedMode === "professional");
    setDrawingMode(resolvedMode);
    await window.excalidrawLocal.setMode(resolvedMode);
  }), []);
  useEffect(() => {
    setLocalProfessionalPalette(mode === "professional");
    excalidrawAPI?.updateScene({ appState: mode === "professional" ? PROFESSIONAL_APP_STATE : SKETCH_APP_STATE });
  }, [excalidrawAPI, mode]);
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

  return <>
    <Excalidraw excalidrawAPI={setExcalidrawAPIRef} theme="light" initialData={initialData} onChange={saveScene} />
    {isExportDialogOpen && <div className="export-dialog-backdrop" role="presentation">
      <section className="export-dialog" role="dialog" aria-modal="true" aria-label="Export drawing">
        <header><h2>Export drawing</h2><button type="button" aria-label="Close export dialog" onClick={() => setExportDialogOpen(false)}>×</button></header>
        <div className="export-preview">
          {exportPreview && <img src={exportPreview.url} alt="Preview of the exported drawing" />}
        </div>
        <p className="export-dimensions">{exportPreview ? `${exportPreview.width} × ${exportPreview.height} px` : "Preparing preview…"}</p>
        <label>Padding (px)
          <input type="number" min="0" step="1" value={exportPadding} onChange={(event) => setExportPadding(Math.max(0, Number(event.target.value) || 0))} />
        </label>
        <fieldset>
          <legend>Padding color</legend>
          <label><input type="radio" name="export-background" checked={exportBackground === "transparent"} onChange={() => setExportBackground("transparent")} /> Transparent</label>
          <label><input type="radio" name="export-background" checked={exportBackground === "canvas"} onChange={() => setExportBackground("canvas")} /> Canvas color</label>
        </fieldset>
        {exportError && <p className="export-error" role="alert">{exportError}</p>}
        <footer>
          <button type="button" onClick={() => setExportDialogOpen(false)}>Cancel</button>
          <button type="button" disabled={!exportPreview} onClick={() => exportScene("png")}>Export PNG</button>
          <button type="button" disabled={!exportPreview} onClick={() => exportScene("pdf")}>Export PDF</button>
        </footer>
      </section>
    </div>}
    </>;
}

createRoot(document.getElementById("root")).render(<App />);
