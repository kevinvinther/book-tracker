import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import os from "os";

const tmpRoot = join(os.tmpdir(), `bt-index-test-${Date.now()}`);

beforeAll(() => {
  mkdirSync(tmpRoot, { recursive: true });
  for (const dir of ["authors", "series", "works", "editions", "copies", "notes"]) {
    mkdirSync(join(tmpRoot, dir), { recursive: true });
  }
});

afterAll(() => {
  if (existsSync(tmpRoot)) {
    rmSync(tmpRoot, { recursive: true });
  }
});

import { writeFile } from "./io.js";
import { Index } from "./index.js";

function makeAuthor(slug: string, name: string) {
  return writeFile(join(tmpRoot, `authors/${slug}.md`), {
    type: "author", slug, name, created_at: "2024-01-01T00:00:00", _schema: 1,
  }, `# ${name}`);
}

function makeWork(slug: string, title: string, authorSlug: string, genres?: string[]) {
  return writeFile(join(tmpRoot, `works/${slug}.md`), {
    type: "work", slug, title,
    authors: [`[[authors/${authorSlug}]]`],
    genres: genres || [],
    created_at: "2024-01-01T00:00:00", _schema: 1,
  }, `# ${title}`);
}

function makeEdition(slug: string, workSlug: string) {
  return writeFile(join(tmpRoot, `editions/${slug}.md`), {
    type: "edition", slug,
    work: `[[works/${workSlug}]]`,
    publisher: "Test Publisher",
    created_at: "2024-01-01T00:00:00", _schema: 1,
  }, `# Edition ${slug}`);
}

function makeCopy(slug: string, workSlug: string, editionSlug: string) {
  return writeFile(join(tmpRoot, `copies/${slug}.md`), {
    type: "copy", slug,
    work: `[[works/${workSlug}]]`,
    edition: `[[editions/${editionSlug}]]`,
    status: "owned", condition: "good",
    created_at: "2024-01-01T00:00:00", _schema: 1,
  }, `# Copy ${slug}`);
}

function makeNote(slug: string, copySlug: string, editionSlug: string, workSlug: string, body: string) {
  return writeFile(join(tmpRoot, `notes/${slug}.md`), {
    type: "note", slug,
    date: "2024-01-01T00:00:00",
    modified: "2024-01-01T00:00:00",
    copy: `[[copies/${copySlug}]]`,
    edition: `[[editions/${editionSlug}]]`,
    work: `[[works/${workSlug}]]`,
    _schema: 1,
  }, body);
}

