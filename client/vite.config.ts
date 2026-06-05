import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const clientRoot = path.dirname(fileURLToPath(import.meta.url)); // .../client

export default defineConfig({
  plugins: [react()],
  root: path.join(clientRoot, "src"),
  build: {
    outDir: "../public",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.join(clientRoot, "src/index.html"),
        design: path.join(clientRoot, "src/design.html"),
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
