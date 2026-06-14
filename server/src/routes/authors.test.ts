import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { Server } from "http";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import os from "os";

const tmpRoot = join(os.tmpdir(), `bt-author-api-test-${Date.now()}`);

let server: Server;
let port: number;

beforeAll(async () => {
  mkdirSync(tmpRoot, { recursive: true });
  for (const dir of ["authors", "series", "works", "editions", "copies", "notes", "attachments", ".booktracker/cache"]) {
    mkdirSync(join(tmpRoot, dir), { recursive: true });
  }

  // Seed a work that references an author, for the cascade/409 tests
  const { writeFile } = await import("../lib/io.js");
  writeFile(join(tmpRoot, "authors/fyodor-dostoevsky.md"), {
    type: "author", slug: "fyodor-dostoevsky",
    name: "Fyodor Dostoevsky",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# Fyodor Dostoevsky");

  writeFile(join(tmpRoot, "works/the-brothers-karamazov.md"), {
    type: "work", slug: "the-brothers-karamazov",
    title: "The Brothers Karamazov",
    authors: ["[[authors/fyodor-dostoevsky]]"],
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# The Brothers Karamazov");

  const app = express();
  app.use(express.json());

  const { Index } = await import("../lib/index.js");
  const index = new Index(tmpRoot);
  index.load();
  app.locals.index = index;

  const { createAuthorsRouter } = await import("./authors.js");
  app.use("/api/authors", createAuthorsRouter(index, tmpRoot));

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

describe("Author API", () => {
  describe("POST /api/authors", () => {
    it("creates an author with auto-generated slug", async () => {
      const res = await api("/api/authors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Isaac Asimov" }),
      });
      expect(res.status).toBe(201);

      const author = await res.json();
      expect(author.name).toBe("Isaac Asimov");
      expect(author.slug).toBe("isaac-asimov");
      expect(author.type).toBe("author");
    });

    it("creates an author with aliases", async () => {
      const res = await api("/api/authors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Frank Herbert", aliases: ["FH"] }),
      });
      const author = await res.json();
      expect(res.status).toBe(201);
      expect(author.aliases).toContain("FH");
    });

    it("returns 400 when name is missing", async () => {
      const res = await api("/api/authors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aliases: ["test"] }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/authors", () => {
    it("returns all authors", async () => {
      const res = await api("/api/authors");
      const authors = await res.json();
      expect(authors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("GET /api/authors/:slug", () => {
    it("returns author with resolved works", async () => {
      const res = await api("/api/authors/fyodor-dostoevsky");
      expect(res.status).toBe(200);

      const author = await res.json();
      expect(author.name).toBe("Fyodor Dostoevsky");
      expect(author.works).toBeDefined();
      expect(author.works.length).toBe(1);
      expect(author.works[0].slug).toBe("the-brothers-karamazov");
      expect(author.works[0].title).toBe("The Brothers Karamazov");
    });

    it("returns 404 for non-existent author", async () => {
      const res = await api("/api/authors/nope");
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/authors/:slug", () => {
    it("updates name", async () => {
      const res = await api("/api/authors/fyodor-dostoevsky", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "F. M. Dostoevsky" }),
      });
      const author = await res.json();
      expect(res.status).toBe(200);
      expect(author.name).toBe("F. M. Dostoevsky");
    });

    it("updates aliases", async () => {
      const res = await api("/api/authors/fyodor-dostoevsky", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aliases: ["Dosty"] }),
      });
      const author = await res.json();
      expect(author.aliases).toEqual(["Dosty"]);
    });

    it("ignores slug changes", async () => {
      const res = await api("/api/authors/fyodor-dostoevsky", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "hacked" }),
      });
      const author = await res.json();
      expect(author.slug).toBe("fyodor-dostoevsky");
    });
  });

  describe("DELETE /api/authors/:slug", () => {
    it("deletes author with no linked works", async () => {
      const create = await api("/api/authors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Solo Author" }),
      });
      const { slug } = await create.json();

      const del = await api(`/api/authors/${slug}`, { method: "DELETE" });
      expect(del.status).toBe(200);

      const get = await api(`/api/authors/${slug}`);
      expect(get.status).toBe(404);
    });

    it("returns 409 when works reference the author", async () => {
      const res = await api("/api/authors/fyodor-dostoevsky", { method: "DELETE" });
      expect(res.status).toBe(409);

      const body = await res.json();
      expect(body.work_count).toBe(1);
    });

    it("cascade deletes author but does not modify linked works", async () => {
      const res = await api("/api/authors/fyodor-dostoevsky?cascade=true", { method: "DELETE" });
      expect(res.status).toBe(200);

      // Author is gone
      const getAuthor = await api("/api/authors/fyodor-dostoevsky");
      expect(getAuthor.status).toBe(404);

      // Work still exists with the dangling wikilink
      const { Index } = await import("../lib/index.js");
      const freshIndex = new Index(tmpRoot);
      freshIndex.load();

      const work = freshIndex.getWork("the-brothers-karamazov");
      expect(work).toBeTruthy();
      expect(work!.authors).toContain("[[authors/fyodor-dostoevsky]]");
      expect(existsSync(join(tmpRoot, "works/the-brothers-karamazov.md"))).toBe(true);
      expect(existsSync(join(tmpRoot, "authors/fyodor-dostoevsky.md"))).toBe(false);
    });
  });
});