describe("Index", () => {
  describe("load", () => {
    it("parses entities from all subdirectories", () => {
      makeAuthor("fyodor-dostoevsky", "Fyodor Dostoevsky");
      makeWork("the-brothers-karamazov", "The Brothers Karamazov", "fyodor-dostoevsky", ["fiction", "classic"]);
      makeWork("crime-and-punishment", "Crime and Punishment", "fyodor-dostoevsky", ["fiction"]);
      makeEdition("karamazov-katz", "the-brothers-karamazov");
      makeCopy("karamazov-pb", "the-brothers-karamazov", "karamazov-katz");

      const index = new Index(tmpRoot);
      index.load();

      expect(index.getAllAuthors()).toHaveLength(1);
      expect(index.getAllWorks()).toHaveLength(2);
      expect(index.getAllEditions()).toHaveLength(1);
      expect(index.getAllCopies()).toHaveLength(1);
    });

    it("handles empty library", () => {
      const emptyDir = join(tmpRoot, "empty");
      mkdirSync(emptyDir, { recursive: true });

      const index = new Index(emptyDir);
      index.load();

      expect(index.getAllWorks()).toEqual([]);
      expect(index.getAllAuthors()).toEqual([]);
    });

    it("skips malformed files and loads remaining", () => {
      const mixedDir = join(tmpRoot, "mixed");
      mkdirSync(mixedDir, { recursive: true });
      mkdirSync(join(mixedDir, "works"), { recursive: true });

      writeFile(join(mixedDir, "works/good.md"), {
        type: "work", slug: "good", title: "Good Work",
        authors: [], created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# Good");
      writeFile(join(mixedDir, "works/bad.md"), {
        type: "work", slug: "bad", title: "Bad Work",
        authors: [], created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# Bad");

      writeFileSync(join(mixedDir, "works/invalid.md"), "---\n[bad yaml\n---\n", "utf-8");

      const index = new Index(mixedDir);
      index.load();

      expect(index.getAllWorks()).toHaveLength(2);
      expect(index.getWork("good")).toBeTruthy();
      expect(index.getWork("bad")).toBeTruthy();
    });

    it("stores note body text", () => {
      makeAuthor("test-author", "Test Author");
      makeWork("test-work", "Test Work", "test-author");
      makeEdition("test-edition", "test-work");
      makeCopy("test-copy", "test-work", "test-edition");
      makeNote("2024-01-01-000000", "test-copy", "test-edition", "test-work", "Note body content here");

      const index = new Index(tmpRoot);
      index.load();

      const note = index.getNote("2024-01-01-000000");
      expect(note).toBeTruthy();
      expect(note!.body).toBe("Note body content here");
    });

    it("does not store body for non-note entities", () => {
      const index = new Index(tmpRoot);
      index.load();

      const work = index.getWork("test-work");
      expect(work).toBeTruthy();
      expect((work as any).body).toBeUndefined();
    });
  });

  describe("lookup", () => {
    let index: Index;

    beforeAll(() => {
      makeAuthor("hera", "Frank Herbert");
      makeWork("dune", "Dune", "hera", ["fiction"]);
      makeEdition("dune-ace", "dune");
      makeCopy("dune-hc", "dune", "dune-ace");

      index = new Index(tmpRoot);
      index.load();
    });

    it("getAuthor returns author by slug", () => {
      const author = index.getAuthor("hera");
      expect(author?.name).toBe("Frank Herbert");
    });

    it("getAuthor returns undefined for unknown slug", () => {
      expect(index.getAuthor("nope")).toBeUndefined();
    });

    it("getWork returns work by slug", () => {
      expect(index.getWork("dune")?.title).toBe("Dune");
    });

    it("getWork returns undefined for unknown slug", () => {
      expect(index.getWork("nope")).toBeUndefined();
    });

    it("getEdition returns edition by slug", () => {
      expect(index.getEdition("dune-ace")?.slug).toBe("dune-ace");
    });

    it("getCopy returns copy by slug", () => {
      expect(index.getCopy("dune-hc")?.slug).toBe("dune-hc");
    });
  });

  describe("cross-entity navigation", () => {
    let index: Index;

    beforeAll(() => {
      makeAuthor("hera", "Frank Herbert");
      makeWork("dune", "Dune", "hera", ["fiction"]);
      makeWork("dune-messiah", "Dune Messiah", "hera", ["fiction"]);
      makeEdition("dune-ace", "dune");
      makeCopy("dune-hc", "dune", "dune-ace");
      makeCopy("dune-pb", "dune", "dune-ace");
      makeNote("note-1", "dune-hc", "dune-ace", "dune", "Note 1 content");

      index = new Index(tmpRoot);
      index.load();
    });

    it("getWorksByAuthor returns works linked to author", () => {
      const works = index.getWorksByAuthor("hera");
      expect(works).toHaveLength(2);
      expect(works.map((w) => w.title).sort()).toEqual(["Dune", "Dune Messiah"]);
    });

    it("getEditionsByWork returns editions linked to work", () => {
      const editions = index.getEditionsByWork("dune");
      expect(editions).toHaveLength(1);
      expect(editions[0].slug).toBe("dune-ace");
    });

    it("getCopiesByEdition returns copies linked to edition", () => {
      const copies = index.getCopiesByEdition("dune-ace");
      expect(copies).toHaveLength(2);
    });

    it("getCopiesByWork returns copies linked to work", () => {
      const copies = index.getCopiesByWork("dune");
      expect(copies).toHaveLength(2);
    });

    it("getNotesByCopy returns notes linked to copy", () => {
      const notes = index.getNotesByCopy("dune-hc");
      expect(notes).toHaveLength(1);
      expect(notes[0].slug).toBe("note-1");
    });
  });

  describe("getWorksBySeries", () => {
    const seriesDir = join(tmpRoot, "series-nav");
    let index: Index;

    beforeAll(() => {
      for (const d of ["authors", "works", "series"]) {
        mkdirSync(join(seriesDir, d), { recursive: true });
      }
      writeFile(join(seriesDir, "series/dune-chronicles.md"), {
        type: "series", slug: "dune-chronicles", name: "Dune Chronicles",
        created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "");
      writeFile(join(seriesDir, "works/dune.md"), {
        type: "work", slug: "dune", title: "Dune",
        authors: [], series: "[[series/dune-chronicles]]", series_position: 1,
        created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# Dune");
      writeFile(join(seriesDir, "works/dune-messiah.md"), {
        type: "work", slug: "dune-messiah", title: "Dune Messiah",
        authors: [], series: "[[series/dune-chronicles]]", series_position: 2,
        created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# Dune Messiah");
      writeFile(join(seriesDir, "works/unrelated.md"), {
        type: "work", slug: "unrelated", title: "Unrelated",
        authors: [], created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# Unrelated");

      index = new Index(seriesDir);
      index.load();
    });

    it("returns works linked to the series", () => {
      const works = index.getWorksBySeries("dune-chronicles");
      expect(works).toHaveLength(2);
      expect(works.map((w) => w.slug).sort()).toEqual(["dune", "dune-messiah"]);
    });

    it("returns empty array for a series with no linked works", () => {
      expect(index.getWorksBySeries("nonexistent")).toEqual([]);
    });
  });

  describe("searchWorks", () => {
    const searchDir = join(tmpRoot, "search");
    let index: Index;

    beforeAll(() => {
      if (!existsSync(searchDir)) {
        for (const d of ["authors", "works"]) {
          mkdirSync(join(searchDir, d), { recursive: true });
        }
      }
      writeFile(join(searchDir, "authors/hera.md"), {
        type: "author", slug: "hera", name: "Frank Herbert",
        created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# Frank Herbert");
      writeFile(join(searchDir, "works/dune.md"), {
        type: "work", slug: "dune", title: "Dune",
        authors: ["[[authors/hera]]"],
        genres: ["fiction", "science-fiction"],
        created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# Dune");
      writeFile(join(searchDir, "works/foundation.md"), {
        type: "work", slug: "foundation", title: "Foundation",
        authors: ["[[authors/hera]]"],
        genres: ["fiction"],
        created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# Foundation");

      index = new Index(searchDir);
      index.load();
    });

    it("matches by title substring", () => {
      expect(index.searchWorks("dune")).toHaveLength(1);
      expect(index.searchWorks("DUNE")).toHaveLength(1);
    });

    it("matches by author name", () => {
      expect(index.searchWorks("herbert")).toHaveLength(2);
    });

    it("matches by genre", () => {
      expect(index.searchWorks("science")).toHaveLength(1);
    });

    it("empty query returns all works", () => {
      expect(index.searchWorks("")).toHaveLength(2);
    });

    it("no-matching query returns empty array", () => {
      expect(index.searchWorks("zzzzz")).toEqual([]);
    });
  });

  describe("upsert and remove", () => {
    let index: Index;

    beforeAll(() => {
      makeAuthor("hera", "Frank Herbert");
      makeWork("dune", "Dune", "hera", ["fiction"]);
      index = new Index(tmpRoot);
      index.load();
    });

    it("upsert inserts new entity", () => {
      const newWork = {
        type: "work" as const,
        slug: "new-work",
        title: "New Work",
        authors: [],
        created_at: "2024-01-01T00:00:00",
        _schema: 1,
      };
      index.upsert("work", newWork);
      expect(index.getWork("new-work")?.title).toBe("New Work");
    });

    it("upsert replaces existing entity", () => {
      const updated = { ...index.getWork("dune")!, title: "Dune (Updated)" };
      index.upsert("work", updated);
      expect(index.getWork("dune")?.title).toBe("Dune (Updated)");
    });

    it("remove deletes entity", () => {
      expect(index.getWork("new-work")).toBeTruthy();
      index.remove("work", "new-work");
      expect(index.getWork("new-work")).toBeUndefined();
    });

    it("remove on non-existent entity does not throw", () => {
      expect(() => index.remove("work", "nonexistent")).not.toThrow();
    });
  });

  describe("getEditionByISBN", () => {
    const isbnDir = join(tmpRoot, "isbn-lookup");
    let index: Index;

    beforeAll(() => {
      for (const d of ["authors", "works", "editions"]) {
        mkdirSync(join(isbnDir, d), { recursive: true });
      }
      writeFile(join(isbnDir, "authors/orwell.md"), {
        type: "author", slug: "orwell", name: "George Orwell",
        created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# George Orwell");
      writeFile(join(isbnDir, "works/1984.md"), {
        type: "work", slug: "1984", title: "1984",
        authors: ["[[authors/orwell]]"],
        created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# 1984");
      writeFile(join(isbnDir, "editions/1984-pb.md"), {
        type: "edition", slug: "1984-pb",
        work: "[[works/1984]]",
        isbn: "978-0-452-28423-4",
        publisher: "Signet Classic",
        created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# Edition 1984");
      writeFile(join(isbnDir, "editions/no-isbn.md"), {
        type: "edition", slug: "no-isbn",
        work: "[[works/1984]]",
        publisher: "Unknown",
        created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# No ISBN");

      index = new Index(isbnDir);
      index.load();
    });

    it("finds edition by exact ISBN match", () => {
      const edition = index.getEditionByISBN("978-0-452-28423-4");
      expect(edition).toBeTruthy();
      expect(edition!.slug).toBe("1984-pb");
      expect(edition!.publisher).toBe("Signet Classic");
    });

    it("returns undefined for unknown ISBN", () => {
      const edition = index.getEditionByISBN("000-0-000-00000-0");
      expect(edition).toBeUndefined();
    });

    it("returns undefined for edition without ISBN", () => {
      // Edition "no-isbn" has no ISBN field
      const edition = index.getEditionByISBN("");
      expect(edition).toBeUndefined();
    });
  });

  describe("getWorksByTitleAndAuthor", () => {
    const dedupDir = join(tmpRoot, "title-author-search");
    let index: Index;

    beforeAll(() => {
      for (const d of ["authors", "works"]) {
        mkdirSync(join(dedupDir, d), { recursive: true });
      }
      writeFile(join(dedupDir, "authors/hera.md"), {
        type: "author", slug: "hera", name: "Frank Herbert",
        aliases: ["Frank P. Herbert"],
        created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# Frank Herbert");
      writeFile(join(dedupDir, "authors/asimov.md"), {
        type: "author", slug: "asimov", name: "Isaac Asimov",
        created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# Isaac Asimov");
      writeFile(join(dedupDir, "works/dune.md"), {
        type: "work", slug: "dune", title: "Dune",
        authors: ["[[authors/hera]]"],
        genres: ["fiction"],
        created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# Dune");
      writeFile(join(dedupDir, "works/dune-messiah.md"), {
        type: "work", slug: "dune-messiah", title: "Dune Messiah",
        authors: ["[[authors/hera]]"],
        genres: ["fiction"],
        created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# Dune Messiah");
      writeFile(join(dedupDir, "works/foundation.md"), {
        type: "work", slug: "foundation", title: "Foundation",
        authors: ["[[authors/asimov]]"],
        genres: ["fiction"],
        created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# Foundation");

      index = new Index(dedupDir);
      index.load();
    });

    it("finds works by title substring and exact author name", () => {
      const results = index.getWorksByTitleAndAuthor("Dune", "Frank Herbert");
      expect(results).toHaveLength(2);
      const titles = results.map((w) => w.title).sort();
      expect(titles).toEqual(["Dune", "Dune Messiah"]);
    });

    it("matches author by alias", () => {
      const results = index.getWorksByTitleAndAuthor("Dune", "Frank P. Herbert");
      expect(results).toHaveLength(2);
    });

    it("case-insensitive matching", () => {
      const results = index.getWorksByTitleAndAuthor("dune", "frank herbert");
      expect(results).toHaveLength(2);
    });

    it("does not match works with different author", () => {
      const results = index.getWorksByTitleAndAuthor("Dune", "Isaac Asimov");
      expect(results).toHaveLength(0);
    });

    it("returns empty array when no title match", () => {
      const results = index.getWorksByTitleAndAuthor("Nonexistent", "Frank Herbert");
      expect(results).toEqual([]);
    });

    it("returns empty array when no author match", () => {
      const results = index.getWorksByTitleAndAuthor("Dune", "Nonexistent");
      expect(results).toEqual([]);
    });

    it("caps results at 5", () => {
      // Create 6 works matching the same title + author pattern
      for (let i = 1; i <= 6; i++) {
        writeFile(join(dedupDir, `works/multi-${i}.md`), {
          type: "work", slug: `multi-${i}`, title: `Multi Test ${i}`,
          authors: ["[[authors/hera]]"],
          created_at: "2024-01-01T00:00:00", _schema: 1,
        }, `# Multi Test ${i}`);
      }
      const freshIndex = new Index(dedupDir);
      freshIndex.load();
      const results = freshIndex.getWorksByTitleAndAuthor("Multi Test", "Frank Herbert");
      expect(results).toHaveLength(5);
    });
  });
});
