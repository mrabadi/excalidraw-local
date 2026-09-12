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

function addProfessionalPalette() {
  return {
    name: "add-professional-palette",
    transform(code, id) {
      if (!id.endsWith("@excalidraw/excalidraw/dist/prod/chunk-K2UTITRG.js") || code.includes("EXCALIDRAW_PROFESSIONAL_MODE")) return null;
      const marker = ',j9={transparent:Z.transparent';
      if (!code.includes(marker)) throw new Error("Unsupported Excalidraw color bundle; update the professional-palette Vite transform.");
      const professionalPalette = `;window.EXCALIDRAW_PROFESSIONAL_MODE&&(Z.black="#222624",Z.white="#FAFAF7",Z.gray.splice(0,5,"#F0F1F0","#D6D9D7","#B6BCB9","#8B9490","#222624"),Z.bronze.splice(0,5,"#F2EAE5","#DECAC0","#C6AA9C","#A68776","#6F5747"),Z.green.splice(0,5,"#E6F0EC","#CCE0D7","#A5C9B8","#77A28B","#2F6B57"),Z.blue.splice(0,5,"#E4EDF1","#C8DCE5","#9FBECD","#6D97AC","#356078"),Z.violet.splice(0,5,"#ECE7F0","#D8CBE0","#BCA9C8","#9179A3","#66507A"),Z.yellow.splice(0,5,"#FAF2DC","#F2DFAD","#E6C97A","#D0A84F","#B38B30"),Z.red.splice(0,5,"#F7E9EB","#EDCFD3","#DEADB4","#BE7984","#994A55"),Z.orange.splice(0,5,"#F8EBE2","#F0D3BF","#E4AC88","#C97F52","#A95F2B"),Object.keys(Ns).forEach(e=>delete Ns[e]),Object.assign(Ns,{bronze:Z.bronze,blue:Z.blue,violet:Z.violet,green:Z.green,yellow:Z.yellow,orange:Z.orange,red:Z.red}),W9.splice(0,5,Z.black,"#994A55","#2F6B57","#356078","#B38B30"),z9.splice(0,5,Z.transparent,"#EDCFD3","#CCE0D7","#C8DCE5","#F2DFAD"),Q9.splice(0,5,Z.white,"#F0F1F0","#E4EDF1","#FAF2DC","#F2EAE5"));var `;
      return code.replace(marker, `${professionalPalette}${marker.slice(1)}`);
    }
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), addLocalFonts(), addProfessionalPalette()],
  build: { outDir: "dist", emptyOutDir: true }
});
