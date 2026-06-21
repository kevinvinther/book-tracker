import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { Server } from "http";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import os from "os";

const now = new Date();
const Y = now.getFullYear();
const M = String(now.getMonth() + 1).padStart(2, "0");
// A date within the current calendar month (day is always valid 01–28).
const thisMonth = (day: string) => `${Y}-${M}-${day}T00:00:00.000Z`;
// A fixed prior year, used for page logs that must NOT count toward this month.
const PRIOR = `${Y - 2}-03`;

const populated = join(os.tmpdir(), `bt-dash-test-${Date.now()}`);
const empty = join(os.tmpdir(), `bt-dash-empty-${Date.now()}`);

let server: Server;
let port: number;
let emptyServer: Server;
let emptyPort: number;

function makeDirs(root: string) {
  mkdirSync(root, { recursive: true });
  for (const dir of ["authors", "series", "works", "editions", "copies", "notes", "attachments"]) {
    mkdirSync(join(root, dir), { recursive: true });
  }
}

async function buildApp(root: string): Promise<{ server: Server; port: number }> {
  const app = express();
  app.use(express.json());
  const { Index } = await import("../lib/index.js");
  const index = new Index(root);
  index.load();
  const { createDashboardRouter } = await import("./dashboard.js");
  app.use("/api/dashboard", createDashboardRouter(index, root));
  const srv = app.listen(0);
  await new Promise<void>((resolve) => srv.once("listening", () => resolve()));
  const addr = srv.address();
  const p = addr && typeof addr === "object" ? addr.port : 0;
  return { server: srv, port: p };
}

