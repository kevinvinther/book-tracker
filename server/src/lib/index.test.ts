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

    it("getNotesByWork returns notes linked to work", () => {
      const notes = index.getNotesByWork("dune");
      expect(notes).toHaveLength(1);
      expect(notes[0].slug).toBe("note-1");
    });

    it("getNotesByWork returns empty array for a work with no notes", () => {
      expect(index.getNotesByWork("dune-messiah")).toEqual([]);
    });

    it("getNotesByWork returns empty array for an unknown work slug", () => {
      expect(index.getNotesByWork("nonexistent")).toEqual([]);
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

  describe("searchAll", () => {
    const searchAllDir = join(tmpRoot, "search-all");
    let index: Index;

    beforeAll(() => {
      for (const d of ["authors", "series", "works", "editions", "copies", "notes"]) {
        mkdirSync(join(searchAllDir, d), { recursive: true });
      }

      writeFile(join(searchAllDir, "authors/hera.md"), {
        type: "author", slug: "hera", name: "Frank Herbert",
        aliases: ["Frank P. Herbert"],
        created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# Frank Herbert");

      writeFile(join(searchAllDir, "authors/asimov.md"), {
        type: "author", slug: "asimov", name: "Isaac Asimov",
        created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# Isaac Asimov");

      writeFile(join(searchAllDir, "series/dune-chronicles.md"), {
        type: "series", slug: "dune-chronicles", name: "Dune Chronicles",
        aliases: ["Dune Saga"],
        created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "");

      writeFile(join(searchAllDir, "works/dune.md"), {
        type: "work", slug: "dune", title: "Dune",
        authors: ["[[authors/hera]]"],
        genres: ["science-fiction"],
        description: "Set on the desert planet Arrakis",
        aliases: ["Dune (1965)"],
        created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# Dune");

      writeFile(join(searchAllDir, "works/foundation.md"), {
        type: "work", slug: "foundation", title: "Foundation",
        authors: ["[[authors/asimov]]"],
        genres: ["science-fiction"],
        created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# Foundation");

      writeFile(join(searchAllDir, "editions/dune-ace.md"), {
        type: "edition", slug: "dune-ace",
        work: "[[works/dune]]",
        isbn: "978-0-441-17271-9",
        publisher: "Ace Books",
        created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# Edition Dune Ace");

      writeFile(join(searchAllDir, "editions/foundation-gnome.md"), {
        type: "edition", slug: "foundation-gnome",
        work: "[[works/foundation]]",
        publisher: "Gnome Press",
        created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# Edition Foundation Gnome");

      writeFile(join(searchAllDir, "copies/dune-hc.md"), {
        type: "copy", slug: "dune-hc",
        work: "[[works/dune]]",
        edition: "[[editions/dune-ace]]",
        status: "owned", condition: "good",
        acquisition_source: "Bought at Powell's Books",
        location: "Living room shelf",
        loans: [
          { borrower_name: "Sarah Connor", lent_date: "2024-05-10", expected_return_date: "2024-07-01" },
        ],
        created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# Copy Dune HC");

      writeFile(join(searchAllDir, "copies/foundation-pb.md"), {
        type: "copy", slug: "foundation-pb",
        work: "[[works/foundation]]",
        edition: "[[editions/foundation-gnome]]",
        status: "owned", condition: "worn",
        location: "Bedroom stack",
        created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# Copy Foundation PB");

      writeFile(join(searchAllDir, "notes/2024-01-15-143000.md"), {
        type: "note", slug: "2024-01-15-143000",
        date: "2024-01-15T14:30:00",
        modified: "2024-01-15T14:30:00",
        copy: "[[copies/dune-hc]]",
        edition: "[[editions/dune-ace]]",
        work: "[[works/dune]]",
        _schema: 1,
      }, "The spice must flow. This chapter about the desert is incredible.");

      writeFile(join(searchAllDir, "notes/2024-02-01-000000.md"), {
        type: "note", slug: "2024-02-01-000000",
        date: "2024-02-01T00:00:00",
        modified: "2024-02-01T00:00:00",
        work: "[[works/foundation]]",
        _schema: 1,
      }, "Hari Seldon's psychohistory concept is brilliant.");

      index = new Index(searchAllDir);
      index.load();
    });

    it("returns empty arrays for empty query", () => {
      const results = index.searchAll("");
      expect(results.work).toEqual([]);
      expect(results.author).toEqual([]);
      expect(results.series).toEqual([]);
      expect(results.edition).toEqual([]);
      expect(results.copy).toEqual([]);
      expect(results.note).toEqual([]);
      expect(results.loan).toEqual([]);
    });

    it("returns empty arrays for no-match query", () => {
      const results = index.searchAll("zzzzxxx");
      expect(results.work).toEqual([]);
      expect(results.author).toEqual([]);
    });

    it("searches works by title", () => {
      const results = index.searchAll("dune");
      expect(results.work).toHaveLength(1);
      expect(results.work[0].type).toBe("work");
      expect(results.work[0].slug).toBe("dune");
      expect(results.work[0].link).toBe("/works/dune");
    });

    it("searches works by author name", () => {
      const results = index.searchAll("herbert");
      expect(results.work.some((w) => w.slug === "dune")).toBe(true);
    });

    it("searches works by genre", () => {
      const results = index.searchAll("science-fiction");
      expect(results.work).toHaveLength(2);
    });

    it("searches works by description", () => {
      const results = index.searchAll("Arrakis");
      expect(results.work.some((w) => w.slug === "dune")).toBe(true);
    });

    it("searches works by alias", () => {
      const results = index.searchAll("1965");
      expect(results.work.some((w) => w.slug === "dune")).toBe(true);
    });

    it("searches authors by name", () => {
      const results = index.searchAll("Frank");
      expect(results.author).toHaveLength(1);
      expect(results.author[0].slug).toBe("hera");
      expect(results.author[0].title).toBe("Frank Herbert");
      expect(results.author[0].link).toBe("/authors/hera");
    });

    it("searches authors by alias", () => {
      const results = index.searchAll("Frank P. Herbert");
      expect(results.author).toHaveLength(1);
      expect(results.author[0].slug).toBe("hera");
    });

    it("searches series by name", () => {
      const results = index.searchAll("Dune Chronicles");
      expect(results.series).toHaveLength(1);
      expect(results.series[0].slug).toBe("dune-chronicles");
      expect(results.series[0].link).toBe("/series/dune-chronicles");
    });

    it("searches series by alias", () => {
      const results = index.searchAll("Dune Saga");
      expect(results.series).toHaveLength(1);
    });

    it("searches editions by ISBN", () => {
      const results = index.searchAll("978-0-441");
      expect(results.edition).toHaveLength(1);
      expect(results.edition[0].slug).toBe("dune-ace");
      expect(results.edition[0].link).toBe("/editions/dune-ace");
    });

    it("searches editions by publisher", () => {
      const results = index.searchAll("Gnome");
      expect(results.edition).toHaveLength(1);
      expect(results.edition[0].slug).toBe("foundation-gnome");
    });

    it("searches copies by acquisition_source", () => {
      const results = index.searchAll("Powell");
      expect(results.copy).toHaveLength(1);
      expect(results.copy[0].slug).toBe("dune-hc");
      expect(results.copy[0].link).toBe("/copies/dune-hc");
    });

    it("searches copies by location", () => {
      const results = index.searchAll("Bedroom");
      expect(results.copy.length).toBeGreaterThanOrEqual(1);
      expect(results.copy.some((c) => c.slug === "foundation-pb")).toBe(true);
    });

    it("searches notes by body text", () => {
      const results = index.searchAll("spice");
      expect(results.note).toHaveLength(1);
      expect(results.note[0].slug).toBe("2024-01-15-143000");
    });

    it("includes snippet for note matches", () => {
      const results = index.searchAll("desert");
      expect(results.note).toHaveLength(1);
      expect(results.note[0].snippet).toBeDefined();
      expect(results.note[0].snippet!.toLowerCase()).toContain("desert");
    });

    it("note link resolves to copy when copy is set", () => {
      const results = index.searchAll("spice");
      expect(results.note[0].link).toBe("/copies/dune-hc");
    });

    it("note link falls back to work when no copy is set", () => {
      const results = index.searchAll("psychohistory");
      expect(results.note[0].link).toBe("/works/foundation");
    });

    it("searches loans by borrower_name", () => {
      const results = index.searchAll("Sarah");
      expect(results.loan).toHaveLength(1);
      expect(results.loan[0].title).toBe("Sarah Connor");
      expect(results.loan[0].slug).toBe("dune-hc");
      expect(results.loan[0].link).toBe("/copies/dune-hc");
    });

    it("does not match loans by copy title", () => {
      // Searching for "Dune" should find the work, not the loan
      const results = index.searchAll("dune");
      expect(results.loan).toEqual([]);
    });

    it("caps each type at 5 results", () => {
      // Create 6 more authors that all match "Smith"
      for (let i = 1; i <= 6; i++) {
        writeFile(join(searchAllDir, `authors/smith-${i}.md`), {
          type: "author", slug: `smith-${i}`, name: `Smith ${i}`,
          created_at: "2024-01-01T00:00:00", _schema: 1,
        }, `# Smith ${i}`);
      }
      const freshIndex = new Index(searchAllDir);
      freshIndex.load();
      const results = freshIndex.searchAll("Smith");
      expect(results.author).toHaveLength(5);
    });

    it("orders by relevance: exact match before prefix before substring", () => {
      writeFile(join(searchAllDir, "works/the-dune-buggy.md"), {
        type: "work", slug: "the-dune-buggy", title: "The Dune Buggy",
        authors: ["[[authors/hera]]"],
        created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# The Dune Buggy");

      const freshIndex = new Index(searchAllDir);
      freshIndex.load();
      const results = freshIndex.searchAll("Dune");
      const duneWorks = results.work;
      // First result should be an exact match for "Dune"
      expect(duneWorks[0].title.toLowerCase()).toBe("dune");
      // "The Dune Buggy" is a substring match, should appear after exact matches
      const titles = duneWorks.map((w) => w.title.toLowerCase());
      const exactIdx = titles.findIndex((t) => t === "dune");
      const substringIdx = titles.findIndex((t) => t.includes("dune") && t !== "dune");
      expect(exactIdx).toBeLessThan(substringIdx);
    });

    it("includes subtitle for work results from author name", () => {
      const results = index.searchAll("Dune");
      const duneWork = results.work.find((w) => w.slug === "dune");
      expect(duneWork?.subtitle).toBe("Frank Herbert");
    });

    it("includes subtitle for edition results with ISBN", () => {
      const results = index.searchAll("978");
      expect(results.edition[0].subtitle).toContain("ISBN");
    });

    it("returns correct result shape for all types", () => {
      const results = index.searchAll("dune");
      for (const group of Object.values(results)) {
        for (const result of group) {
          expect(result).toHaveProperty("type");
          expect(result).toHaveProperty("slug");
          expect(result).toHaveProperty("title");
          expect(result).toHaveProperty("subtitle");
          expect(result).toHaveProperty("link");
        }
      }
    });
  });

  describe("handleFileChange", () => {
    it("re-reads a file and upserts it into the index", () => {
      makeCopy("test-hc", "dune", "dune-ace");

      const index = new Index(tmpRoot);
      index.load();

      const copy = index.getCopy("test-hc");
      expect(copy).toBeDefined();

      // Modify the file on disk
      writeFile(join(tmpRoot, "copies/test-hc.md"), {
        type: "copy", slug: "test-hc",
        work: "[[works/dune]]",
        edition: "[[editions/dune-ace]]",
        condition: "pristine",
        created_at: "2024-01-01T00:00:00", _schema: 1,
      }, "# Updated Copy");

      // Index still has old value
      const staleCopy = index.getCopy("test-hc");
      expect(staleCopy?.condition).not.toBe("pristine");

      // handleFileChange re-reads from disk
      index.handleFileChange("copy", "test-hc");

      const updatedCopy = index.getCopy("test-hc");
      expect(updatedCopy?.condition).toBe("pristine");
    });

    it("removes entity from index if file no longer exists", () => {
      makeWork("handlefile-test-work", "HandleFile Test", "hera");

      const index = new Index(tmpRoot);
      index.load();

      const work = index.getWork("handlefile-test-work");
      expect(work).toBeDefined();

      // Delete the file from disk
      rmSync(join(tmpRoot, "works/handlefile-test-work.md"));

      index.handleFileChange("work", "handlefile-test-work");

      expect(index.getWork("handlefile-test-work")).toBeUndefined();
    });

    it("handles note files correctly (sets body field)", () => {
      makeNote("2025-06-01-120000", "dune-hc", "dune-ace", "dune", "Original note body");

      const index = new Index(tmpRoot);
      index.load();

      const note = index.getNote("2025-06-01-120000");
      expect(note).toBeDefined();

      // Modify the note body on disk
      writeFile(join(tmpRoot, "notes/2025-06-01-120000.md"), {
        type: "note", slug: "2025-06-01-120000",
        date: "2025-06-01T12:00:00",
        modified: "2025-06-02T08:00:00",
        copy: "[[copies/dune-hc]]",
        _schema: 1,
      }, "# Updated Note Body\n\nNew content here.");

      index.handleFileChange("note", "2025-06-01-120000");

      const updatedNote = index.getNote("2025-06-01-120000");
      expect(updatedNote?.body).toBe(`# Updated Note Body

New content here.`);
      expect(updatedNote?.modified).toBe("2025-06-02T08:00:00");
    });

    it("is a no-op when file does not exist", () => {
      const index = new Index(tmpRoot);
      index.load();
      const countBefore = (index as any).count();

      // File doesn't exist yet, handleFileChange will remove (no-op for non-existent)
      index.handleFileChange("work", "does-not-exist");
      index.handleFileChange("author", "also-fake");

      const countAfter = (index as any).count();
      expect(countAfter).toBe(countBefore);
    });
  });
});
