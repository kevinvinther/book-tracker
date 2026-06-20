import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import os from "os";

const COUNT_AUTHORS = 100;
const COUNT_SERIES = 200;
const COUNT_WORKS = 500;
const COUNT_EDITIONS = 200;
const COUNT_COPIES = 200;

let tmpRoot: string;

beforeAll(() => {
  tmpRoot = join(os.tmpdir(), `bt-index-perf-${Date.now()}`);
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

describe("Index performance at scale", () => {
  it(`loads ${COUNT_AUTHORS + COUNT_SERIES + COUNT_WORKS + COUNT_EDITIONS + COUNT_COPIES} entities in under 2000ms`, () => {
    const now = "2024-01-01T00:00:00.000Z";

    for (let i = 0; i < COUNT_AUTHORS; i++) {
      writeFile(
        join(tmpRoot, `authors/author-${i}.md`),
        { type: "author", slug: `author-${i}`, name: `Author ${i}`, created_at: now, _schema: 1 },
        `# Author ${i}`,
      );
    }

    for (let i = 0; i < COUNT_SERIES; i++) {
      writeFile(
        join(tmpRoot, `series/series-${i}.md`),
        { type: "series", slug: `series-${i}`, name: `Series ${i}`, created_at: now, _schema: 1 },
        `# Series ${i}`,
      );
    }

    const genres: string[] = [];
    for (let i = 0; i < COUNT_WORKS; i++) {
      const authorIdx = i % COUNT_AUTHORS;
      const seriesIdx = i < COUNT_SERIES ? i : undefined;
      const genre = i % 2 === 0 ? "science-fiction" : "fantasy";
      if (!genres.includes(genre)) genres.push(genre);
      writeFile(
        join(tmpRoot, `works/work-${i}.md`),
        {
          type: "work", slug: `work-${i}`, title: `Work ${i}`,
          authors: [`[[authors/author-${authorIdx}]]`],
          series: seriesIdx !== undefined ? `[[series/series-${seriesIdx}]]` : undefined,
          series_position: seriesIdx !== undefined ? 1 : undefined,
          genres: [genre],
          created_at: now, _schema: 1,
        },
        `# Work ${i}`,
      );
    }

    for (let i = 0; i < COUNT_EDITIONS; i++) {
      const workIdx = i % COUNT_WORKS;
      writeFile(
        join(tmpRoot, `editions/edition-${i}.md`),
        {
          type: "edition", slug: `edition-${i}`,
          work: `[[works/work-${workIdx}]]`,
          isbn: i % 2 === 0 ? `978-${String(i).padStart(10, "0")}` : undefined,
          publisher: "Test Publisher",
          format: "paperback",
          page_count: 300 + i,
          created_at: now, _schema: 1,
        },
        `# Edition ${i}`,
      );
    }

    for (let i = 0; i < COUNT_COPIES; i++) {
      const editionIdx = i % COUNT_EDITIONS;
      const workIdx = editionIdx % COUNT_WORKS;
      writeFile(
        join(tmpRoot, `copies/copy-${i}.md`),
        {
          type: "copy", slug: `copy-${i}`,
          edition: `[[editions/edition-${editionIdx}]]`,
          work: `[[works/work-${workIdx}]]`,
          status: "owned", condition: "good",
          created_at: now, _schema: 1,
        },
        `# Copy ${i}`,
      );
    }

    const index = new Index(tmpRoot);
    const startLoad = performance.now();
    index.load();
    const loadTime = performance.now() - startLoad;

    expect(loadTime).toBeLessThan(2000);
  });

  it("completes filtered lookups in under 100ms after loading", () => {
    const index = new Index(tmpRoot);
    index.load();

    const startSearch = performance.now();
    const results = index.searchAll("work");
    const searchTime = performance.now() - startSearch;

    expect(searchTime).toBeLessThan(100);
    expect(results.work.length).toBeGreaterThan(0);
  });

  it("resolves authors across all works", () => {
    const index = new Index(tmpRoot);
    index.load();

    const start = performance.now();
    const works = index.getAllWorks();
    for (const work of works) {
      for (const authorLink of work.authors) {
        const slug = authorLink.match(/\[\[authors\/(.+)\]\]/)?.[1];
        if (slug) index.getAuthor(slug);
      }
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });
});