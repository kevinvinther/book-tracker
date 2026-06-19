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
    publisher: "HarperCollins", format: "hardcover", page_count: 423,
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  writeFile(join(tmpRoot, "editions/fellowship-pb.md"), {
    type: "edition", slug: "fellowship-pb",
    work: "[[works/the-fellowship]]",
    publisher: "HarperCollins", format: "paperback", page_count: 423,
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  writeFile(join(tmpRoot, "editions/towers-hc.md"), {
    type: "edition", slug: "towers-hc",
    work: "[[works/the-two-towers]]",
    publisher: "HarperCollins", format: "hardcover", page_count: 352,
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  // Copies with read-throughs
  // Copy 1: finished in 2025, rated, with acquisition
  writeFile(join(tmpRoot, "copies/fellowship-hc-1.md"), {
    type: "copy", slug: "fellowship-hc-1",
    edition: "[[editions/fellowship-hc]]",
    work: "[[works/the-fellowship]]",
    format: "hardcover",
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
    format: "paperback",
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
    format: "hardcover",
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
    format: "hardcover",
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
    format: "paperback",
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
        hardcover: 3,
        paperback: 2,
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

    it("computes avg pages per day from active days in range", async () => {
      const res = await api("/api/stats?year=2025");
      const body = await res.json();
      // fellowship-hc-1: active 2025-02-01 to 2025-03-01 = 28 days, 423 pages
      // towers-hc-1 (spanning): active 2025-01-01 (clipped from 2024-12-15) to 2025-01-20 = 19 days, 252 pages
      // towers-hc-2 (reading): active 2025-06-01 to 2025-12-31 (clipped) days vary, 160 pages
      // no-series-pb: active 2025-04-01 to 2025-05-01 = 30 days, 200 pages
      // Total pages: 1035, total active days: 28+19+30+214 = 291? no, towers-hc-2 is still reading at 'now'
      // The active days for towers-hc-2 depends on current date
      expect(body.reading.avg_pages_per_day).toBeGreaterThan(0);
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
      expect(body.library.copies_by_status).toEqual({});
      expect(body.reading.finished_count).toBe(0);
      expect(body.reading.currently_reading_count).toBe(0);
      expect(body.reading.avg_rating_by_work).toEqual([]);
      expect(body.reading.avg_rating_by_author).toEqual([]);
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
  });
});
