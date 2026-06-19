import { fileURLToPath, URL } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

const useHttps = process.env.HTTPS === "true";

function findMkcertCerts(): { key: string; cert: string } | null {
  const dirs = [".certs", "/app/certs"];
  for (const dir of dirs) {
    const key = `${dir}/localhost-key.pem`;
    const cert = `${dir}/localhost.pem`;
    if (existsSync(key) && existsSync(cert)) {
      return { key, cert };
    }
  }
  return null;
}

const mkcertCerts = findMkcertCerts();

const plugins: Plugin[] = [react(), tailwindcss()];
if (useHttps && !mkcertCerts) {
  console.warn("HTTPS: mkcert certs not found. Run `make certs` to avoid browser warnings.");
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
    ...(mkcertCerts
      ? { https: { key: readFileSync(mkcertCerts.key), cert: readFileSync(mkcertCerts.cert) } }
      : useHttps
        ? { https: true }
        : {}),
  },
});
