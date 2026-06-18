import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

// Enable HTTPS with a self-signed cert only when HTTPS=true. Needed to test
// camera/getUserMedia features (e.g. the barcode scanner) on a phone over the
// LAN, since those APIs require a secure context.
const useHttps = process.env.HTTPS === "true";

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(useHttps ? [basicSsl()] : [])],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": process.env.BACKEND_URL || "http://localhost:3001",
    },
  },
});
