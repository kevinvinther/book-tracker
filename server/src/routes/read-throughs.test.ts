import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { Server } from "http";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import os from "os";

const tmpRoot = join(os.tmpdir(), `bt-read-through-test-${Date.now()}`);

let server: Server;
let port: number;

beforeAll(async () => {
  mkdirSync(tmpRoot, { recursive: true });
  for (const dir of ["authors", "works", "editions", "copies", "notes", "attachments", ".booktracker/cache"]) {
    mkdirSync(join(tmpRoot, dir), { recursive: true });
  }

  const { writeFile } = await import("../lib/io.js");

  writeFile(join(tmpRoot, "works/dune.md"), {
    type: "work", slug: "dune",
    title: "Dune", authors: [],
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# Dune");

  writeFile(join(tmpRoot, "editions/dune-ace-1990.md"), {
    type: "edition", slug: "dune-ace-1990",
    work: "[[works/dune]]",
    publisher: "Ace Books", format: "paperback", page_count: 604,
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  writeFile(join(tmpRoot, "editions/dune-no-pages.md"), {
    type: "edition", slug: "dune-no-pages",
    work: "[[works/dune]]",
    publisher: "Unknown", format: "ebook",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  writeFile(join(tmpRoot, "copies/dune-pb.md"), {
    type: "copy", slug: "dune-pb",
    edition: "[[editions/dune-ace-1990]]",
    work: "[[works/dune]]",
    status: "owned",
    condition: "good",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  writeFile(join(tmpRoot, "copies/dune-lent.md"), {
    type: "copy", slug: "dune-lent",
    edition: "[[editions/dune-ace-1990]]",
    work: "[[works/dune]]",
    status: "lent",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  writeFile(join(tmpRoot, "copies/dune-no-pages.md"), {
    type: "copy", slug: "dune-no-pages",
    edition: "[[editions/dune-no-pages]]",
    work: "[[works/dune]]",
    status: "owned",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "");

  const app = express();
  app.use(express.json());

  const { Index } = await import("../lib/index.js");
  const index = new Index(tmpRoot);
  index.load();

  const { createCopiesRouter } = await import("./copies.js");
  app.use("/api/copies", createCopiesRouter(index, tmpRoot));

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

describe("Read-through API", () => {
  describe("POST /api/copies/:slug/read-throughs", () => {
    it("creates a new read-through with default started_date and page: 0", async () => {
      const res = await api("/api/copies/dune-pb/read-throughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(201);
      const copy = await res.json();
      expect(copy.read_throughs).toHaveLength(1);
      expect(copy.read_throughs[0].status).toBe("reading");
      expect(copy.read_throughs[0].started_date).toBeTruthy();
      expect(copy.read_throughs[0].page_log).toEqual([
        { date: copy.read_throughs[0].started_date, page: 0 },
      ]);
    });

    it("accepts a custom started_date", async () => {
      const res = await api("/api/copies/dune-pb/read-throughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ started_date: "2025-03-15" }),
      });
      expect(res.status).toBe(201);
      const copy = await res.json();
      const rt = copy.read_throughs.find((r: { started_date: string }) => r.started_date.startsWith("2025-03-15"));
      expect(rt).toBeDefined();
      expect(rt.page_log[0].page).toBe(0);
    });

    it("auto-pauses existing active read-through", async () => {
      const res = await api("/api/copies/dune-pb/read-throughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(201);
      const copy = await res.json();
      expect(copy.warning).toBeDefined();
      expect(copy.warning).toContain("Paused existing active read-through");
      const paused = copy.read_throughs.find((r: { status: string }) => r.status === "paused");
      expect(paused).toBeDefined();
    });

    it("blocks read-through on a lent copy", async () => {
      const res = await api("/api/copies/dune-lent/read-throughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("lent");
    });

    it("returns 404 for non-existent copy", async () => {
      const res = await api("/api/copies/nonexistent/read-throughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/copies/:slug/read-throughs/:startedDate/log", () => {
    beforeAll(async () => {
      await api("/api/copies/dune-pb/read-throughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ started_date: "2025-06-01" }),
      });
    });

    it("logs a page", async () => {
      const res = await api("/api/copies/dune-pb/read-throughs/2025-06-01/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 50 }),
      });
      expect(res.status).toBe(200);
      const copy = await res.json();
      const rt = copy.read_throughs.find((r: { started_date: string }) => r.started_date.startsWith("2025-06-01"));
      const lastEntry = rt.page_log[rt.page_log.length - 1];
      expect(lastEntry.page).toBe(50);
    });

    it("returns finished: true when page == page_count", async () => {
      const res = await api("/api/copies/dune-pb/read-throughs/2025-06-01/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 604 }),
      });
      expect(res.status).toBe(200);
      const copy = await res.json();
      expect(copy.finished).toBe(true);
    });

    it("rejects page below last entry", async () => {
      await api("/api/copies/dune-pb/read-throughs/2025-06-01/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 100 }),
      });

      const res = await api("/api/copies/dune-pb/read-throughs/2025-06-01/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 50 }),
      });
      expect(res.status).toBe(400);
    });

    it("rejects page exceeding edition page_count", async () => {
      const res = await api("/api/copies/dune-pb/read-throughs/2025-06-01/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 9999 }),
      });
      expect(res.status).toBe(400);
    });

    it("warns but accepts when edition has no page_count", async () => {
      await api("/api/copies/dune-no-pages/read-throughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ started_date: "2025-07-01" }),
      });

      const res = await api("/api/copies/dune-no-pages/read-throughs/2025-07-01/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 312 }),
      });
      expect(res.status).toBe(200);
      const copy = await res.json();
      expect(copy.warning).toBeDefined();
      expect(copy.warning).toContain("page_count");
    });

    it("returns 404 for non-existent read-through", async () => {
      const res = await api("/api/copies/dune-pb/read-throughs/2020-01-01/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 50 }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/copies/:slug/read-throughs/:startedDate", () => {
    beforeAll(async () => {
      await api("/api/copies/dune-pb/read-throughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ started_date: "2025-08-01" }),
      });
    });

    it("finishes with rating", async () => {
      await api("/api/copies/dune-pb/read-throughs/2025-08-01/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 604 }),
      });

      const res = await api("/api/copies/dune-pb/read-throughs/2025-08-01", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "finished", rating: 9.5, finished_date: "2025-12-01" }),
      });
      expect(res.status).toBe(200);
      const copy = await res.json();
      const rt = copy.read_throughs.find((r: { started_date: string }) => r.started_date.startsWith("2025-08-01"));
      expect(rt.status).toBe("finished");
      expect(rt.rating).toBe(9.5);
      expect(rt.finished_date).toBeDefined();
    });

    it("auto-logs page_count when finishing with incomplete page log", async () => {
      await api("/api/copies/dune-pb/read-throughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ started_date: "2025-09-01" }),
      });
      await api("/api/copies/dune-pb/read-throughs/2025-09-01/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 200 }),
      });

      const res = await api("/api/copies/dune-pb/read-throughs/2025-09-01", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "finished" }),
      });
      expect(res.status).toBe(200);
      const copy = await res.json();
      const rt = copy.read_throughs.find((r: { started_date: string }) => r.started_date.startsWith("2025-09-01"));
      expect(rt.status).toBe("finished");
      const lastEntry = rt.page_log[rt.page_log.length - 1];
      expect(lastEntry.page).toBe(604);
    });

    it("finishes when edition has no page_count", async () => {
      await api("/api/copies/dune-no-pages/read-throughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ started_date: "2025-10-01" }),
      });

      const res = await api("/api/copies/dune-no-pages/read-throughs/2025-10-01", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "finished", finished_date: "2025-11-01" }),
      });
      expect(res.status).toBe(200);
      const copy = await res.json();
      const rt = copy.read_throughs.find((r: { started_date: string }) => r.started_date.startsWith("2025-10-01"));
      expect(rt.status).toBe("finished");
    });

    it("sets DNF with final page", async () => {
      const res = await api("/api/copies/dune-pb/read-throughs/2025-09-01", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dnf", page: 300, finished_date: "2025-10-15" }),
      });
      expect(res.status).toBe(200);
      const copy = await res.json();
      const rt = copy.read_throughs.find((r: { started_date: string }) => r.started_date.startsWith("2025-09-01"));
      expect(rt.status).toBe("dnf");
      const lastEntry = rt.page_log[rt.page_log.length - 1];
      expect(lastEntry.page).toBe(300);
    });

    it("sets DNF without page", async () => {
      await api("/api/copies/dune-pb/read-throughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ started_date: "2025-11-01" }),
      });
      await api("/api/copies/dune-pb/read-throughs/2025-11-01/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 100 }),
      });

      const res = await api("/api/copies/dune-pb/read-throughs/2025-11-01", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dnf", finished_date: "2025-12-01" }),
      });
      expect(res.status).toBe(200);
      const copy = await res.json();
      const rt = copy.read_throughs.find((r: { started_date: string }) => r.started_date.startsWith("2025-11-01"));
      expect(rt.status).toBe("dnf");
      expect(rt.page_log).toHaveLength(2);
    });

    it("pauses a read-through", async () => {
      await api("/api/copies/dune-pb/read-throughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ started_date: "2025-12-01" }),
      });

      const res = await api("/api/copies/dune-pb/read-throughs/2025-12-01", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paused" }),
      });
      expect(res.status).toBe(200);
      const copy = await res.json();
      const rt = copy.read_throughs.find((r: { started_date: string }) => r.started_date.startsWith("2025-12-01"));
      expect(rt.status).toBe("paused");
    });

    it("resumes a paused read-through and auto-pauses active one", async () => {
      await api("/api/copies/dune-pb/read-throughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ started_date: "2026-01-01" }),
      });

      const res = await api("/api/copies/dune-pb/read-throughs/2025-12-01", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resumed" }),
      });
      expect(res.status).toBe(200);
      const copy = await res.json();
      expect(copy.warning).toBeDefined();
      expect(copy.warning).toContain("Paused existing active read-through");

      const resumed = copy.read_throughs.find((r: { started_date: string }) => r.started_date.startsWith("2025-12-01"));
      expect(resumed.status).toBe("reading");

      const autoPaused = copy.read_throughs.find((r: { started_date: string }) => r.started_date.startsWith("2026-01-01"));
      expect(autoPaused.status).toBe("paused");
    });

    it("rejects invalid status", async () => {
      const res = await api("/api/copies/dune-pb/read-throughs/2025-12-01", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "invalid" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent read-through", async () => {
      const res = await api("/api/copies/dune-pb/read-throughs/2020-01-01", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "finished" }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/copies/:slug/read-throughs/:startedDate/entries/:date", () => {
    beforeAll(async () => {
      await api("/api/copies/dune-pb/read-throughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ started_date: "2026-02-01" }),
      });
      await api("/api/copies/dune-pb/read-throughs/2026-02-01/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 147, date: "2026-02-10" }),
      });
      await api("/api/copies/dune-pb/read-throughs/2026-02-01/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 312, date: "2026-02-20" }),
      });
    });

    it("edits page number", async () => {
      const res = await api("/api/copies/dune-pb/read-throughs/2026-02-01/entries/2026-02-10", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 200 }),
      });
      expect(res.status).toBe(200);
      const copy = await res.json();
      const rt = copy.read_throughs.find((r: { started_date: string }) => r.started_date.startsWith("2026-02-01"));
      const entry = rt.page_log.find((e: { date: string }) => e.date.startsWith("2026-02-10"));
      expect(entry.page).toBe(200);
    });

    it("edits date and re-sorts", async () => {
      const res = await api("/api/copies/dune-pb/read-throughs/2026-02-01/entries/2026-02-10", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "2026-02-15" }),
      });
      expect(res.status).toBe(200);
      const copy = await res.json();
      const rt = copy.read_throughs.find((r: { started_date: string }) => r.started_date.startsWith("2026-02-01"));
      const middleEntry = rt.page_log[1];
      expect(middleEntry.date).toContain("2026-02-15");
    });

    it("returns 404 for non-existent entry", async () => {
      const res = await api("/api/copies/dune-pb/read-throughs/2026-02-01/entries/2020-01-01", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 999 }),
      });
      expect(res.status).toBe(404);
    });

    it("returns 404 for non-existent read-through", async () => {
      const res = await api("/api/copies/dune-pb/read-throughs/2020-01-01/entries/2020-01-01", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 50 }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/copies/:slug/read-throughs/:startedDate/entries/:date", () => {
    beforeAll(async () => {
      await api("/api/copies/dune-pb/read-throughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ started_date: "2026-03-01" }),
      });
      await api("/api/copies/dune-pb/read-throughs/2026-03-01/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 100, date: "2026-03-05" }),
      });
      await api("/api/copies/dune-pb/read-throughs/2026-03-01/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 200, date: "2026-03-10" }),
      });
    });

    it("deletes a middle entry", async () => {
      const getBefore = await api("/api/copies/dune-pb");
      const before = await getBefore.json();
      const rtBefore = before.read_throughs.find((r: { started_date: string }) => r.started_date.startsWith("2026-03-01"));
      expect(rtBefore.page_log).toHaveLength(3);

      const res = await api("/api/copies/dune-pb/read-throughs/2026-03-01/entries/2026-03-05", {
        method: "DELETE",
      });
      expect(res.status).toBe(200);
      const copy = await res.json();
      const rt = copy.read_throughs.find((r: { started_date: string }) => r.started_date.startsWith("2026-03-01"));
      expect(rt.page_log).toHaveLength(2);
      expect(rt.page_log[0].page).toBe(0);
      expect(rt.page_log[1].page).toBe(200);
    });

    it("blocks deletion of baseline page: 0 entry", async () => {
      const entryDate = "2026-03-01";
      const res = await api(`/api/copies/dune-pb/read-throughs/2026-03-01/entries/${entryDate}`, {
        method: "DELETE",
      });
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent entry", async () => {
      const res = await api("/api/copies/dune-pb/read-throughs/2026-03-01/entries/2020-01-01", {
        method: "DELETE",
      });
      expect(res.status).toBe(404);
    });

    it("returns 404 for non-existent read-through", async () => {
      const res = await api("/api/copies/dune-pb/read-throughs/2020-01-01/entries/2020-01-01", {
        method: "DELETE",
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/copies/:slug/read-throughs/:startedDate", () => {
    beforeAll(async () => {
      await api("/api/copies/dune-pb/read-throughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ started_date: "2026-04-01" }),
      });
    });

    it("deletes an entire read-through", async () => {
      const getBefore = await api("/api/copies/dune-pb");
      const before = await getBefore.json();
      const countBefore = before.read_throughs.length;

      const res = await api("/api/copies/dune-pb/read-throughs/2026-04-01", {
        method: "DELETE",
      });
      expect(res.status).toBe(200);
      const copy = await res.json();
      expect(copy.read_throughs).toHaveLength(countBefore - 1);
      const stillExists = copy.read_throughs.find((r: { started_date: string }) => r.started_date.startsWith("2026-04-01"));
      expect(stillExists).toBeUndefined();
    });

    it("returns 404 for non-existent read-through", async () => {
      const res = await api("/api/copies/dune-pb/read-throughs/2020-01-01", {
        method: "DELETE",
      });
      expect(res.status).toBe(404);
    });
  });
});
