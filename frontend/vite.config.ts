import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Proxies API calls to the backend server-side, so the browser only ever
// talks to the frontend origin (works through proxied preview URLs).
// Target: BACKEND_URL env (docker compose sets http://backend:8000),
// otherwise local backend on :8000.
const backend = process.env.BACKEND_URL ?? "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: "0.0.0.0",
    // Allow the platform's proxied preview host(s); true = allow any host.
    allowedHosts: true,
    proxy: {
      "/api": backend,
      "/graph": backend,
      "/search": backend,
      "/health": backend,
    },
  },
});
