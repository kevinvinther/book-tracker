import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { Server } from "http";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import os from "os";

const tmpRoot = join(os.tmpdir(), `bt-stats-test-${Date.now()}`);

let server: Server;
let port: number;

beforeAll(async () => {
  mkdirSync(tmpRoot, { recursive: true });
  for (const dir of ["authors", "series", "works", "editions", "copies", "notes", "attachments", ".booktracker/cache"]) {
    mkdirSync(join(tmpRoot, dir), { recursive: true });
  }

  const { writeFile } = await import("../lib/io.js");

  // Author
  writeFile(join(tmpRoot, "authors/tolkien.md"), {
    type: "author", slug: "tolkien", name: "J.R.R. Tolkien",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  // Series
  writeFile(join(tmpRoot, "series/lotr.md"), {
    type: "series", slug: "lotr", name: "The Lord of the Rings",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  // Works
  writeFile(join(tmpRoot, "works/the-fellowship.md"), {
    type: "work", slug: "the-fellowship",
    title: "The Fellowship of the Ring",
    authors: ["[[authors/tolkien]]"],
    genres: ["fiction", "fantasy"],
    original_language: "en",
    series: "[[series/lotr]]",
    series_position: 1,
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  writeFile(join(tmpRoot, "works/the-two-towers.md"), {
    type: "work", slug: "the-two-towers",
    title: "The Two Towers",
    authors: ["[[authors/tolkien]]"],
    genres: ["fiction", "fantasy", "classic"],
    original_language: "en",
    series: "[[series/lotr]]",
    series_position: 2,
    created_at: "2024-02-01T00:00:00.000Z", _schema: 1,
  }, "");

  writeFile(join(tmpRoot, "works/no-series-work.md"), {
    type: "work", slug: "no-series-work",
    title: "No Series Book",
    authors: ["[[authors/tolkien]]"],
    created_at: "2024-03-01T00:00:00.000Z", _schema: 1,
  }, "");

  // Editions
  writeFile(join(tmpRoot, "editions/fellowship-hc.md"), {
    type: "edition", slug: "fellowship-hc",
    work: "[[works/the-fellowship]]",
    publisher: "HarperCollins", format: "hardcover", page_count: 423, language: "en",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  writeFile(join(tmpRoot, "editions/fellowship-pb.md"), {
    type: "edition", slug: "fellowship-pb",
    work: "[[works/the-fellowship]]",
    publisher: "HarperCollins", format: "paperback", page_count: 423, language: "en",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  writeFile(join(tmpRoot, "editions/towers-hc.md"), {
    type: "edition", slug: "towers-hc",
    work: "[[works/the-two-towers]]",
    publisher: "HarperCollins", format: "hardcover", page_count: 352, language: "de",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  // Copies with read-throughs
  // Copy 1: finished in 2025, rated, with acquisition
  writeFile(join(tmpRoot, "copies/fellowship-hc-1.md"), {
    type: "copy", slug: "fellowship-hc-1",
    edition: "[[editions/fellowship-hc]]",
    work: "[[works/the-fellowship]]",
    status: "owned",
    condition: "good",
    acquisition_date: "2025-03-15T00:00:00.000Z",
    acquisition_source: "Bookstore",
    read_throughs: [{
      started_date: "2025-02-01T00:00:00.000Z",
      finished_date: "2025-03-01T00:00:00.000Z",
      status: "finished",
      rating: 9.0,
      page_log: [
        { date: "2025-02-01T00:00:00.000Z", page: 0 },
        { date: "2025-02-10T00:00:00.000Z", page: 100 },
        { date: "2025-02-20T00:00:00.000Z", page: 250 },
        { date: "2025-03-01T00:00:00.000Z", page: 423 },
      ],
    }],
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  // Copy 2: finished in 2024 (outside 2025 range), rated
  writeFile(join(tmpRoot, "copies/fellowship-pb-1.md"), {
    type: "copy", slug: "fellowship-pb-1",
    edition: "[[editions/fellowship-pb]]",
    work: "[[works/the-fellowship]]",
    status: "owned",
    condition: "worn",
    acquisition_date: "2024-06-01T00:00:00.000Z",
    read_throughs: [{
      started_date: "2024-10-01T00:00:00.000Z",
      finished_date: "2024-11-15T00:00:00.000Z",
      status: "finished",
      rating: 8.0,
      page_log: [
        { date: "2024-10-01T00:00:00.000Z", page: 0 },
        { date: "2024-10-10T00:00:00.000Z", page: 100 },
        { date: "2024-11-15T00:00:00.000Z", page: 423 },
      ],
    }],
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  // Copy 3: spanning read-through (started 2024, finished 2025), rated
  writeFile(join(tmpRoot, "copies/towers-hc-1.md"), {
    type: "copy", slug: "towers-hc-1",
    edition: "[[editions/towers-hc]]",
    work: "[[works/the-two-towers]]",
    status: "owned",
    condition: "good",
    acquisition_date: "2024-12-01T00:00:00.000Z",
    read_throughs: [{
      started_date: "2024-12-15T00:00:00.000Z",
      finished_date: "2025-01-20T00:00:00.000Z",
      status: "finished",
      rating: 9.5,
      page_log: [
        { date: "2024-12-15T00:00:00.000Z", page: 0 },
        { date: "2024-12-25T00:00:00.000Z", page: 100 },
        { date: "2025-01-10T00:00:00.000Z", page: 250 },
        { date: "2025-01-20T00:00:00.000Z", page: 352 },
      ],
    }],
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  // Copy 4: currently reading (started 2025, no finished_date), no rating
  writeFile(join(tmpRoot, "copies/towers-hc-2.md"), {
    type: "copy", slug: "towers-hc-2",
    edition: "[[editions/towers-hc]]",
    work: "[[works/the-two-towers]]",
    status: "owned",
    condition: "good",
    read_throughs: [{
      started_date: "2025-06-01T00:00:00.000Z",
      status: "reading",
      page_log: [
        { date: "2025-06-01T00:00:00.000Z", page: 0 },
        { date: "2025-06-10T00:00:00.000Z", page: 80 },
        { date: "2025-06-15T00:00:00.000Z", page: 160 },
      ],
    }],
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  // Copy 5: DNF in 2025
  writeFile(join(tmpRoot, "copies/no-series-pb.md"), {
    type: "copy", slug: "no-series-pb",
    edition: "[[editions/fellowship-pb]]",
    work: "[[works/no-series-work]]",
    status: "owned",
    condition: "worn",
    acquisition_date: "2025-04-01T00:00:00.000Z",
    read_throughs: [{
      started_date: "2025-04-01T00:00:00.000Z",
      finished_date: "2025-05-01T00:00:00.000Z",
      status: "dnf",
      rating: 4.0,
      page_log: [
        { date: "2025-04-01T00:00:00.000Z", page: 0 },
        { date: "2025-04-15T00:00:00.000Z", page: 150 },
        { date: "2025-05-01T00:00:00.000Z", page: 200 },
      ],
    }],
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  // Copy 6: lent status, no read-throughs
  writeFile(join(tmpRoot, "copies/fellowship-lent.md"), {
    type: "copy", slug: "fellowship-lent",
    edition: "[[editions/fellowship-hc]]",
    work: "[[works/the-fellowship]]",
    status: "lent",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  // Notes
  writeFile(join(tmpRoot, "notes/2025-01-10-120000.md"), {
    type: "note", slug: "2025-01-10-120000",
    date: "2025-01-10T12:00:00.000Z",
    modified: "2025-01-10T12:00:00.000Z",
    work: "[[works/the-fellowship]]",
    edition: "[[editions/fellowship-hc]]",
    copy: "[[copies/fellowship-hc-1]]",
    _schema: 1,
  }, "Great start");

  writeFile(join(tmpRoot, "notes/2025-02-15-120000.md"), {
    type: "note", slug: "2025-02-15-120000",
    date: "2025-02-15T12:00:00.000Z",
    modified: "2025-02-15T12:00:00.000Z",
    work: "[[works/the-fellowship]]",
    edition: "[[editions/fellowship-hc]]",
    copy: "[[copies/fellowship-hc-1]]",
    _schema: 1,
  }, "Middle of book");

  writeFile(join(tmpRoot, "notes/2025-03-01-120000.md"), {
    type: "note", slug: "2025-03-01-120000",
    date: "2025-03-01T12:00:00.000Z",
    modified: "2025-03-01T12:00:00.000Z",
    work: "[[works/the-fellowship]]",
    edition: "[[editions/fellowship-hc]]",
    copy: "[[copies/fellowship-hc-1]]",
    _schema: 1,
  }, "Finished!");

  writeFile(join(tmpRoot, "notes/2025-06-10-120000.md"), {
    type: "note", slug: "2025-06-10-120000",
    date: "2025-06-10T12:00:00.000Z",
    modified: "2025-06-10T12:00:00.000Z",
    work: "[[works/the-two-towers]]",
    edition: "[[editions/towers-hc]]",
    copy: "[[copies/towers-hc-2]]",
    _schema: 1,
  }, "Reading Towers");

  writeFile(join(tmpRoot, "notes/2024-10-10-120000.md"), {
    type: "note", slug: "2024-10-10-120000",
    date: "2024-10-10T12:00:00.000Z",
    modified: "2024-10-10T12:00:00.000Z",
    work: "[[works/the-fellowship]]",
    edition: "[[editions/fellowship-pb]]",
    copy: "[[copies/fellowship-pb-1]]",
    _schema: 1,
  }, "2024 reading note");

  const app = express();
  app.use(express.json());

  const { Index } = await import("../lib/index.js");
  const index = new Index(tmpRoot);
  index.load();

  const { createStatsRouter } = await import("./stats.js");
  app.use("/api/stats", createStatsRouter(index, tmpRoot));

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

async function api(path: string): Promise<Response> {
  return fetch(`http://localhost:${port}${path}`);
}

describe("Statistics API", () => {
  describe("Library snapshot", () => {
    it("returns correct total counts", async () => {
      const res = await api("/api/stats?year=all");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.library.total_works).toBe(3);
      expect(body.library.total_editions).toBe(3);
      expect(body.library.total_copies).toBe(6);
    });

    it("computes copies by format", async () => {
      const res = await api("/api/stats?year=all");
      const body = await res.json();
      expect(body.library.copies_by_format).toEqual({
        hardcover: 4,
        paperback: 2,
      });
    });

    it("computes copies by language from edition", async () => {
      const res = await api("/api/stats?year=all");
      const body = await res.json();
      expect(body.library.copies_by_language).toEqual({
        en: 4,
        de: 2,
      });
    });

    it("computes copies by status", async () => {
      const res = await api("/api/stats?year=all");
      const body = await res.json();
      expect(body.library.copies_by_status).toEqual({
        owned: 5,
        lent: 1,
      });
    });

    it("computes copies by condition", async () => {
      const res = await api("/api/stats?year=all");
      const body = await res.json();
      expect(body.library.copies_by_condition).toEqual({
        good: 3,
        worn: 2,
      });
    });

    it("computes works by genre (each genre counted per work)", async () => {
      const res = await api("/api/stats?year=all");
      const body = await res.json();
      expect(body.library.works_by_genre).toEqual({
        fiction: 2,
        fantasy: 2,
        classic: 1,
      });
    });

    it("computes works by language", async () => {
      const res = await api("/api/stats?year=all");
      const body = await res.json();
      expect(body.library.works_by_language).toEqual({
        en: 2,
      });
    });

    it("computes works by series", async () => {
      const res = await api("/api/stats?year=all");
      const body = await res.json();
      expect(body.library.works_by_series).toEqual({
        lotr: 2,
      });
    });
  });

  describe("Reading stats with year=2025", () => {
    it("counts finished read-throughs in 2025 (not DNF, not outside range)", async () => {
      const res = await api("/api/stats?year=2025");
      const body = await res.json();
      // fellowship-hc-1: finished 2025-03-01 ✓
      // towers-hc-1: finished 2025-01-20 ✓
      // fellowship-pb-1: finished 2024-11-15 ✗ (out of range)
      // no-series-pb: DNF ✗
      expect(body.reading.finished_count).toBe(2);
    });

    it("counts currently reading regardless of date range", async () => {
      const res = await api("/api/stats?year=2025");
      const body = await res.json();
      // towers-hc-2 started 2025-06-01, status: reading
      expect(body.reading.currently_reading_count).toBe(1);
    });

    it("computes total pages read from page_log deltas in 2025", async () => {
      const res = await api("/api/stats?year=2025");
      const body = await res.json();
      // fellowship-hc-1: all entries in 2025 → deltas: 100+150+173 = 423
      // towers-hc-1 (spanning): only entries in 2025: 250-100=150, 352-250=102 → 252
      // towers-hc-2 (reading): 80-0=80, 160-80=80 → 160
      // no-series-pb: 150-0=150, 200-150=50 → 200
      // fellowship-pb-1: all entries in 2024, not in 2025 → 0
      expect(body.reading.total_pages_read).toBe(1035);
    });

    it("computes avg pages per day from calendar days elapsed in range", async () => {
      const res = await api("/api/stats?year=2025");
      const body = await res.json();
      // 2025 is fully in the past (current date is 2026), so the denominator is
      // the full 365 calendar days of 2025. total_pages_read = 1035.
      // 1035 / 365 = 2.835... → 2.8
      expect(body.reading.avg_pages_per_day).toBe(2.8);
    });

    it("computes copies acquired in 2025", async () => {
      const res = await api("/api/stats?year=2025");
      const body = await res.json();
      // fellowship-hc-1: 2025-03-15 ✓
      // fellowship-pb-1: 2024-06-01 ✗
      // towers-hc-1: 2024-12-01 ✗
      // no-series-pb: 2025-04-01 ✓
      expect(body.reading.copies_acquired).toBe(2);
    });

    it("computes average rating per work (excluding unrated)", async () => {
      const res = await api("/api/stats?year=all");
      const body = await res.json();
      // The Fellowship: 2 rated read-throughs (9.0 and 8.0) → avg 8.5
      // The Two Towers: 1 rated read-through (9.5) → avg 9.5
      // No Series Book: 1 rated read-through (4.0) → avg 4.0
      const works = body.reading.avg_rating_by_work;
      const fellowship = works.find((w: { slug: string }) => w.slug === "the-fellowship");
      const towers = works.find((w: { slug: string }) => w.slug === "the-two-towers");
      const noSeries = works.find((w: { slug: string }) => w.slug === "no-series-work");

      expect(fellowship.avg_rating).toBe(8.5);
      expect(fellowship.read_through_count).toBe(2);
      expect(towers.avg_rating).toBe(9.5);
      expect(towers.read_through_count).toBe(1);
      expect(noSeries.avg_rating).toBe(4);
      expect(noSeries.read_through_count).toBe(1);
    });

    it("excludes unrated read-throughs from avg rating", async () => {
      // towers-hc-2 has a reading read-through with no rating - should not be counted
      const res = await api("/api/stats?year=all");
      const body = await res.json();
      const towers = body.reading.avg_rating_by_work.find(
        (w: { slug: string }) => w.slug === "the-two-towers",
      );
      expect(towers.read_through_count).toBe(1); // only the rated one
    });

    it("computes average rating per author", async () => {
      const res = await api("/api/stats?year=all");
      const body = await res.json();
      // Tolkien has works with total 4 rated read-throughs: 9.0, 8.0, 9.5, 4.0
      // avg = (9+8+9.5+4)/4 = 7.625 → 7.6
      const author = body.reading.avg_rating_by_author[0];
      expect(author.slug).toBe("tolkien");
      expect(author.name).toBe("J.R.R. Tolkien");
      expect(author.avg_rating).toBe(7.6);
      expect(author.read_through_count).toBe(4);
    });

    it("includes date range in response for year param", async () => {
      const res = await api("/api/stats?year=2025");
      const body = await res.json();
      expect(body.range).toEqual({ from: "2025-01-01", to: "2025-12-31" });
    });
  });

  describe("Reading stats with year=all", () => {
    it("counts all finished read-throughs", async () => {
      const res = await api("/api/stats?year=all");
      const body = await res.json();
      // 3 finished: fellowship-hc-1, towers-hc-1, fellowship-pb-1
      // 1 DNF: no-series-pb (not counted)
      expect(body.reading.finished_count).toBe(3);
    });

    it("counts all copies with acquisition_date", async () => {
      const res = await api("/api/stats?year=all");
      const body = await res.json();
      // 4 copies with acquisition_date: fellowship-hc-1, fellowship-pb-1, towers-hc-1, no-series-pb
      expect(body.reading.copies_acquired).toBe(4);
    });

    it("omits range field for all-time", async () => {
      const res = await api("/api/stats?year=all");
      const body = await res.json();
      expect(body.range).toBeUndefined();
    });
  });

  describe("Note stats", () => {
    it("counts total notes in range", async () => {
      const res = await api("/api/stats?year=2025");
      const body = await res.json();
      // 4 notes in 2025: Jan, Feb, Mar, Jun 10
      // 1 note in 2024: Oct 10 (excluded)
      expect(body.notes.total_notes).toBe(4);
    });

    it("groups notes by month", async () => {
      const res = await api("/api/stats?year=2025");
      const body = await res.json();
      expect(body.notes.notes_per_month).toEqual({
        "2025-01": 1,
        "2025-02": 1,
        "2025-03": 1,
        "2025-06": 1,
      });
    });

    it("returns most annotated works sorted by count", async () => {
      const res = await api("/api/stats?year=all");
      const body = await res.json();
      // the-fellowship: 4 notes (3 in 2025 + 1 in 2024)
      // the-two-towers: 1 note
      const works = body.notes.most_annotated_works;
      expect(works).toHaveLength(2);
      expect(works[0].slug).toBe("the-fellowship");
      expect(works[0].note_count).toBe(4);
      expect(works[1].slug).toBe("the-two-towers");
      expect(works[1].note_count).toBe(1);
    });

    it("respects limit parameter", async () => {
      const res = await api("/api/stats?year=all&limit=1");
      const body = await res.json();
      expect(body.notes.most_annotated_works).toHaveLength(1);
      expect(body.notes.most_annotated_works[0].slug).toBe("the-fellowship");
    });
  });

  describe("Parameter validation", () => {
    it("rejects conflicting year and from params", async () => {
      const res = await api("/api/stats?year=2025&from=2025-01-01");
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Cannot combine");
    });

    it("rejects from without to", async () => {
      const res = await api("/api/stats?from=2025-01-01");
      expect(res.status).toBe(400);
    });

    it("rejects to without from", async () => {
      const res = await api("/api/stats?to=2025-12-31");
      expect(res.status).toBe(400);
    });

    it("rejects from > to", async () => {
      const res = await api("/api/stats?from=2025-12-31&to=2025-01-01");
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("before");
    });

    it("rejects invalid date format", async () => {
      const res = await api("/api/stats?from=not-a-date&to=2025-01-01");
      expect(res.status).toBe(400);
    });
  });

  describe("Empty library", () => {
    it("returns zeros for an empty index", async () => {
      // Create a separate empty index server
      const emptyRoot = join(os.tmpdir(), `bt-stats-empty-${Date.now()}`);
      mkdirSync(emptyRoot, { recursive: true });
      for (const dir of ["authors", "works", "editions", "copies", "notes"]) {
        mkdirSync(join(emptyRoot, dir), { recursive: true });
      }

      const app = express();
      app.use(express.json());
      const { Index } = await import("../lib/index.js");
      const emptyIndex = new Index(emptyRoot);
      emptyIndex.load();
      const { createStatsRouter } = await import("./stats.js");
      app.use("/api/stats", createStatsRouter(emptyIndex, emptyRoot));

      let emptyPort = 0;
      const emptyServer = await new Promise<Server>((resolve) => {
        const s = app.listen(0, () => resolve(s));
      });
      const addr = emptyServer.address();
      if (addr && typeof addr === "object") emptyPort = addr.port;

      const res = await fetch(`http://localhost:${emptyPort}/api/stats?year=all`);
      const body = await res.json();

      expect(body.library.total_works).toBe(0);
      expect(body.library.total_editions).toBe(0);
      expect(body.library.total_copies).toBe(0);
      expect(body.library.copies_by_format).toEqual({});
      expect(body.library.copies_by_language).toEqual({});
      expect(body.library.copies_by_status).toEqual({});
      expect(body.reading.finished_count).toBe(0);
      expect(body.reading.currently_reading_count).toBe(0);
      expect(body.reading.avg_rating_by_work).toEqual([]);
      expect(body.reading.avg_rating_by_author).toEqual([]);
      expect(body.reading.avg_pages_per_day).toBe(0);
      expect(body.reading.pages_per_period).toEqual([]);
      expect(body.library.unread_count).toBe(0);
      expect(body.library.percent_read).toBe(0);
      expect(body.notes.total_notes).toBe(0);
      expect(body.notes.notes_per_month).toEqual({});
      expect(body.notes.most_annotated_works).toEqual([]);

      await new Promise<void>((r) => emptyServer.close(() => r()));
      rmSync(emptyRoot, { recursive: true });
    });
  });

  describe("Custom date range", () => {
    it("works with from= and to= parameters", async () => {
      const res = await api("/api/stats?from=2025-01-01&to=2025-03-31");
      const body = await res.json();
      expect(body.range).toEqual({ from: "2025-01-01", to: "2025-03-31" });
      // Two finished in this range: fellowship-hc-1 (Mar 1) and towers-hc-1 (Jan 20)
      expect(body.reading.finished_count).toBe(2);
      // Notes in Q1 2025: Jan, Feb, Mar = 3
      expect(body.notes.total_notes).toBe(3);
    });

    it("treats the `to` bound as inclusive of the whole end day", async () => {
      // The Mar 1 note is dated 2025-03-01T12:00:00. With an inclusive end-of-day
      // `to`, it falls inside [Feb 1, Mar 1]; with a start-of-day `to` it would not.
      const res = await api("/api/stats?from=2025-02-01&to=2025-03-01");
      const body = await res.json();
      // Feb 15 note + Mar 1 (12:00) note = 2
      expect(body.notes.total_notes).toBe(2);
    });

    it("computes a single-day range without skipping stats", async () => {
      // fellowship-hc-1 logged 100 pages on 2025-02-10 (and nothing else that day
      // across the library). A same-day range must still count that activity.
      const res = await api("/api/stats?from=2025-02-10&to=2025-02-10");
      const body = await res.json();
      expect(body.range).toEqual({ from: "2025-02-10", to: "2025-02-10" });
      expect(body.reading.total_pages_read).toBe(100);
      // Denominator clamps to a minimum of 1 day → 100 pages / 1 day.
      expect(body.reading.avg_pages_per_day).toBe(100);
    });
  });

  describe("Pages per day", () => {
    it("divides by calendar days elapsed for a fully-past range", async () => {
      // fellowship-pb-1: pages logged 2024-10-10 (100) and 2024-11-15 (323) = 423.
      // Range 2024-10-01..2024-11-15 inclusive = 46 calendar days. 423/46 = 9.19 → 9.2
      const res = await api("/api/stats?from=2024-10-01&to=2024-11-15");
      const body = await res.json();
      expect(body.reading.total_pages_read).toBe(423);
      expect(body.reading.avg_pages_per_day).toBe(9.2);
    });

    it("caps the denominator at today for a range extending into the future", async () => {
      // to=2099 would balloon the denominator to ~27000 days if not capped at today;
      // capping keeps pages/day meaningful (well above 1).
      const res = await api("/api/stats?from=2025-01-01&to=2099-12-31");
      const body = await res.json();
      expect(body.reading.total_pages_read).toBe(1035);
      expect(body.reading.avg_pages_per_day).toBeGreaterThan(1);
    });

    it("sums all-time pages and derives a baseline from earliest activity", async () => {
      // All-time total across every page_log: 423+423+352+160+200 = 1558
      const res = await api("/api/stats?year=all");
      const body = await res.json();
      expect(body.reading.total_pages_read).toBe(1558);
      expect(body.reading.avg_pages_per_day).toBeGreaterThan(0);
    });
  });

  describe("Range-scoped ratings", () => {
    it("includes only read-throughs finished within the range", async () => {
      // year=2025: the-fellowship has two rated read-throughs, but pb-1 finished in
      // 2024 → only hc-1 (9.0) contributes.
      const res = await api("/api/stats?year=2025");
      const body = await res.json();
      const fellowship = body.reading.avg_rating_by_work.find(
        (w: { slug: string }) => w.slug === "the-fellowship",
      );
      expect(fellowship.avg_rating).toBe(9.0);
      expect(fellowship.read_through_count).toBe(1);
    });

    it("includes every rated read-through for all-time", async () => {
      const res = await api("/api/stats?year=all");
      const body = await res.json();
      const fellowship = body.reading.avg_rating_by_work.find(
        (w: { slug: string }) => w.slug === "the-fellowship",
      );
      expect(fellowship.avg_rating).toBe(8.5);
      expect(fellowship.read_through_count).toBe(2);
    });
  });

  describe("Unread and percent read", () => {
    it("counts in-possession, never-started copies as unread", async () => {
      const res = await api("/api/stats?year=all");
      const body = await res.json();
      // Only fellowship-lent (status lent, no read-throughs) is unread.
      expect(body.library.unread_count).toBe(1);
    });

    it("computes percent of works with a finished read-through", async () => {
      const res = await api("/api/stats?year=all");
      const body = await res.json();
      // fellowship + towers finished, no-series-work only DNF → 2/3 → 67
      expect(body.library.percent_read).toBe(67);
    });

    it("does not scope unread/percent_read by the date range", async () => {
      const res = await api("/api/stats?year=2025");
      const body = await res.json();
      expect(body.library.unread_count).toBe(1);
      expect(body.library.percent_read).toBe(67);
    });
  });

  describe("Reading velocity series", () => {
    it("returns contiguous daily buckets for a short range", async () => {
      const res = await api("/api/stats?from=2025-02-01&to=2025-03-01");
      const body = await res.json();
      const series = body.reading.pages_per_period;
      // Feb 1..Mar 1 inclusive = 29 contiguous daily buckets.
      expect(series).toHaveLength(29);
      const byPeriod = Object.fromEntries(
        series.map((p: { period: string; pages: number }) => [p.period, p.pages]),
      );
      expect(byPeriod["2025-02-10"]).toBe(100);
      expect(byPeriod["2025-02-20"]).toBe(150);
      expect(byPeriod["2025-03-01"]).toBe(173);
      // Chronologically ordered.
      const periods = series.map((p: { period: string }) => p.period);
      expect([...periods].sort()).toEqual(periods);
    });

    it("buckets by month for all-time spans", async () => {
      const res = await api("/api/stats?year=all");
      const body = await res.json();
      const series = body.reading.pages_per_period;
      expect(series.length).toBeGreaterThan(0);
      for (const p of series) {
        expect(p.period).toMatch(/^\d{4}-\d{2}$/);
      }
    });
  });
});
