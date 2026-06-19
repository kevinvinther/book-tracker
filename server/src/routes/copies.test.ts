import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { Server } from "http";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import os from "os";

const tmpRoot = join(os.tmpdir(), `bt-copy-api-test-${Date.now()}`);

let server: Server;
let port: number;

beforeAll(async () => {
  mkdirSync(tmpRoot, { recursive: true });
  for (const dir of ["authors", "series", "works", "editions", "copies", "notes", "attachments", ".booktracker/cache"]) {
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

  // Pre-seeded copy for PATCH / DELETE / GET tests
  writeFile(join(tmpRoot, "copies/dune-ace-1990.md"), {
    type: "copy", slug: "dune-ace-1990",
    edition: "[[editions/dune-ace-1990]]",
    work: "[[works/dune]]",
    status: "owned",
    condition: "good",
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

describe("Copy API", () => {
  describe("POST /api/copies", () => {
    it("creates a copy with defaults", async () => {
      const res = await api("/api/copies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edition: "dune-ace-1990", work: "dune" }),
      });
      expect(res.status).toBe(201);
      const copy = await res.json();
      expect(copy.type).toBe("copy");
      expect(copy.edition).toBe("[[editions/dune-ace-1990]]");
      expect(copy.work).toBe("[[works/dune]]");
      expect(copy.status).toBe("owned");
      expect(copy.slug).toBeTruthy();
    });

    it("creates a copy with all optional fields", async () => {
      const res = await api("/api/copies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          edition: "dune-ace-1990",
          work: "dune",
          condition: "very good",
          location: "living room shelf",
          acquisition_source: "bookshop.org",
          acquisition_date: "2024-03-01",
          price_amount: 14.99,
          price_currency: "USD",
          status: "owned",
        }),
      });
      expect(res.status).toBe(201);
      const copy = await res.json();
      expect(copy.condition).toBe("very good");
      expect(copy.location).toBe("living room shelf");
      expect(copy.price_amount).toBe(14.99);
    });

    it("returns 400 when edition is missing", async () => {
      const res = await api("/api/copies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work: "dune" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when work is missing", async () => {
      const res = await api("/api/copies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edition: "dune-ace-1990" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when edition does not exist", async () => {
      const res = await api("/api/copies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edition: "nonexistent", work: "dune" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when work does not exist", async () => {
      const res = await api("/api/copies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edition: "dune-ace-1990", work: "nonexistent" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/copies", () => {
    it("returns all copies", async () => {
      const res = await api("/api/copies");
      expect(res.status).toBe(200);
      const copies = await res.json();
      expect(Array.isArray(copies)).toBe(true);
      expect(copies.length).toBeGreaterThanOrEqual(1);
    });

    it("filters by work", async () => {
      const res = await api("/api/copies?work=dune");
      expect(res.status).toBe(200);
      const copies = await res.json();
      expect(copies.length).toBeGreaterThanOrEqual(1);
      expect(copies.every((c: { work: string }) => c.work === "[[works/dune]]")).toBe(true);
    });

    it("filters by edition", async () => {
      const res = await api("/api/copies?edition=dune-ace-1990");
      expect(res.status).toBe(200);
      const copies = await res.json();
      expect(copies.length).toBeGreaterThanOrEqual(1);
      expect(copies.every((c: { edition: string }) => c.edition === "[[editions/dune-ace-1990]]")).toBe(true);
    });

    it("returns an empty array when the filter matches nothing", async () => {
      const res = await api("/api/copies?work=nonexistent");
      expect(res.status).toBe(200);
      const copies = await res.json();
      expect(copies).toEqual([]);
    });
  });

  describe("GET /api/copies/:slug", () => {
    it("returns copy with edition_meta and work_meta", async () => {
      const res = await api("/api/copies/dune-ace-1990");
      expect(res.status).toBe(200);
      const copy = await res.json();
      expect(copy.slug).toBe("dune-ace-1990");
      expect(copy.status).toBe("owned");
      expect(copy.edition_meta).toBeDefined();
      expect(copy.edition_meta.slug).toBe("dune-ace-1990");
      expect(copy.edition_meta.publisher).toBe("Ace Books");
      expect(copy.edition_meta.format).toBe("paperback");
      expect(copy.work_meta).toBeDefined();
      expect(copy.work_meta.slug).toBe("dune");
      expect(copy.work_meta.title).toBe("Dune");
    });

    it("returns 404 for non-existent copy", async () => {
      const res = await api("/api/copies/nonexistent");
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/copies/:slug", () => {
    it("updates mutable fields", async () => {
      const res = await api("/api/copies/dune-ace-1990", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition: "worn", location: "attic" }),
      });
      expect(res.status).toBe(200);
      const copy = await res.json();
      expect(copy.condition).toBe("worn");
      expect(copy.location).toBe("attic");
    });

    it("updates status", async () => {
      const res = await api("/api/copies/dune-ace-1990", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "lost" }),
      });
      expect(res.status).toBe(200);
      const copy = await res.json();
      expect(copy.status).toBe("lost");
    });

    it("ignores attempts to change edition, work, or slug", async () => {
      const res = await api("/api/copies/dune-ace-1990", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edition: "other", work: "other", slug: "hacked" }),
      });
      expect(res.status).toBe(200);
      const copy = await res.json();
      expect(copy.edition).toBe("[[editions/dune-ace-1990]]");
      expect(copy.work).toBe("[[works/dune]]");
      expect(copy.slug).toBe("dune-ace-1990");
    });

    it("returns 404 for non-existent copy", async () => {
      const res = await api("/api/copies/nonexistent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition: "good" }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/copies/:slug", () => {
    it("deletes a copy and removes it from the index", async () => {
      const create = await api("/api/copies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edition: "dune-ace-1990", work: "dune" }),
      });
      const { slug } = await create.json();

      const del = await api(`/api/copies/${slug}`, { method: "DELETE" });
      expect(del.status).toBe(200);

      expect(existsSync(join(tmpRoot, `copies/${slug}.md`))).toBe(false);

      const get = await api(`/api/copies/${slug}`);
      expect(get.status).toBe(404);
    });

    it("returns 404 for non-existent copy", async () => {
      const res = await api("/api/copies/nonexistent", { method: "DELETE" });
      expect(res.status).toBe(404);
    });
  });

  describe("Loan API", () => {
    async function createOwnedCopy(): Promise<string> {
      const res = await api("/api/copies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edition: "dune-ace-1990", work: "dune" }),
      });
      const { slug } = await res.json();
      return slug;
    }

    describe("POST /api/copies/:slug/loans", () => {
      it("creates a loan with required fields", async () => {
        const slug = await createOwnedCopy();
        const res = await api(`/api/copies/${slug}/loans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ borrower_name: "Sarah" }),
        });
        expect(res.status).toBe(201);
        const copy = await res.json();
        expect(copy.status).toBe("lent");
        expect(copy.loans).toHaveLength(1);
        expect(copy.loans[0].borrower_name).toBe("Sarah");
        expect(copy.loans[0].lent_date).toBeTruthy();
        expect(copy.loans[0].returned_date).toBeUndefined();
      });

      it("creates a loan with all fields", async () => {
        const slug = await createOwnedCopy();
        const res = await api(`/api/copies/${slug}/loans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            borrower_name: "Mike",
            lent_date: "2025-06-15",
            expected_return_date: "2025-07-15",
          }),
        });
        expect(res.status).toBe(201);
        const copy = await res.json();
        expect(copy.loans[0].borrower_name).toBe("Mike");
        expect(copy.loans[0].lent_date).toContain("2025-06-15");
        expect(copy.loans[0].expected_return_date).toBe("2025-07-15");
      });

      it("uses today as default lent_date", async () => {
        const slug = await createOwnedCopy();
        const res = await api(`/api/copies/${slug}/loans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ borrower_name: "Default" }),
        });
        expect(res.status).toBe(201);
        const copy = await res.json();
        const today = new Date().toISOString().slice(0, 10);
        expect(copy.loans[0].lent_date.slice(0, 10)).toBe(today);
      });

      it("returns 400 when borrower_name is missing", async () => {
        const slug = await createOwnedCopy();
        const res = await api(`/api/copies/${slug}/loans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        expect(res.status).toBe(400);
      });

      it("returns 400 when borrower_name is empty", async () => {
        const slug = await createOwnedCopy();
        const res = await api(`/api/copies/${slug}/loans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ borrower_name: "  " }),
        });
        expect(res.status).toBe(400);
      });

      it("returns 404 for non-existent copy", async () => {
        const res = await api("/api/copies/nonexistent/loans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ borrower_name: "Sarah" }),
        });
        expect(res.status).toBe(404);
      });

      it("returns 400 when copy is already lent", async () => {
        const slug = await createOwnedCopy();
        // Create first loan
        await api(`/api/copies/${slug}/loans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ borrower_name: "First" }),
        });
        // Try to create second loan
        const res = await api(`/api/copies/${slug}/loans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ borrower_name: "Second" }),
        });
        expect(res.status).toBe(400);
        expect(await res.json()).toHaveProperty("error");
      });

      it("returns 400 when copy has non-owned status", async () => {
        const slug = await createOwnedCopy();
        await api(`/api/copies/${slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "lost" }),
        });

        const res = await api(`/api/copies/${slug}/loans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ borrower_name: "Sarah" }),
        });
        expect(res.status).toBe(400);
      });
    });

    describe("POST auto-pause active read-through", () => {
      it("pauses active read-through when creating a loan", async () => {
        const slug = await createOwnedCopy();

        // Start a read-through
        await api(`/api/copies/${slug}/read-throughs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        // Create a loan — should auto-pause the read-through
        const res = await api(`/api/copies/${slug}/loans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ borrower_name: "Sarah" }),
        });
        expect(res.status).toBe(201);
        const copy = await res.json();
        expect(copy.status).toBe("lent");
        expect(copy.read_throughs[0].status).toBe("paused");
        expect(copy).toHaveProperty("warning");
        expect(copy.warning).toContain("Paused");
      });
    });

    describe("POST lent_date deduplication", () => {
      it("increments seconds when lent_date conflicts", async () => {
        const slug = await createOwnedCopy();

        // First loan on a specific date
        await api(`/api/copies/${slug}/loans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ borrower_name: "First", lent_date: "2025-01-01" }),
        });

        // Return it so we can create another
        const get1 = await api(`/api/copies/${slug}`);
        const copy1 = await get1.json();
        const lentDate1 = copy1.loans[0].lent_date;
        await api(`/api/copies/${slug}/loans/${copy1.loans[0].lent_date.slice(0, 10)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ returned_date: "2025-02-01" }),
        });

        // Second loan with same date
        const res = await api(`/api/copies/${slug}/loans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ borrower_name: "Second", lent_date: "2025-01-01" }),
        });
        expect(res.status).toBe(201);
        const copy2 = await res.json();
        const secondLoan = copy2.loans.find((l: { borrower_name: string }) => l.borrower_name === "Second");
        expect(secondLoan.lent_date).not.toBe(lentDate1);
      });
    });

    describe("PATCH /api/copies/:slug/loans/:lentDate", () => {
      async function createLentCopy(borrower = "Sarah"): Promise<{ slug: string; lentDate: string }> {
        const slug = await createOwnedCopy();
        const res = await api(`/api/copies/${slug}/loans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ borrower_name: borrower, lent_date: "2025-06-01" }),
        });
        const copy = await res.json();
        return { slug, lentDate: copy.loans[0].lent_date.slice(0, 10) };
      }

      it("sets returned_date and recalculates status to owned", async () => {
        const { slug, lentDate } = await createLentCopy();
        const res = await api(`/api/copies/${slug}/loans/${lentDate}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ returned_date: "2025-08-01" }),
        });
        expect(res.status).toBe(200);
        const updated = await res.json();
        expect(updated.status).toBe("owned");
        expect(updated.loans[0].returned_date).toContain("2025-08-01");
      });

      it("clears returned_date and recalculates status to lent", async () => {
        const { slug, lentDate } = await createLentCopy();
        // Return first
        await api(`/api/copies/${slug}/loans/${lentDate}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ returned_date: "2025-08-01" }),
        });
        // Clear returned_date
        const res = await api(`/api/copies/${slug}/loans/${lentDate}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ returned_date: null }),
        });
        expect(res.status).toBe(200);
        const updated = await res.json();
        expect(updated.status).toBe("lent");
      });

      it("edits borrower_name", async () => {
        const { slug, lentDate } = await createLentCopy();
        const res = await api(`/api/copies/${slug}/loans/${lentDate}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ borrower_name: "Sarah Connor" }),
        });
        expect(res.status).toBe(200);
        const updated = await res.json();
        expect(updated.loans[0].borrower_name).toBe("Sarah Connor");
      });

      it("rejects conflicting lent_date", async () => {
        const slug = await createOwnedCopy();
        // Create first loan
        const r1 = await api(`/api/copies/${slug}/loans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ borrower_name: "First", lent_date: "2025-09-01" }),
        });
        const c1 = await r1.json();
        expect(r1.status).toBe(201);
        // Return first loan
        await api(`/api/copies/${slug}/loans/${c1.loans[0].lent_date.slice(0, 10)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ returned_date: "2025-10-01" }),
        });
        // Create second loan with different date
        await api(`/api/copies/${slug}/loans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ borrower_name: "Second", lent_date: "2025-09-15" }),
        });
        // Try to change second loan's lent_date to conflict with first
        const res = await api(`/api/copies/${slug}/loans/2025-09-15`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lent_date: c1.loans[0].lent_date.slice(0, 10) }),
        });
        expect(res.status).toBe(400);
      });

      it("returns 404 for non-existent loan", async () => {
        const slug = await createOwnedCopy();
        const res = await api(`/api/copies/${slug}/loans/2099-01-01`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ borrower_name: "Nope" }),
        });
        expect(res.status).toBe(404);
      });

      it("rejects expected_return_date before lent_date", async () => {
        const { slug, lentDate } = await createLentCopy();
        const res = await api(`/api/copies/${slug}/loans/${lentDate}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expected_return_date: "2025-01-01" }),
        });
        expect(res.status).toBe(400);
      });
    });

    describe("DELETE /api/copies/:slug/loans/:lentDate", () => {
      it("deletes an outstanding loan and recalculates status to owned", async () => {
        const slug = await createOwnedCopy();
        await api(`/api/copies/${slug}/loans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ borrower_name: "ToDelete", lent_date: "2025-11-01" }),
        });

        const res = await api(`/api/copies/${slug}/loans/2025-11-01`, {
          method: "DELETE",
        });
        expect(res.status).toBe(200);
        const updated = await res.json();
        expect(updated.status).toBe("owned");
        expect(updated.loans.every((l: { borrower_name: string }) => l.borrower_name !== "ToDelete")).toBe(true);
      });

      it("returns 404 for non-existent loan", async () => {
        const slug = await createOwnedCopy();
        const res = await api(`/api/copies/${slug}/loans/2099-01-01`, {
          method: "DELETE",
        });
        expect(res.status).toBe(404);
      });
    });

    describe("PATCH /api/copies/:slug status restrictions", () => {
      it("rejects status owned when outstanding loans exist", async () => {
        const slug = await createOwnedCopy();
        await api(`/api/copies/${slug}/loans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ borrower_name: "Test" }),
        });

        const res = await api(`/api/copies/${slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "owned" }),
        });
        expect(res.status).toBe(400);
      });

      it("rejects status lent via manual PATCH", async () => {
        const slug = await createOwnedCopy();
        const res = await api(`/api/copies/${slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "lent" }),
        });
        expect(res.status).toBe(400);
      });

      it("accepts status lost regardless of loans", async () => {
        const slug = await createOwnedCopy();
        const res = await api(`/api/copies/${slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "lost" }),
        });
        expect(res.status).toBe(200);
      });
    });
  });
});