beforeAll(async () => {
  makeDirs(populated);
  makeDirs(empty);

  const { writeFile } = await import("../lib/io.js");

  writeFile(join(populated, "authors/ada.md"), {
    type: "author", slug: "ada", name: "Ada Lovelace",
    created_at: "2020-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  writeFile(join(populated, "works/alpha.md"), {
    type: "work", slug: "alpha", title: "Alpha",
    authors: ["[[authors/ada]]"], primary_cover: "alpha.jpg",
    created_at: "2020-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  writeFile(join(populated, "editions/ed-300.md"), {
    type: "edition", slug: "ed-300", work: "[[works/alpha]]", page_count: 300,
    created_at: "2020-01-01T00:00:00.000Z", _schema: 1,
  }, "");
  writeFile(join(populated, "editions/ed-200.md"), {
    type: "edition", slug: "ed-200", work: "[[works/alpha]]", page_count: 200,
    created_at: "2020-01-01T00:00:00.000Z", _schema: 1,
  }, "");
  writeFile(join(populated, "editions/ed-nopage.md"), {
    type: "edition", slug: "ed-nopage", work: "[[works/alpha]]",
    created_at: "2020-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  // Active read-throughs --------------------------------------------------

  // reading, most recent activity, has its own cover_image, created newest.
  writeFile(join(populated, "copies/reading-recent.md"), {
    type: "copy", slug: "reading-recent",
    edition: "[[editions/ed-300]]", work: "[[works/alpha]]",
    status: "owned", cover_image: "custom-cover.jpg",
    read_throughs: [{
      started_date: thisMonth("01"), status: "reading",
      page_log: [
        { date: thisMonth("01"), page: 0 },
        { date: thisMonth("05"), page: 80 },
        { date: thisMonth("15"), page: 150 },
      ],
    }],
    created_at: "2030-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  // reading, older activity.
  writeFile(join(populated, "copies/reading-old.md"), {
    type: "copy", slug: "reading-old",
    edition: "[[editions/ed-200]]", work: "[[works/alpha]]",
    status: "owned",
    read_throughs: [{
      started_date: thisMonth("01"), status: "reading",
      page_log: [
        { date: thisMonth("01"), page: 0 },
        { date: thisMonth("05"), page: 80 },
      ],
    }],
    created_at: "2020-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  // paused, no page_count on edition.
  writeFile(join(populated, "copies/paused-one.md"), {
    type: "copy", slug: "paused-one",
    edition: "[[editions/ed-nopage]]", work: "[[works/alpha]]",
    status: "owned",
    read_throughs: [{
      started_date: thisMonth("01"), status: "paused",
      page_log: [
        { date: thisMonth("01"), page: 0 },
        { date: thisMonth("10"), page: 40 },
      ],
    }],
    created_at: "2019-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  // DNF — excluded from currently-reading; page log in a prior year.
  writeFile(join(populated, "copies/dnf-x.md"), {
    type: "copy", slug: "dnf-x",
    edition: "[[editions/ed-300]]", work: "[[works/alpha]]",
    status: "owned",
    read_throughs: [{
      started_date: `${PRIOR}-01T00:00:00.000Z`, status: "dnf",
      finished_date: `${Y}-03-01T00:00:00.000Z`,
      page_log: [
        { date: `${PRIOR}-01T00:00:00.000Z`, page: 0 },
        { date: `${PRIOR}-10T00:00:00.000Z`, page: 120 },
      ],
    }],
    created_at: "2018-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  // Finished read-throughs: 6 this year (months 01–06), 1 last year. Page logs
  // are all in a prior year so they never count toward pages_this_month.
  for (let i = 1; i <= 7; i++) {
    const month = String(i).padStart(2, "0");
    const finishedDate = i === 7 ? `${Y - 1}-06-01T00:00:00.000Z` : `${Y}-${month}-01T00:00:00.000Z`;
    writeFile(join(populated, `copies/fin-${i}.md`), {
      type: "copy", slug: `fin-${i}`,
      edition: "[[editions/ed-300]]", work: "[[works/alpha]]",
      status: "owned",
      read_throughs: [{
        started_date: `${PRIOR}-01T00:00:00.000Z`, status: "finished",
        finished_date: finishedDate,
        ...(i === 1 ? { rating: 8.5 } : {}),
        page_log: [
          { date: `${PRIOR}-01T00:00:00.000Z`, page: 0 },
          { date: `${PRIOR}-20T00:00:00.000Z`, page: 300 },
        ],
      }],
      created_at: `20${10 + i}-01-01T00:00:00.000Z`, _schema: 1,
    }, "");
  }

  ({ server, port } = await buildApp(populated));
  ({ server: emptyServer, port: emptyPort } = await buildApp(empty));
});

afterAll(async () => {
  await new Promise<void>((r) => server?.close(() => r()));
  await new Promise<void>((r) => emptyServer?.close(() => r()));
  for (const root of [populated, empty]) {
    if (existsSync(root)) rmSync(root, { recursive: true });
  }
});

async function getDashboard(p: number) {
  const res = await fetch(`http://localhost:${p}/api/dashboard`);
  return { status: res.status, body: await res.json() };
}

describe("Dashboard API", () => {
  describe("currently_reading", () => {
    it("orders reading before paused, then by most recent activity", async () => {
      const { status, body } = await getDashboard(port);
      expect(status).toBe(200);
      expect(body.currently_reading.map((e: any) => e.copy_slug)).toEqual([
        "reading-recent",
        "reading-old",
        "paused-one",
      ]);
    });

    it("excludes finished and dnf read-throughs", async () => {
      const { body } = await getDashboard(port);
      const slugs = body.currently_reading.map((e: any) => e.copy_slug);
      expect(slugs).not.toContain("dnf-x");
      expect(slugs).not.toContain("fin-1");
    });

    it("includes page_count, last_page, work meta, and the copy cover", async () => {
      const { body } = await getDashboard(port);
      const entry = body.currently_reading.find((e: any) => e.copy_slug === "reading-recent");
      expect(entry.page_count).toBe(300);
      expect(entry.last_page).toBe(150);
      expect(entry.status).toBe("reading");
      expect(entry.cover).toBe("custom-cover.jpg");
      expect(entry.work).toEqual({ slug: "alpha", title: "Alpha", author: "Ada Lovelace" });
      expect(entry.page_log).toHaveLength(3);
    });

    it("returns null page_count when the edition has none, and falls back to the work cover", async () => {
      const { body } = await getDashboard(port);
      const entry = body.currently_reading.find((e: any) => e.copy_slug === "paused-one");
      expect(entry.page_count).toBeNull();
      expect(entry.status).toBe("paused");
      expect(entry.cover).toBe("alpha.jpg");
    });
  });

  describe("recently_finished", () => {
    it("caps at 6, newest first, and excludes prior-year overflow", async () => {
      const { body } = await getDashboard(port);
      expect(body.recently_finished).toHaveLength(6);
      expect(body.recently_finished[0].copy_slug).toBe("fin-6");
      expect(body.recently_finished.map((e: any) => e.copy_slug)).not.toContain("fin-7");
    });

    it("includes rating when present", async () => {
      const { body } = await getDashboard(port);
      const entry = body.recently_finished.find((e: any) => e.copy_slug === "fin-1");
      expect(entry.rating).toBe(8.5);
    });
  });

  describe("recently_added", () => {
    it("caps at 6, newest by created_at first", async () => {
      const { body } = await getDashboard(port);
      expect(body.recently_added).toHaveLength(6);
      expect(body.recently_added[0].copy_slug).toBe("reading-recent");
      const dates = body.recently_added.map((e: any) => e.created_at);
      expect([...dates]).toEqual([...dates].sort().reverse());
    });
  });

  describe("glance", () => {
    it("computes finished_this_year, pages_this_month, and currently_reading", async () => {
      const { body } = await getDashboard(port);
      expect(body.glance.finished_this_year).toBe(6);
      expect(body.glance.pages_this_month).toBe(270);
      expect(body.glance.currently_reading).toBe(2);
    });
  });

  describe("empty library", () => {
    it("returns empty arrays and zeroed glance", async () => {
      const { status, body } = await getDashboard(emptyPort);
      expect(status).toBe(200);
      expect(body.currently_reading).toEqual([]);
      expect(body.recently_finished).toEqual([]);
      expect(body.recently_added).toEqual([]);
      expect(body.glance).toEqual({
        finished_this_year: 0,
        pages_this_month: 0,
        currently_reading: 0,
      });
    });
  });
});
