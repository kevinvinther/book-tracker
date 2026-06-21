import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { Server } from "http";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import os from "os";

const tmpRoot = join(os.tmpdir(), `bt-search-api-test-${Date.now()}`);

let server: Server;
let port: number;

beforeAll(async () => {
  mkdirSync(tmpRoot, { recursive: true });
  for (const dir of ["authors", "series", "works", "editions", "copies", "notes", "attachments", ".booktracker/cache"]) {
    mkdirSync(join(tmpRoot, dir), { recursive: true });
  }

  const { writeFile } = await import("../lib/io.js");

  writeFile(join(tmpRoot, "authors/hera.md"), {
    type: "author", slug: "hera", name: "Frank Herbert",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# Frank Herbert");

  writeFile(join(tmpRoot, "works/dune.md"), {
    type: "work", slug: "dune", title: "Dune",
    authors: ["[[authors/hera]]"],
    genres: ["science-fiction"],
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# Dune");

  writeFile(join(tmpRoot, "editions/dune-ace.md"), {
    type: "edition", slug: "dune-ace",
    work: "[[works/dune]]",
    isbn: "978-0-441-17271-9",
    publisher: "Ace Books",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# Edition Dune Ace");

  writeFile(join(tmpRoot, "copies/dune-hc.md"), {
    type: "copy", slug: "dune-hc",
    work: "[[works/dune]]",
    edition: "[[editions/dune-ace]]",
    status: "owned", condition: "good",
    location: "Living room shelf",
    loans: [{ borrower_name: "Sarah Connor", lent_date: "2024-05-10" }],
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# Copy Dune HC");

  const app = express();
  app.use(express.json());

  const { Index } = await import("../lib/index.js");
  const index = new Index(tmpRoot);
  index.load();

  const { createSearchRouter } = await import("./search.js");
  app.use("/api/search", createSearchRouter(index));

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

function api(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`http://localhost:${port}${path}`, init);
}

describe("Search API", () => {
  describe("GET /api/search", () => {
    it("returns grouped results for a valid query", async () => {
      const res = await api("/api/search?q=dune");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.query).toBe("dune");
      expect(body.results).toBeDefined();
      expect(body.results.work).toBeDefined();
      expect(body.results.work.length).toBeGreaterThanOrEqual(1);
      expect(body.results.work[0]).toHaveProperty("type");
      expect(body.results.work[0]).toHaveProperty("slug");
      expect(body.results.work[0]).toHaveProperty("title");
      expect(body.results.work[0]).toHaveProperty("subtitle");
      expect(body.results.work[0]).toHaveProperty("link");
    });

    it("searches loans", async () => {
      const res = await api("/api/search?q=Sarah");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.results.loan.length).toBeGreaterThanOrEqual(1);
      expect(body.results.loan[0].title).toBe("Sarah Connor");
      expect(body.results.loan[0].link).toBe("/copies/dune-hc");
    });

    it("searches authors by name", async () => {
      const res = await api("/api/search?q=Frank");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.results.author.length).toBeGreaterThanOrEqual(1);
      expect(body.results.author[0].title).toBe("Frank Herbert");
    });

    it("returns empty arrays for empty query", async () => {
      const res = await api("/api/search?q=");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.results.work).toEqual([]);
      expect(body.results.author).toEqual([]);
    });

    it("returns 400 when q parameter is missing", async () => {
      const res = await api("/api/search");
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });

    it("returns empty results for no-match query", async () => {
      const res = await api("/api/search?q=zzzxxxnonexistent");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.results.work).toEqual([]);
      expect(body.results.author).toEqual([]);
    });
  });
});
