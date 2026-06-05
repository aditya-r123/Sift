import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: "src",
  envDir: "..",
  build: {
    outDir: "../public",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.join(repoRoot, "src/index.html"),
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/auth": "http://127.0.0.1:3001",
      "/api": "http://127.0.0.1:3001",
    },
  },
});
