import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // relative base: the same bundle serves from GitHub Pages' project subpath
  // and from Capacitor's file:// origin
  base: "./",
  plugins: [react()],
  publicDir: "public",
  assetsInclude: ["**/*.wasm", "**/*.pix"],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: [
      "@capacitor/core",
      "@capacitor/preferences",
      "@capacitor-community/sqlite",
      "jeep-sqlite/loader",
    ],
    exclude: ["sql.js"],
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("@capacitor") || id.includes("jeep-sqlite") || id.includes("sql.js")) {
            return "capacitor-sqlite";
          }
          if (id.includes("three") || id.includes("@react-three/fiber")) {
            return "renderer";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
    },
  },
});
