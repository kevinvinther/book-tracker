import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import express from "express";
import { Server } from "http";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import os from "os";

const tmpRoot = join(os.tmpdir(), `bt-lookup-route-test-${Date.now()}`);

let server: Server;
let port: number;

// Save the real fetch before any stubbing
const realFetch = globalThis.fetch.bind(globalThis);

beforeAll(async () => {
  mkdirSync(tmpRoot, { recursive: true });
  for (const dir of [".booktracker/cache", "attachments"]) {
    mkdirSync(join(tmpRoot, dir), { recursive: true });
  }

  const app = express();
  app.use(express.json());

  const { createLookupRouter } = await import("./lookup.js");
  app.use("/api/lookup", createLookupRouter(tmpRoot));

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
  return realFetch(`http://localhost:${port}${path}`);
}

function mockExternalFetch(urlResponses: Record<string, { body?: unknown; headers?: Record<string, string>; arrayBuffer?: ArrayBuffer }>) {
  vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
    // Pass through localhost requests to the real fetch
    if (url.includes("localhost") || url.includes("127.0.0.1")) {
      return realFetch(url);
    }
    // Return mocked responses for matching URLs
    for (const [key, mock] of Object.entries(urlResponses)) {
      if (url.includes(key)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mock.body || {}),
          headers: new Map(Object.entries(mock.headers || {})),
          arrayBuffer: () => Promise.resolve(mock.arrayBuffer || new ArrayBuffer(0)),
        } as unknown as Response);
      }
    }
    return Promise.resolve({ ok: false } as unknown as Response);
  }));
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/lookup", () => {
  it("returns 400 when ISBN parameter is missing", async () => {
    const res = await api("/api/lookup");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("ISBN parameter is required");
  });

  it("returns 400 when ISBN parameter is empty", async () => {
    const res = await api("/api/lookup?isbn=");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("ISBN parameter is required");
  });

  it("returns 404 when ISBN is not found", async () => {
    mockExternalFetch({});

    const res = await api("/api/lookup?isbn=0000000000000");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Couldn't find this ISBN");
  });

  it("returns 200 with normalized data on successful lookup", async () => {
    const editionData = {
      title: "Route Test Book",
      authors: [{ key: "/authors/OL19997A" }],
      publishers: ["Test Publisher"],
      publish_date: "2020",
      number_of_pages: 200,
      subjects: ["Fiction"],
      description: "Test description.",
      covers: [99999],
      languages: [{ key: "/languages/eng" }],
    };
    const authorData = { name: "Test Author" };

    mockExternalFetch({
      "openlibrary.org/isbn": { body: editionData },
      "openlibrary.org/authors": { body: authorData },
      "covers.openlibrary.org": { headers: { "content-type": "image/jpeg" }, arrayBuffer: new ArrayBuffer(4) },
    });

    const res = await api("/api/lookup?isbn=9781234567890");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("Route Test Book");
    expect(body.authors).toEqual(["Test Author"]);
    expect(body.publisher).toBe("Test Publisher");
    expect(body.source).toBe("openlibrary");
  });
});
