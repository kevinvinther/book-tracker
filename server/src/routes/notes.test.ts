import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { Server } from "http";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import os from "os";

const tmpRoot = join(os.tmpdir(), `bt-notes-api-test-${Date.now()}`);

let server: Server;
let port: number;

beforeAll(async () => {
  mkdirSync(tmpRoot, { recursive: true });
  for (const dir of ["authors", "series", "works", "editions", "copies", "notes", "attachments", ".booktracker/cache"]) {
    mkdirSync(join(tmpRoot, dir), { recursive: true });
  }

  const { writeFile } = await import("../lib/io.js");

  writeFile(join(tmpRoot, `works/dune.md`), {
    type: "work", slug: "dune",
    title: "Dune",
    authors: ["[[authors/frank-herbert]]"],
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# Dune");

  writeFile(join(tmpRoot, `authors/frank-herbert.md`), {
    type: "author", slug: "frank-herbert", name: "Frank Herbert",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# Frank Herbert");

  writeFile(join(tmpRoot, `editions/dune-ace.md`), {
    type: "edition", slug: "dune-ace",
    work: "[[works/dune]]",
    publisher: "Ace",
    format: "hardcover",
    page_count: 412,
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# Dune (Ace)");

  writeFile(join(tmpRoot, `copies/dune-hc.md`), {
    type: "copy", slug: "dune-hc",
    work: "[[works/dune]]",
    edition: "[[editions/dune-ace]]",
    status: "owned",
    condition: "good",
    read_throughs: [
      {
        started_date: "2024-03-15T12:00:00.000Z",
        finished_date: null,
        status: "reading",
        page_log: [{ date: "2024-03-15T12:00:00.000Z", page: 0 }, { date: "2024-03-16T12:00:00.000Z", page: 104 }],
      },
      {
        started_date: "2023-01-01T00:00:00.000Z",
        finished_date: "2023-02-01T00:00:00.000Z",
        status: "finished",
        rating: 9.5,
        page_log: [{ date: "2023-01-01T00:00:00.000Z", page: 0 }, { date: "2023-02-01T00:00:00.000Z", page: 412 }],
      },
    ],
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# Dune HC");

  const app = express();
  app.use(express.json());

  const { Index } = await import("../lib/index.js");
  const index = new Index(tmpRoot);
  index.load();
  app.locals.index = index;

  const { createNotesRouter } = await import("./notes.js");
  app.use("/api/notes", createNotesRouter(index, tmpRoot));

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

describe("Notes API", () => {
  describe("POST /api/notes", () => {
    it("creates a note targeting a copy", async () => {
      const res = await api("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          copy: "dune-hc",
          content: "Great chapter.",
          context_page: 104,
          tags: ["thoughts"],
        }),
      });
      expect(res.status).toBe(201);
      const note = await res.json();
      expect(note.type).toBe("note");
      expect(note.copy).toBe("[[copies/dune-hc]]");
      expect(note.edition).toBe("[[editions/dune-ace]]");
      expect(note.work).toBe("[[works/dune]]");
      expect(note.body).toBe("Great chapter.");
      expect(note.context_page).toBe(104);
      expect(note.tags).toEqual(["thoughts"]);
      expect(note.date).toBeTruthy();
      expect(note.modified).toBeTruthy();
      expect(note._schema).toBe(1);
      expect(note.slug).toMatch(/^\d{4}-\d{2}-\d{2}-\d{6}/);
      expect(note.copy_meta.slug).toBe("dune-hc");
      expect(note.edition_meta.publisher).toBe("Ace");
      expect(note.work_meta.title).toBe("Dune");
    });

    it("creates a note targeting a copy with read_through", async () => {
      const res = await api("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          copy: "dune-hc",
          content: "Mid-read thought.",
          read_through: "2024-03-15",
        }),
      });
      expect(res.status).toBe(201);
      const note = await res.json();
      expect(note.read_through).toBe("2024-03-15");
      expect(note.read_through_meta.status).toBe("reading");
    });

    it("creates a note targeting a work", async () => {
      const res = await api("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          work: "dune",
          content: "Herbert's prose is dense.",
        }),
      });
      expect(res.status).toBe(201);
      const note = await res.json();
      expect(note.work).toBe("[[works/dune]]");
      expect(note.copy).toBeUndefined();
      expect(note.edition).toBeUndefined();
      expect(note.copy_meta).toBeNull();
      expect(note.edition_meta).toBeNull();
      expect(note.work_meta.title).toBe("Dune");
    });

    it("creates a note targeting an edition", async () => {
      const res = await api("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          edition: "dune-ace",
          content: "Nice cover art.",
        }),
      });
      expect(res.status).toBe(201);
      const note = await res.json();
      expect(note.edition).toBe("[[editions/dune-ace]]");
      expect(note.work).toBe("[[works/dune]]");
      expect(note.copy).toBeUndefined();
      expect(note.edition_meta.publisher).toBe("Ace");
    });

    it("rejects note with no reference", async () => {
      const res = await api("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Just text." }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.toLowerCase()).toContain("at least one");
    });

    it("rejects note with non-existent reference", async () => {
      const res = await api("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work: "nonexistent", content: "Text." }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("does not exist");
    });

    it("rejects read_through without copy", async () => {
      const res = await api("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work: "dune", content: "Text.", read_through: "2024-01-01" }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("read_through requires a copy");
    });

    it("rejects invalid read_through on copy", async () => {
      const res = await api("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copy: "dune-hc", content: "Text.", read_through: "2020-01-01" }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("not found");
    });

    it("handles slug collision by appending suffix", async () => {
      // Determine the timestamp slug that would be generated right now
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      const base = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

      // Pre-create a note with the timestamp slug so the next create collides
      const { writeFile } = await import("../lib/io.js");
      writeFile(join(tmpRoot, `notes/${base}.md`), {
        type: "note", slug: base,
        date: now.toISOString(), modified: now.toISOString(),
        work: "[[works/dune]]", _schema: 1,
      }, "Collision note body.");

      // Reload index (re-create the express app via the same pattern)
      // Instead, let's just test via the API which uses the index
      const res = await api("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work: "dune", content: "After collision." }),
      });
      expect(res.status).toBe(201);
      const note = await res.json();
      expect(note.slug).toMatch(new RegExp(`^${base}-\\d+`));
    });
  });

  describe("GET /api/notes", () => {
    it("lists all notes sorted by date descending", async () => {
      const res = await api("/api/notes");
      expect(res.status).toBe(200);
      const notes = await res.json();
      expect(notes.length).toBeGreaterThanOrEqual(1);
      for (let i = 1; i < notes.length; i++) {
        expect(notes[i - 1].date.localeCompare(notes[i].date)).toBeGreaterThanOrEqual(0);
      }
    });

    it("filters notes by copy", async () => {
      const res = await api("/api/notes?copy=dune-hc");
      expect(res.status).toBe(200);
      const notes = await res.json();
      for (const n of notes) {
        expect(n.copy).toBe("[[copies/dune-hc]]");
      }
    });

    it("filters notes by edition", async () => {
      // First create a note with a specific edition
      await api("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edition: "dune-ace", content: "Edition note." }),
      });

      const res = await api("/api/notes?edition=dune-ace");
      expect(res.status).toBe(200);
      const notes = await res.json();
      expect(notes.length).toBeGreaterThanOrEqual(1);
      for (const n of notes) {
        expect(n.edition).toBe("[[editions/dune-ace]]");
      }
    });

    it("filters notes by work", async () => {
      const res = await api("/api/notes?work=dune");
      expect(res.status).toBe(200);
      const notes = await res.json();
      expect(notes.length).toBeGreaterThanOrEqual(1);
      for (const n of notes) {
        expect(n.work).toBe("[[works/dune]]");
      }
    });

    it("searches note body text", async () => {
      await api("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work: "dune", content: "Unique search term banana." }),
      });

      const res = await api("/api/notes?q=banana");
      expect(res.status).toBe(200);
      const notes = await res.json();
      expect(notes.length).toBeGreaterThanOrEqual(1);
      expect(notes[0].body).toContain("banana");
    });

    it("returns empty array for non-matching filter", async () => {
      const res = await api("/api/notes?copy=nonexistent");
      expect(res.status).toBe(200);
      const notes = await res.json();
      expect(notes).toEqual([]);
    });
  });

  describe("GET /api/notes/:slug", () => {
    let createdSlug: string;

    beforeAll(async () => {
      const res = await api("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work: "dune", content: "Specific note." }),
      });
      const note = await res.json();
      createdSlug = note.slug;
    });

    it("returns a single note", async () => {
      const res = await api(`/api/notes/${createdSlug}`);
      expect(res.status).toBe(200);
      const note = await res.json();
      expect(note.slug).toBe(createdSlug);
      expect(note.body).toBe("Specific note.");
      expect(note.work_meta.title).toBe("Dune");
    });

    it("returns 404 for missing note", async () => {
      const res = await api("/api/notes/nonexistent");
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/notes/:slug", () => {
    let editSlug: string;

    beforeAll(async () => {
      const res = await api("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work: "dune", content: "Original text.", tags: ["old"] }),
      });
      const note = await res.json();
      editSlug = note.slug;
    });

    it("updates mutable fields", async () => {
      const res = await api(`/api/notes/${editSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Updated text.", tags: ["new", "revised"], context_page: 50 }),
      });
      expect(res.status).toBe(200);
      const note = await res.json();
      expect(note.body).toBe("Updated text.");
      expect(note.tags).toEqual(["new", "revised"]);
      expect(note.context_page).toBe(50);
    });

    it("updates modified timestamp", async () => {
      const before = new Date().toISOString();
      const res = await api(`/api/notes/${editSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Modified again." }),
      });
      const note = await res.json();
      expect(note.modified).not.toBe(note.date);
      expect(new Date(note.modified).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime() - 1000);
    });

    it("ignores immutable fields", async () => {
      const res = await api(`/api/notes/${editSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work: "hacked", copy: "stolen", date: "1999-01-01" }),
      });
      expect(res.status).toBe(200);
      const note = await res.json();
      expect(note.work).toBe("[[works/dune]]");
      expect(note.copy).toBeUndefined();
      expect(note.date).not.toBe("1999-01-01");
    });

    it("returns 404 for non-existent note", async () => {
      const res = await api("/api/notes/nonexistent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Nope." }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/notes/:slug", () => {
    it("deletes a note", async () => {
      const createRes = await api("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work: "dune", content: "To delete." }),
      });
      const { slug } = await createRes.json();

      const delRes = await api(`/api/notes/${slug}`, { method: "DELETE" });
      expect(delRes.status).toBe(200);
      const body = await delRes.json();
      expect(body.message).toBe("Note deleted");

      const getRes = await api(`/api/notes/${slug}`);
      expect(getRes.status).toBe(404);
    });

    it("returns 404 for non-existent note", async () => {
      const res = await api("/api/notes/nonexistent", { method: "DELETE" });
      expect(res.status).toBe(404);
    });
  });
});
