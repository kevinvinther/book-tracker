import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { Server } from "http";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());

  const { readConfig, ensureLibraryDirectories } = await import("./config.js");

  const config = readConfig();
  ensureLibraryDirectories(config.library_path);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/config", (_req, res) => {
    res.json(readConfig());
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
});
