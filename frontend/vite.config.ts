import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// The SPA talks to the Go API. In dev, /api is proxied to :8080 so there is no
// CORS to configure; in production the built assets are served by nginx which
// proxies /api to the backend (see frontend/nginx.conf).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "Homework Studio",
        short_name: "Homework",
        description:
          "Homework in → graded, gated, and turned into a warm progress report. Plus an AI tutor.",
        theme_color: "#fb6a51",
        background_color: "#eef1f7",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // never serve the SPA shell for API calls out of the cache
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
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
