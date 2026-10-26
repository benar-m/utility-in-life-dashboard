import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config for the Utility in Life Empowerment dashboard.
// Kept minimal so the build stays easy to reason about.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    open: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
