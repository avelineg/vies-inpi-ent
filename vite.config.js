import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Sur Render ou un domaine dédié, restez à la racine :
  base: "/",
  // Si vous hébergez sur Plesk en sous-dossier “/widget/”, mettez base: "/widget/"
  plugins: [react()],
});
