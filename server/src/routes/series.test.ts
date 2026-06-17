import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { Server } from "http";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import os from "os";

const tmpRoot = join(os.tmpdir(), `bt-series-api-test-${Date.now()}`);

let server: Server;
let port: number;

beforeAll(async () => {
  mkdirSync(tmpRoot, { recursive: true });
  for (const dir of ["authors", "series", "works", "editions", "copies", "notes", "attachments", ".booktracker/cache"]) {
    mkdirSync(join(tmpRoot, dir), { recursive: true });
  }

  const { writeFile } = await import("../lib/io.js");

  writeFile(join(tmpRoot, "series/dune-chronicles.md"), {
    type: "series", slug: "dune-chronicles",
    name: "Dune Chronicles",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  writeFile(join(tmpRoot, "series/empty-series.md"), {
    type: "series", slug: "empty-series",
    name: "Empty Series",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  writeFile(join(tmpRoot, "works/dune.md"), {
    type: "work", slug: "dune",
    title: "Dune", authors: [],
    series: "[[series/dune-chronicles]]", series_position: 1,
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# Dune");

  writeFile(join(tmpRoot, "works/dune-messiah.md"), {
    type: "work", slug: "dune-messiah",
    title: "Dune Messiah", authors: [],
    series: "[[series/dune-chronicles]]", series_position: 2,
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# Dune Messiah");

  writeFile(join(tmpRoot, "works/children-of-dune.md"), {
    type: "work", slug: "children-of-dune",
    title: "Children of Dune", authors: [],
    series: "[[series/dune-chronicles]]",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# Children of Dune");

  const app = express();
  app.use(express.json());

  const { Index } = await import("../lib/index.js");
  const index = new Index(tmpRoot);
  index.load();

  const { createSeriesRouter } = await import("./series.js");
  app.use("/api/series", createSeriesRouter(index, tmpRoot));

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

describe("Series API", () => {
  describe("POST /api/series", () => {
    it("creates a series with name only", async () => {
      const res = await api("/api/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Foundation Series" }),
      });
      expect(res.status).toBe(201);
      const series = await res.json();
      expect(series.type).toBe("series");
      expect(series.name).toBe("Foundation Series");
      expect(series.slug).toBeTruthy();
    });

    it("creates a series with all optional fields", async () => {
      const res = await api("/api/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Earthsea Cycle", total_works: 6, aliases: ["Earthsea"] }),
      });
      expect(res.status).toBe(201);
      const series = await res.json();
      expect(series.total_works).toBe(6);
      expect(series.aliases).toEqual(["Earthsea"]);
    });

    it("returns 400 when name is missing", async () => {
      const res = await api("/api/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when name is an empty string", async () => {
      const res = await api("/api/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "   " }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/series", () => {
    it("returns all series", async () => {
      const res = await api("/api/series");
      expect(res.status).toBe(200);
      const series = await res.json();
      expect(Array.isArray(series)).toBe(true);
      expect(series.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("GET /api/series/:slug", () => {
    it("returns series with works sorted by series_position, position-less last", async () => {
      const res = await api("/api/series/dune-chronicles");
      expect(res.status).toBe(200);
      const series = await res.json();
      expect(series.slug).toBe("dune-chronicles");
      expect(series.works).toHaveLength(3);
      expect(series.works.map((w: { slug: string }) => w.slug)).toEqual([
        "dune",
        "dune-messiah",
        "children-of-dune",
      ]);
    });

    it("returns empty works array for a series with no linked works", async () => {
      const res = await api("/api/series/empty-series");
      expect(res.status).toBe(200);
      const series = await res.json();
      expect(series.works).toEqual([]);
    });

    it("returns 404 for non-existent series", async () => {
      const res = await api("/api/series/nonexistent");
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/series/:slug", () => {
    it("updates name", async () => {
      const res = await api("/api/series/empty-series", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Renamed Series" }),
      });
      expect(res.status).toBe(200);
      const series = await res.json();
      expect(series.name).toBe("Renamed Series");
    });

    it("updates total_works", async () => {
      const res = await api("/api/series/empty-series", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ total_works: 3 }),
      });
      expect(res.status).toBe(200);
      const series = await res.json();
      expect(series.total_works).toBe(3);
    });

    it("rejects an empty name", async () => {
      const res = await api("/api/series/empty-series", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" }),
      });
      expect(res.status).toBe(400);
    });

    it("ignores attempts to change slug or type", async () => {
      const res = await api("/api/series/empty-series", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "hacked", type: "other" }),
      });
      expect(res.status).toBe(200);
      const series = await res.json();
      expect(series.slug).toBe("empty-series");
      expect(series.type).toBe("series");
    });

    it("returns 404 for non-existent series", async () => {
      const res = await api("/api/series/nonexistent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "x" }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/series/:slug", () => {
    it("deletes a series with no linked works", async () => {
      const create = await api("/api/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Throwaway Series" }),
      });
      const { slug } = await create.json();

      const del = await api(`/api/series/${slug}`, { method: "DELETE" });
      expect(del.status).toBe(200);
      expect(existsSync(join(tmpRoot, `series/${slug}.md`))).toBe(false);

      const get = await api(`/api/series/${slug}`);
      expect(get.status).toBe(404);
    });

    it("returns 409 when series has linked works and cascade is not set", async () => {
      const res = await api("/api/series/dune-chronicles", { method: "DELETE" });
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.work_count).toBe(3);
    });

    it("cascades: clears series link from works and deletes the series", async () => {
      const res = await api("/api/series/dune-chronicles?cascade=true", { method: "DELETE" });
      expect(res.status).toBe(200);

      expect(existsSync(join(tmpRoot, "series/dune-chronicles.md"))).toBe(false);

      const { readFile } = await import("../lib/io.js");
      const work = readFile(join(tmpRoot, "works/dune.md"));
      expect(work.frontmatter.series).toBeUndefined();
      expect(work.frontmatter.series_position).toBeUndefined();

      const getSeries = await api("/api/series/dune-chronicles");
      expect(getSeries.status).toBe(404);
    });

    it("returns 404 for non-existent series", async () => {
      const res = await api("/api/series/nonexistent", { method: "DELETE" });
      expect(res.status).toBe(404);
    });
  });
});
