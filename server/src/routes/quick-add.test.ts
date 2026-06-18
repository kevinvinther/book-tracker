import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { Server } from "http";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import os from "os";

const tmpRoot = join(os.tmpdir(), `bt-quick-add-test-${Date.now()}`);

let server: Server;
let port: number;

beforeAll(async () => {
  mkdirSync(tmpRoot, { recursive: true });
  for (const dir of ["authors", "series", "works", "editions", "copies", "notes", "attachments", ".booktracker/cache"]) {
    mkdirSync(join(tmpRoot, dir), { recursive: true });
  }

  // Seed an existing author
  const { writeFile } = await import("../lib/io.js");
  writeFile(join(tmpRoot, "authors/frank-herbert.md"), {
    type: "author", slug: "frank-herbert",
    name: "Frank Herbert",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# Frank Herbert");

  const app = express();
  app.use(express.json());

  const { Index } = await import("../lib/index.js");
  const index = new Index(tmpRoot);
  index.load();

  const { createQuickAddRouter } = await import("./quick-add.js");
  app.use("/api/quick-add", createQuickAddRouter(index, tmpRoot));

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

describe("Quick-add API", () => {
  describe("POST /api/quick-add", () => {
    it("creates work, edition, copy with existing author", async () => {
      const res = await api("/api/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Dune",
          authorNames: ["Frank Herbert"],
          publisher: "Chilton Books",
          publish_date: "1965-08-01",
        }),
      });
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.workSlug).toBeTruthy();

      // Verify work exists on disk
      expect(existsSync(join(tmpRoot, `works/${body.workSlug}.md`))).toBe(true);
    });

    it("creates a new author when not found", async () => {
      const res = await api("/api/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Hyperion",
          authorNames: ["Dan Simmons"],
        }),
      });
      expect(res.status).toBe(201);

      // Verify new author was created
      expect(existsSync(join(tmpRoot, "authors/dan-simmons.md"))).toBe(true);
    });

    it("handles multiple authors (mix of existing and new)", async () => {
      const res = await api("/api/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Collaboration",
          authorNames: ["Frank Herbert", "Brian Herbert"],
        }),
      });
      expect(res.status).toBe(201);

      expect(existsSync(join(tmpRoot, "authors/brian-herbert.md"))).toBe(true);
    });

    it("returns 400 when title is missing", async () => {
      const res = await api("/api/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorNames: ["Frank Herbert"] }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("title");
    });

    it("returns 400 when authorNames is empty", async () => {
      const res = await api("/api/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Book", authorNames: [] }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("author");
    });

    it("creates all three entities on disk", async () => {
      const res = await api("/api/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Foundation",
          subtitle: "The Foundation Trilogy",
          authorNames: ["Isaac Asimov"],
          publisher: "Gnome Press",
          publish_date: "1951-06-01",
          page_count: 255,
          format: "hardcover",
          isbn: "978-0-553-80371-6",
          language: "en",
          condition: "fine",
          location: "Shelf 3",
          acquisition_source: "Bookshop",
          price_amount: 30,
          price_currency: "USD",
        }),
      });
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(existsSync(join(tmpRoot, `works/${body.workSlug}.md`))).toBe(true);

      // Find the edition by scanning the directory
      const { Index } = await import("../lib/index.js");
      const idx = new Index(tmpRoot);
      idx.load();

      const editions = idx.getEditionsByWork(body.workSlug);
      expect(editions.length).toBe(1);
      expect(editions[0].publisher).toBe("Gnome Press");
      expect(editions[0].page_count).toBe(255);

      const copies = idx.getCopiesByWork(body.workSlug);
      expect(copies.length).toBe(1);
      expect(copies[0].condition).toBe("fine");
      expect(copies[0].location).toBe("Shelf 3");
    });

    it("creates with minimal fields (title + author only)", async () => {
      const res = await api("/api/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Minimal Book",
          authorNames: ["Minimal Author"],
        }),
      });
      expect(res.status).toBe(201);

      const body = await res.json();
      const { Index } = await import("../lib/index.js");
      const idx = new Index(tmpRoot);
      idx.load();

      const work = idx.getWork(body.workSlug);
      expect(work).toBeTruthy();
      expect(work!.title).toBe("Minimal Book");

      const editions = idx.getEditionsByWork(body.workSlug);
      expect(editions.length).toBe(1);

      const copies = idx.getCopiesByWork(body.workSlug);
      expect(copies.length).toBe(1);
      expect(copies[0].status).toBe("owned");
    });

    it("matches author case-insensitively", async () => {
      const res = await api("/api/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "More Dune",
          authorNames: ["frank herbert"],
        }),
      });
      expect(res.status).toBe(201);

      // Only one Frank Herbert author should exist
      const { Index } = await import("../lib/index.js");
      const idx = new Index(tmpRoot);
      idx.load();
      const authors = idx.getAllAuthors().filter((a) => a.name.toLowerCase() === "frank herbert");
      expect(authors.length).toBe(1);
    });
  });
});
