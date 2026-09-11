import React from "react";
import { createRoot } from "react-dom/client";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import "./style.css";

// Keep every Excalidraw font request within the packaged application's dist/fonts/.
window.EXCALIDRAW_ASSET_PATH = new URL("./", window.location.href).href;

function App() {
  return <Excalidraw theme="light" />;
}

createRoot(document.getElementById("root")).render(<App />);
