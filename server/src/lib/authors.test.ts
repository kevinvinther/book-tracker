import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import os from "os";
import { Index } from "./index.js";
import { findOrCreateAuthors } from "./authors.js";

const tmpRoot = join(os.tmpdir(), `bt-authors-test-${Date.now()}`);

afterAll(() => {
  if (existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true });
});

function freshIndex(): { index: Index; libPath: string } {
  const libPath = join(tmpRoot, `lib-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(libPath, { recursive: true });
  for (const dir of ["authors", "series", "works", "editions", "copies", "notes"]) {
    mkdirSync(join(libPath, dir), { recursive: true });
  }
  const index = new Index(libPath);
  index.load();
  return { index, libPath };
}

describe("findOrCreateAuthors", () => {
  describe("exact match on name", () => {
    it("matches case-insensitively", () => {
      const { index, libPath } = freshIndex();
      findOrCreateAuthors(["Fyodor Dostoevsky"], index, libPath);

      const results = findOrCreateAuthors(["fyodor dostoevsky"], index, libPath);
      expect(results).toHaveLength(1);
      expect(results[0].slug).toBe("fyodor-dostoevsky");
      expect(results[0].name).toBe("fyodor dostoevsky");
      expect(results[0].isNew).toBe(false);
    });

    it("normalizes extra whitespace", () => {
      const { index, libPath } = freshIndex();
      findOrCreateAuthors(["Fyodor Dostoevsky"], index, libPath);

      const results = findOrCreateAuthors(["  Fyodor   Dostoevsky  "], index, libPath);
      expect(results).toHaveLength(1);
      expect(results[0].isNew).toBe(false);
      expect(results[0].slug).toBe("fyodor-dostoevsky");
      expect(results[0].name).toBe("Fyodor   Dostoevsky");
    });

    it("matches exact name (same casing)", () => {
      const { index, libPath } = freshIndex();
      const results = findOrCreateAuthors(["Frank Herbert"], index, libPath);
      expect(results[0].isNew).toBe(true);

      const results2 = findOrCreateAuthors(["Frank Herbert"], index, libPath);
      expect(results2[0].isNew).toBe(false);
      expect(results2[0].slug).toBe("frank-herbert");
    });
  });

  describe("match via aliases", () => {
    it("matches an alias on an existing author", () => {
      const { index, libPath } = freshIndex();
      // Create an author with aliases
      const results1 = findOrCreateAuthors(["Fyodor Dostoevsky"], index, libPath);
      expect(results1[0].isNew).toBe(true);

      // Manually add an alias
      const author = index.getAuthor(results1[0].slug)!;
      author.aliases = ["Dostoevsky", "F. M. Dostoevsky"];
      index.upsert("author", author);

      const results2 = findOrCreateAuthors(["Dostoevsky"], index, libPath);
      expect(results2).toHaveLength(1);
      expect(results2[0].slug).toBe(results1[0].slug);
      expect(results2[0].isNew).toBe(false);
    });

    it("matches alias case-insensitively", () => {
      const { index, libPath } = freshIndex();
      const results1 = findOrCreateAuthors(["Isaac Asimov"], index, libPath);
      const author = index.getAuthor(results1[0].slug)!;
      author.aliases = ["Paul French"];
      index.upsert("author", author);

      const results2 = findOrCreateAuthors(["paul french"], index, libPath);
      expect(results2[0].isNew).toBe(false);
      expect(results2[0].slug).toBe(results1[0].slug);
    });
  });

  describe("multiple names (mix of existing and new)", () => {
    it("returns correct results for mix", () => {
      const { index, libPath } = freshIndex();
      // Create Dostoevsky first
      findOrCreateAuthors(["Fyodor Dostoevsky"], index, libPath);

      const results = findOrCreateAuthors(["Fyodor Dostoevsky", "New Author"], index, libPath);
      expect(results).toHaveLength(2);

      const dostoevsky = results.find((r) => r.name === "Fyodor Dostoevsky")!;
      expect(dostoevsky.isNew).toBe(false);
      expect(dostoevsky.slug).toBe("fyodor-dostoevsky");

      const newAuthor = results.find((r) => r.name === "New Author")!;
      expect(newAuthor.isNew).toBe(true);
      expect(newAuthor.slug).toBe("new-author");
    });
  });

  describe("all-new names", () => {
    it("creates file on disk", () => {
      const { index, libPath } = freshIndex();
      const results = findOrCreateAuthors(["Completely New Author"], index, libPath);

      expect(results).toHaveLength(1);
      expect(results[0].isNew).toBe(true);
      expect(results[0].slug).toBe("completely-new-author");
      expect(results[0].name).toBe("Completely New Author");
      expect(existsSync(join(libPath, "authors/completely-new-author.md"))).toBe(true);
    });

    it("adds to index", () => {
      const { index, libPath } = freshIndex();
      const results = findOrCreateAuthors(["Brand New Author"], index, libPath);

      const author = index.getAuthor(results[0].slug);
      expect(author).toBeTruthy();
      expect(author!.name).toBe("Brand New Author");
      expect(author!.type).toBe("author");
      expect(author!._schema).toBe(1);
      expect(author!.created_at).toBeTruthy();
    });
  });

  describe("empty input array", () => {
    it("returns empty array", () => {
      const { index, libPath } = freshIndex();
      const results = findOrCreateAuthors([], index, libPath);
      expect(results).toEqual([]);
    });
  });

  describe("no fuzzy matching", () => {
    it("creates separate authors for transliteration variants", () => {
      const { index, libPath } = freshIndex();
      const results1 = findOrCreateAuthors(["Fyodor Dostoevsky"], index, libPath);
      expect(results1[0].isNew).toBe(true);

      const results2 = findOrCreateAuthors(["Fyodor Dostoyevsky"], index, libPath);
      expect(results2[0].isNew).toBe(true);
      expect(results2[0].slug).not.toBe(results1[0].slug);
    });

    it("creates separate authors for different name strings", () => {
      const { index, libPath } = freshIndex();
      findOrCreateAuthors(["J. R. R. Tolkien"], index, libPath);

      const results = findOrCreateAuthors(["John Tolkien"], index, libPath);
      expect(results[0].isNew).toBe(true);
    });
  });
});
