import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { Server } from "http";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import os from "os";

const tmpRoot = join(os.tmpdir(), `bt-copy-api-test-${Date.now()}`);

let server: Server;
let port: number;

beforeAll(async () => {
  mkdirSync(tmpRoot, { recursive: true });
  for (const dir of ["authors", "series", "works", "editions", "copies", "notes", "attachments", ".booktracker/cache"]) {
    mkdirSync(join(tmpRoot, dir), { recursive: true });
  }

  const { writeFile } = await import("../lib/io.js");

  writeFile(join(tmpRoot, "works/dune.md"), {
    type: "work", slug: "dune",
    title: "Dune", authors: [],
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# Dune");

  writeFile(join(tmpRoot, "editions/dune-ace-1990.md"), {
    type: "edition", slug: "dune-ace-1990",
    work: "[[works/dune]]",
    publisher: "Ace Books", format: "paperback", page_count: 604,
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  // Pre-seeded copy for PATCH / DELETE / GET tests
  writeFile(join(tmpRoot, "copies/dune-ace-1990.md"), {
    type: "copy", slug: "dune-ace-1990",
    edition: "[[editions/dune-ace-1990]]",
    work: "[[works/dune]]",
    status: "owned",
    condition: "good",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  const app = express();
  app.use(express.json());

  const { Index } = await import("../lib/index.js");
  const index = new Index(tmpRoot);
  index.load();

  const { createCopiesRouter } = await import("./copies.js");
  app.use("/api/copies", createCopiesRouter(index, tmpRoot));

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

describe("Copy API", () => {
  describe("POST /api/copies", () => {
    it("creates a copy with defaults", async () => {
      const res = await api("/api/copies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edition: "dune-ace-1990", work: "dune" }),
      });
      expect(res.status).toBe(201);
      const copy = await res.json();
      expect(copy.type).toBe("copy");
      expect(copy.edition).toBe("[[editions/dune-ace-1990]]");
      expect(copy.work).toBe("[[works/dune]]");
      expect(copy.status).toBe("owned");
      expect(copy.slug).toBeTruthy();
    });

    it("creates a copy with all optional fields", async () => {
      const res = await api("/api/copies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          edition: "dune-ace-1990",
          work: "dune",
          condition: "very good",
          location: "living room shelf",
          acquisition_source: "bookshop.org",
          acquisition_date: "2024-03-01",
          price_amount: 14.99,
          price_currency: "USD",
          status: "owned",
        }),
      });
      expect(res.status).toBe(201);
      const copy = await res.json();
      expect(copy.condition).toBe("very good");
      expect(copy.location).toBe("living room shelf");
      expect(copy.price_amount).toBe(14.99);
    });

    it("returns 400 when edition is missing", async () => {
      const res = await api("/api/copies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work: "dune" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when work is missing", async () => {
      const res = await api("/api/copies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edition: "dune-ace-1990" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when edition does not exist", async () => {
      const res = await api("/api/copies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edition: "nonexistent", work: "dune" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when work does not exist", async () => {
      const res = await api("/api/copies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edition: "dune-ace-1990", work: "nonexistent" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/copies/:slug", () => {
    it("returns copy with edition_meta and work_meta", async () => {
      const res = await api("/api/copies/dune-ace-1990");
      expect(res.status).toBe(200);
      const copy = await res.json();
      expect(copy.slug).toBe("dune-ace-1990");
      expect(copy.status).toBe("owned");
      expect(copy.edition_meta).toBeDefined();
      expect(copy.edition_meta.slug).toBe("dune-ace-1990");
      expect(copy.edition_meta.publisher).toBe("Ace Books");
      expect(copy.edition_meta.format).toBe("paperback");
      expect(copy.work_meta).toBeDefined();
      expect(copy.work_meta.slug).toBe("dune");
      expect(copy.work_meta.title).toBe("Dune");
    });

    it("returns 404 for non-existent copy", async () => {
      const res = await api("/api/copies/nonexistent");
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/copies/:slug", () => {
    it("updates mutable fields", async () => {
      const res = await api("/api/copies/dune-ace-1990", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition: "worn", location: "attic" }),
      });
      expect(res.status).toBe(200);
      const copy = await res.json();
      expect(copy.condition).toBe("worn");
      expect(copy.location).toBe("attic");
    });

    it("updates status", async () => {
      const res = await api("/api/copies/dune-ace-1990", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "lent" }),
      });
      expect(res.status).toBe(200);
      const copy = await res.json();
      expect(copy.status).toBe("lent");
    });

    it("ignores attempts to change edition, work, or slug", async () => {
      const res = await api("/api/copies/dune-ace-1990", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edition: "other", work: "other", slug: "hacked" }),
      });
      expect(res.status).toBe(200);
      const copy = await res.json();
      expect(copy.edition).toBe("[[editions/dune-ace-1990]]");
      expect(copy.work).toBe("[[works/dune]]");
      expect(copy.slug).toBe("dune-ace-1990");
    });

    it("returns 404 for non-existent copy", async () => {
      const res = await api("/api/copies/nonexistent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition: "good" }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/copies/:slug", () => {
    it("deletes a copy and removes it from the index", async () => {
      const create = await api("/api/copies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edition: "dune-ace-1990", work: "dune" }),
      });
      const { slug } = await create.json();

      const del = await api(`/api/copies/${slug}`, { method: "DELETE" });
      expect(del.status).toBe(200);

      expect(existsSync(join(tmpRoot, `copies/${slug}.md`))).toBe(false);

      const get = await api(`/api/copies/${slug}`);
      expect(get.status).toBe(404);
    });

    it("returns 404 for non-existent copy", async () => {
      const res = await api("/api/copies/nonexistent", { method: "DELETE" });
      expect(res.status).toBe(404);
    });
  });
});
