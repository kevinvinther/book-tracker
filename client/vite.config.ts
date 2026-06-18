import { fileURLToPath, URL } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

const useHttps = process.env.HTTPS === "true";
const certDir = "/app/certs";
const dockerKey = `${certDir}/localhost.key`;
const dockerCert = `${certDir}/localhost.crt`;
const hasDockerCerts = existsSync(dockerKey) && existsSync(dockerCert);

const plugins: Plugin[] = [react(), tailwindcss()];
if (useHttps && !hasDockerCerts) {
  plugins.push(basicSsl());
}

export default defineConfig({
  plugins,
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
    ...(hasDockerCerts
      ? { https: { key: readFileSync(dockerKey), cert: readFileSync(dockerCert) } }
      : useHttps
        ? { https: true }
        : {}),
  },
});
