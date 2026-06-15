import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { Server } from "http";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import os from "os";

const tmpRoot = join(os.tmpdir(), `bt-edition-api-test-${Date.now()}`);

let server: Server;
let port: number;

beforeAll(async () => {
  mkdirSync(tmpRoot, { recursive: true });
  for (const dir of ["authors", "series", "works", "editions", "copies", "notes", "attachments", ".booktracker/cache"]) {
    mkdirSync(join(tmpRoot, dir), { recursive: true });
  }

  const { writeFile } = await import("../lib/io.js");

  // Seed a work to link editions to
  writeFile(join(tmpRoot, "works/dune.md"), {
    type: "work", slug: "dune",
    title: "Dune",
    authors: [],
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# Dune");

  // Seed an edition with an attached copy for orphan-protection tests
  writeFile(join(tmpRoot, "editions/dune-chilton-1965.md"), {
    type: "edition", slug: "dune-chilton-1965",
    work: "[[works/dune]]",
    publisher: "Chilton Books",
    publish_date: "1965-08-01",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  writeFile(join(tmpRoot, "copies/dune-copy-1.md"), {
    type: "copy", slug: "dune-copy-1",
    edition: "[[editions/dune-chilton-1965]]",
    work: "[[works/dune]]",
    status: "owned",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  const app = express();
  app.use(express.json());

  const { Index } = await import("../lib/index.js");
  const index = new Index(tmpRoot);
  index.load();

  const { createEditionsRouter } = await import("./editions.js");
  app.use("/api/editions", createEditionsRouter(index, tmpRoot));

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

describe("Edition API", () => {
  describe("POST /api/editions", () => {
    it("creates an edition with work and optional fields", async () => {
      const res = await api("/api/editions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          work: "dune",
          publisher: "Ace Books",
          publish_date: "1990-09-01",
          format: "paperback",
          isbn: "978-0441013593",
          page_count: 604,
          language: "en",
        }),
      });
      expect(res.status).toBe(201);

      const edition = await res.json();
      expect(edition.type).toBe("edition");
      expect(edition.work).toBe("[[works/dune]]");
      expect(edition.publisher).toBe("Ace Books");
      expect(edition.isbn).toBe("978-0441013593");
      expect(edition.page_count).toBe(604);
      expect(edition.slug).toBeTruthy();
    });

    it("creates an edition with only work field", async () => {
      const res = await api("/api/editions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work: "dune" }),
      });
      expect(res.status).toBe(201);
      const edition = await res.json();
      expect(edition.work).toBe("[[works/dune]]");
    });

    it("returns 400 when work is missing", async () => {
      const res = await api("/api/editions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publisher: "Nobody" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when work does not exist in index", async () => {
      const res = await api("/api/editions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work: "nonexistent-work" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/editions", () => {
    it("returns all editions", async () => {
      const res = await api("/api/editions");
      expect(res.status).toBe(200);
      const editions = await res.json();
      expect(Array.isArray(editions)).toBe(true);
      expect(editions.length).toBeGreaterThanOrEqual(1);
    });

    it("filters editions by work slug", async () => {
      const res = await api("/api/editions?work=dune");
      expect(res.status).toBe(200);
      const editions = await res.json();
      expect(Array.isArray(editions)).toBe(true);
      expect(editions.length).toBeGreaterThanOrEqual(1);
      for (const e of editions) {
        expect(e.work).toBe("[[works/dune]]");
      }
    });

    it("returns empty array for work with no editions", async () => {
      const res = await api("/api/editions?work=no-such-work");
      expect(res.status).toBe(200);
      const editions = await res.json();
      expect(editions).toEqual([]);
    });
  });

  describe("GET /api/editions/:slug", () => {
    it("returns edition with resolved copy_count", async () => {
      const res = await api("/api/editions/dune-chilton-1965");
      expect(res.status).toBe(200);
      const edition = await res.json();
      expect(edition.slug).toBe("dune-chilton-1965");
      expect(edition.copy_count).toBe(1);
    });

    it("returns 404 for non-existent edition", async () => {
      const res = await api("/api/editions/nonexistent");
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/editions/:slug", () => {
    it("updates mutable fields", async () => {
      const res = await api("/api/editions/dune-chilton-1965", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publisher: "Chilton Books (Revised)", page_count: 412 }),
      });
      expect(res.status).toBe(200);
      const edition = await res.json();
      expect(edition.publisher).toBe("Chilton Books (Revised)");
      expect(edition.page_count).toBe(412);
    });

    it("ignores attempts to change work or slug", async () => {
      const res = await api("/api/editions/dune-chilton-1965", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work: "other-work", slug: "hacked" }),
      });
      expect(res.status).toBe(200);
      const edition = await res.json();
      expect(edition.work).toBe("[[works/dune]]");
      expect(edition.slug).toBe("dune-chilton-1965");
    });

    it("returns 404 for non-existent edition", async () => {
      const res = await api("/api/editions/nonexistent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publisher: "Test" }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/editions/:slug", () => {
    it("deletes an edition with no copies", async () => {
      const create = await api("/api/editions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work: "dune", publisher: "Gollancz", publish_date: "2000-01-01" }),
      });
      const { slug } = await create.json();

      const del = await api(`/api/editions/${slug}`, { method: "DELETE" });
      expect(del.status).toBe(200);

      const get = await api(`/api/editions/${slug}`);
      expect(get.status).toBe(404);
    });

    it("returns 409 when copies reference the edition", async () => {
      const res = await api("/api/editions/dune-chilton-1965", { method: "DELETE" });
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.copy_count).toBe(1);
    });

    it("force deletes edition but leaves copies on disk", async () => {
      // Seed a fresh edition + copy for this test
      const { writeFile } = await import("../lib/io.js");
      writeFile(join(tmpRoot, "editions/force-test-ed.md"), {
        type: "edition", slug: "force-test-ed",
        work: "[[works/dune]]",
        created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
      }, "");
      writeFile(join(tmpRoot, "copies/force-test-copy.md"), {
        type: "copy", slug: "force-test-copy",
        edition: "[[editions/force-test-ed]]",
        work: "[[works/dune]]",
        status: "owned",
        created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
      }, "");

      // Reload index so the new files are visible
      const { Index } = await import("../lib/index.js");
      const freshIndex = new Index(tmpRoot);
      freshIndex.load();

      // Re-create a minimal app with the fresh index to test force delete
      const app2 = express();
      app2.use(express.json());
      const { createEditionsRouter } = await import("./editions.js");
      app2.use("/api/editions", createEditionsRouter(freshIndex, tmpRoot));

      let port2 = 0;
      await new Promise<void>((resolve) => {
        const s = app2.listen(0, () => {
          const addr = s.address();
          if (addr && typeof addr === "object") port2 = addr.port;
          resolve();
        });
      });

      const res = await fetch(`http://localhost:${port2}/api/editions/force-test-ed?force=true`, { method: "DELETE" });
      expect(res.status).toBe(200);

      // Edition file gone, copy file still on disk
      expect(existsSync(join(tmpRoot, "editions/force-test-ed.md"))).toBe(false);
      expect(existsSync(join(tmpRoot, "copies/force-test-copy.md"))).toBe(true);
    });

    it("cascade deletes edition and all copies", async () => {
      const res = await api("/api/editions/dune-chilton-1965?cascade=true", { method: "DELETE" });
      expect(res.status).toBe(200);

      expect(existsSync(join(tmpRoot, "editions/dune-chilton-1965.md"))).toBe(false);
      expect(existsSync(join(tmpRoot, "copies/dune-copy-1.md"))).toBe(false);

      const get = await api("/api/editions/dune-chilton-1965");
      expect(get.status).toBe(404);
    });

    it("returns 404 for non-existent edition", async () => {
      const res = await api("/api/editions/nonexistent", { method: "DELETE" });
      expect(res.status).toBe(404);
    });
  });
});
