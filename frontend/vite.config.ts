import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The SPA talks to the Go API. In dev, /api is proxied to :8080 so there is no
// CORS to configure; in production the built assets are served by nginx which
// proxies /api to the backend (see frontend/nginx.conf).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: process.env.VITE_API_TARGET || "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
