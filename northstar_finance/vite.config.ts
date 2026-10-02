import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";

export default defineConfig({
  root: "src/student360/ui",
  define: {
    __APP_NAME__: JSON.stringify("Northstar University — Office of Finance"),
  },
  plugins: [
    TanStackRouterVite({
      routesDirectory: "routes",
      generatedRouteTree: "types/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/student360/ui"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "src/student360/__dist__"),
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
