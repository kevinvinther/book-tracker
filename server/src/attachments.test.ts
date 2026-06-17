import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { Server } from "http";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import os from "os";

const tmpRoot = join(os.tmpdir(), `bt-attachments-test-${Date.now()}`);

let server: Server;
let port: number;

beforeAll(async () => {
  mkdirSync(join(tmpRoot, "attachments"), { recursive: true });
  writeFileSync(join(tmpRoot, "attachments", "dune-cover.jpg"), "fake-jpg-bytes", "utf-8");

  const app = express();
  app.use("/api/attachments", express.static(join(tmpRoot, "attachments"), { maxAge: "1d" }));
  app.use("/api/attachments", (_req, res) => {
    res.status(404).json({ error: "Attachment not found" });
  });

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server!.address();
      if (addr && typeof addr === "object") port = addr.port;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((r) => server?.close(() => r()));
  if (existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true });
});

function api(path: string): Promise<Response> {
  return fetch(`http://localhost:${port}${path}`);
}

describe("Attachment serving", () => {
  it("serves an existing attachment file", async () => {
    const res = await api("/api/attachments/dune-cover.jpg");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toBe("fake-jpg-bytes");
  });

  it("returns a JSON 404 for a missing attachment", async () => {
    const res = await api("/api/attachments/nonexistent.jpg");
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("does not serve files outside the attachments directory", async () => {
    const res = await api("/api/attachments/..%2F..%2Fpackage.json");
    expect(res.status).not.toBe(200);
  });
});
