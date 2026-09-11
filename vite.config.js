import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function addLocalFonts() {
  return {
    name: "add-local-fonts",
    transform(code, id) {
      if (!id.endsWith("@excalidraw/excalidraw/dist/prod/chunk-K2UTITRG.js") || code.includes("Verdana:10")) return null;
      const familyMarker = 'Liberation Sans":9},Un=';
      const initializationMarker = 'n("Liberation Sans",...lc),n("Lilita One"';
      if (!code.includes(familyMarker) || !code.includes(initializationMarker)) {
        throw new Error("Unsupported Excalidraw font bundle; update the local-font Vite transform.");
      }
      return code
        .replace(familyMarker, 'Liberation Sans":9,Verdana:10,Ubuntu:11},Un=')
        .replace(initializationMarker, 'n("Liberation Sans",...lc),n("Verdana",{uri:"local:Verdana"}),n("Ubuntu",{uri:"./fonts/Ubuntu/Ubuntu-R.ttf"}),n("Lilita One"');
    }
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), addLocalFonts()],
  build: { outDir: "dist", emptyOutDir: true }
});
