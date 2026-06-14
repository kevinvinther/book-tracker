import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { Server } from "http";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());

  // Minimal server setup that mirrors index.ts's routes
  const { readConfig, writeConfig } = await import("./config.js");
  const { ensureLibraryDirectories } = await import("./config.js");

  const config = readConfig();
  ensureLibraryDirectories(config.library_path);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/config", (_req, res) => {
    res.json(readConfig());
  });

  app.patch("/api/config", (req, res) => {
    const { library_path } = req.body;
    if (!library_path || typeof library_path !== "string" || !library_path.trim()) {
      res.status(400).json({ error: "library_path is required" });
      return;
    }
    const updated = { library_path: library_path.trim() };
    writeConfig(updated);
    res.json(updated);
  });

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === "object") {
        baseUrl = `http://localhost:${addr.port}`;
      }
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe("API routes", () => {
  describe("GET /api/health", () => {
    it("returns 200 with status ok", async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toEqual({ status: "ok" });
    });
  });

  describe("GET /api/config", () => {
    it("returns 200 with library_path", async () => {
      const res = await fetch(`${baseUrl}/api/config`);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty("library_path");
      expect(typeof body.library_path).toBe("string");
    });
  });

  describe("PATCH /api/config", () => {
    it("updates config with valid path", async () => {
      const res = await fetch(`${baseUrl}/api/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ library_path: "/tmp/test-lib" }),
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.library_path).toBe("/tmp/test-lib");
    });

    it("rejects empty path with 400", async () => {
      const res = await fetch(`${baseUrl}/api/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ library_path: "" }),
      });
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("rejects missing field with 400", async () => {
      const res = await fetch(`${baseUrl}/api/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });
  });
});
