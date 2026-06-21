import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { Server } from "http";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import os from "os";

const tmpRoot = join(os.tmpdir(), `bt-work-api-test-${Date.now()}`);

let server: Server;
let port: number;

beforeAll(async () => {
  mkdirSync(tmpRoot, { recursive: true });
  for (const dir of ["authors", "series", "works", "editions", "copies", "notes", "attachments", ".booktracker/cache"]) {
    mkdirSync(join(tmpRoot, dir), { recursive: true });
  }

  // Seed test data on disk before the index loads
  const { writeFile } = await import("../lib/io.js");

  writeFile(join(tmpRoot, `works/the-brothers-karamazov.md`), {
    type: "work", slug: "the-brothers-karamazov",
    title: "The Brothers Karamazov",
    authors: ["[[authors/fyodor-dostoevsky]]"],
    genres: ["fiction", "classic"],
    created_at: "2024-01-10T12:00:00.000Z", _schema: 1,
  }, "# The Brothers Karamazov");

  // A work with editions for cascade delete testing
  writeFile(join(tmpRoot, `works/cascade-target.md`), {
    type: "work", slug: "cascade-target",
    title: "Cascade Target", authors: [],
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# Cascade Target");

  writeFile(join(tmpRoot, `authors/fyodor-dostoevsky.md`), {
    type: "author", slug: "fyodor-dostoevsky", name: "Fyodor Dostoevsky",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# Fyodor Dostoevsky");

  writeFile(join(tmpRoot, `authors/second-author.md`), {
    type: "author", slug: "second-author", name: "Second Author",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# Second Author");

  writeFile(join(tmpRoot, `series/karamazov-series.md`), {
    type: "series", slug: "karamazov-series", name: "Karamazov Series",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  writeFile(join(tmpRoot, `works/multi-author-work.md`), {
    type: "work", slug: "multi-author-work",
    title: "Multi Author Work",
    authors: ["[[authors/fyodor-dostoevsky]]", "[[authors/second-author]]"],
    series: "[[series/karamazov-series]]",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# Multi Author Work");

  writeFile(join(tmpRoot, `editions/cascade-edition.md`), {
    type: "edition", slug: "cascade-edition",
    work: "[[works/cascade-target]]", publisher: "Test",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# Cascade Edition");

  writeFile(join(tmpRoot, `copies/cascade-copy.md`), {
    type: "copy", slug: "cascade-copy",
    work: "[[works/cascade-target]]", edition: "[[editions/cascade-edition]]",
    status: "owned", condition: "good",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# Cascade Copy");

  writeFile(join(tmpRoot, `notes/2024-01-01-000000.md`), {
    type: "note", slug: "2024-01-01-000000",
    date: "2024-01-01T00:00:00.000Z", modified: "2024-01-01T00:00:00.000Z",
    copy: "[[copies/cascade-copy]]", edition: "[[editions/cascade-edition]]",
    work: "[[works/cascade-target]]", _schema: 1,
  }, "Note content");

  const app = express();
  app.use(express.json());

  const { Index } = await import("../lib/index.js");
  const index = new Index(tmpRoot);
  index.load();
  app.locals.index = index;

  const { createWorksRouter } = await import("./works.js");
  app.use("/api/works", createWorksRouter(index, tmpRoot));

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

describe("Work API", () => {
  describe("POST /api/works", () => {
    it("creates a work with auto-generated slug", async () => {
      const res = await api("/api/works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Dune" }),
      });
      expect(res.status).toBe(201);

      const work = await res.json();
      expect(work.title).toBe("Dune");
      expect(work.slug).toBe("dune");
      expect(work.type).toBe("work");
      expect(work.created_at).toBeTruthy();
      expect(work._schema).toBe(1);
    });

    it("creates a work with all optional fields", async () => {
      const res = await api("/api/works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Foundation",
          subtitle: "Book One",
          authors: ["[[authors/isaac-asimov]]"],
          genres: ["fiction", "science-fiction"],
          description: "A classic",
          original_language: "en",
          original_publish_year: 1951,
          aliases: ["Foundation Trilogy", "Asimov Foundation"],
        }),
      });
      const work = await res.json();
      expect(res.status).toBe(201);
      expect(work.subtitle).toBe("Book One");
      expect(work.genres).toEqual(["fiction", "science-fiction"]);
      expect(work.aliases).toEqual(["Foundation Trilogy", "Asimov Foundation"]);
    });

    it("returns 400 when title is missing", async () => {
      const res = await api("/api/works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtitle: "No title" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/works", () => {
    it("returns all works", async () => {
      const res = await api("/api/works");
      const works = await res.json();
      expect(works.length).toBeGreaterThanOrEqual(3);
    });

    it("filters by search query", async () => {
      const res = await api("/api/works?q=karamazov");
      const works = await res.json();
      expect(works.length).toBe(1);
      expect(works[0].slug).toBe("the-brothers-karamazov");
    });

    it("sorts by title ascending", async () => {
      const res = await api("/api/works?sort=title&order=asc");
      const works = await res.json();
      const titles = works.map((w: any) => w.title);
      expect(titles).toEqual([...titles].sort((a: string, b: string) => a.localeCompare(b)));
    });

    it("sorts by created_at descending by default", async () => {
      const res = await api("/api/works?sort=created_at");
      const works = await res.json();
      const dates = works.map((w: any) => w.created_at);
      expect(dates).toEqual([...dates].sort().reverse());
    });

    it("includes a resolved copy_count on each work", async () => {
      const res = await api("/api/works");
      const works = await res.json();
      const cascadeTarget = works.find((w: any) => w.slug === "cascade-target");
      expect(cascadeTarget.copy_count).toBe(1);
    });

    it("includes resolved authors_meta on each work", async () => {
      const res = await api("/api/works");
      const works = await res.json();
      const tbk = works.find((w: any) => w.slug === "the-brothers-karamazov");
      expect(tbk.authors_meta).toEqual([{ slug: "fyodor-dostoevsky", name: "Fyodor Dostoevsky" }]);

      const multiAuthor = works.find((w: any) => w.slug === "multi-author-work");
      expect(multiAuthor.authors_meta).toEqual([
        { slug: "fyodor-dostoevsky", name: "Fyodor Dostoevsky" },
        { slug: "second-author", name: "Second Author" },
      ]);
    });
  });

  describe("GET /api/works/:slug", () => {
    it("returns work with resolved counts", async () => {
      const res = await api("/api/works/cascade-target");
      const work = await res.json();
      expect(work.slug).toBe("cascade-target");
      expect(work.edition_count).toBe(1);
      expect(work.copy_count).toBe(1);
    });

    it("returns 404 for non-existent work", async () => {
      const res = await api("/api/works/nonexistent");
      expect(res.status).toBe(404);
    });

    it("resolves authors_meta for a work with multiple authors", async () => {
      const res = await api("/api/works/multi-author-work");
      const work = await res.json();
      expect(work.authors_meta).toEqual([
        { slug: "fyodor-dostoevsky", name: "Fyodor Dostoevsky" },
        { slug: "second-author", name: "Second Author" },
      ]);
    });

    it("resolves series_meta when the work has a linked series", async () => {
      const res = await api("/api/works/multi-author-work");
      const work = await res.json();
      expect(work.series_meta).toEqual({ slug: "karamazov-series", name: "Karamazov Series" });
    });

    it("returns series_meta: null when the work has no series", async () => {
      const res = await api("/api/works/cascade-target");
      const work = await res.json();
      expect(work.series_meta).toBeNull();
    });
  });

  describe("PATCH /api/works/:slug", () => {
    const slug = "the-brothers-karamazov";

    it("updates title", async () => {
      const res = await api(`/api/works/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "TBK (Updated)" }),
      });
      const work = await res.json();
      expect(res.status).toBe(200);
      expect(work.title).toBe("TBK (Updated)");
    });

    it("ignores slug changes", async () => {
      const res = await api(`/api/works/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "hacked" }),
      });
      const work = await res.json();
      expect(work.slug).toBe(slug);
    });

    it("returns 404 for non-existent work", async () => {
      const res = await api("/api/works/nope", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "X" }),
      });
      expect(res.status).toBe(404);
    });

    it("updates aliases via PATCH", async () => {
      const res = await api(`/api/works/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aliases: ["TBK", "Karamazov"] }),
      });
      const work = await res.json();
      expect(res.status).toBe(200);
      expect(work.aliases).toEqual(["TBK", "Karamazov"]);
    });

    it("rejects empty title on update", async () => {
      const res = await api(`/api/works/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "" }),
      });
      expect(res.status).toBe(400);
    });

    it("clears a field when explicitly sent as null", async () => {
      await api(`/api/works/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "Temporary description" }),
      });

      const res = await api(`/api/works/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: null }),
      });

      const work = await res.json();
      expect(work.description).toBeUndefined();
    });

    it("preserves fields not in PATCH body", async () => {
      // Update only description, verify title unchanged
      await api(`/api/works/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "TBK (Updated)" }),
      });

      const res = await api(`/api/works/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "A great novel" }),
      });

      const work = await res.json();
      expect(work.title).toBe("TBK (Updated)");
      expect(work.description).toBe("A great novel");
    });
  });

  describe("DELETE /api/works/:slug", () => {
    it("deletes work with no editions", async () => {
      const create = await api("/api/works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Solo Work" }),
      });
      const { slug } = await create.json();

      const del = await api(`/api/works/${slug}`, { method: "DELETE" });
      expect(del.status).toBe(200);

      const get = await api(`/api/works/${slug}`);
      expect(get.status).toBe(404);
    });

    it("returns 409 when editions exist", async () => {
      const res = await api("/api/works/cascade-target", { method: "DELETE" });
      expect(res.status).toBe(409);

      const body = await res.json();
      expect(body.edition_count).toBe(1);
    });

    it("cascade deletes work with editions, copies, and notes", async () => {
      const res = await api("/api/works/cascade-target?cascade=true", { method: "DELETE" });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.cascade).toBe(true);

      // Verify everything is gone
      const get = await api("/api/works/cascade-target");
      expect(get.status).toBe(404);

      const { existsSync } = await import("fs");
      expect(existsSync(join(tmpRoot, "works/cascade-target.md"))).toBe(false);
      expect(existsSync(join(tmpRoot, "editions/cascade-edition.md"))).toBe(false);
      expect(existsSync(join(tmpRoot, "copies/cascade-copy.md"))).toBe(false);
      expect(existsSync(join(tmpRoot, "notes/2024-01-01-000000.md"))).toBe(false);
    });
  });

  describe("Aliases", () => {
    let aliasSlug: string;

    beforeAll(async () => {
      const res = await api("/api/works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Alias Test" }),
      });
      const work = await res.json();
      aliasSlug = work.slug;
    });

    it("adds an alias", async () => {
      const res = await api(`/api/works/${aliasSlug}/aliases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias: "Test Alias" }),
      });
      const work = await res.json();
      expect(res.status).toBe(200);
      expect(work.aliases).toContain("Test Alias");
    });

    it("removes an alias", async () => {
      const res = await api(`/api/works/${aliasSlug}/aliases`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias: "Test Alias" }),
      });
      const work = await res.json();
      expect(res.status).toBe(200);
      expect(work.aliases || []).not.toContain("Test Alias");
    });

    it("returns 404 when removing non-existent alias", async () => {
      const res = await api(`/api/works/${aliasSlug}/aliases`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias: "not-there" }),
      });
      expect(res.status).toBe(404);
    });
  });
});
