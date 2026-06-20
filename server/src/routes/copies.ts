import { Router } from "express";
import { Index } from "../lib/index.js";
import { Copy, Loan, ReadThrough, PageLog } from "../lib/types.js";
import { readFile, writeFile, deleteFile, resolveLibraryPath } from "../lib/io.js";
import { generateSlug } from "../lib/slug.js";
import { renderBody } from "../lib/render-body.js";

const MUTABLE_FIELDS = [
  "condition", "location", "cover_image", "release_date",
  "acquisition_date", "acquisition_source", "price_amount", "price_currency", "status",
  "aliases",
] as const;

const VALID_STATUSES = new Set(["owned", "lent", "lost", "given-away", "sold"]);
const READ_THROUGH_STATUSES = new Set(["reading", "finished", "dnf", "paused"]);
const TRANSITION_TARGETS = new Set(["finished", "dnf", "paused", "resumed"]);

function getAllSlugs(index: Index): Set<string> {
  const slugs = new Set<string>();
  for (const w of index.getAllWorks()) slugs.add(w.slug);
  for (const a of index.getAllAuthors()) slugs.add(a.slug);
  for (const e of index.getAllEditions()) slugs.add(e.slug);
  for (const c of index.getAllCopies()) slugs.add(c.slug);
  for (const s of index.getAllSeries()) slugs.add(s.slug);
  for (const slug of index.getAllNoteSlugs()) slugs.add(slug);
  return slugs;
}

function slugFromWikilink(wikilink: string): string | null {
  const match = wikilink.match(/^\[\[(?:editions|works)\/(.+)\]\]$/);
  return match ? match[1] : null;
}

function toDatePart(isoString: string): string {
  return isoString.slice(0, 10);
}

function dateParamToISO(dateParam: string): string {
  return `${dateParam}T00:00:00.000Z`;
}

function stripTime(d: string): string {
  return d.slice(0, 10);
}

function validateMonotonicity(pageLog: PageLog[]): string | null {
  for (let i = 1; i < pageLog.length; i++) {
    if (pageLog[i].page < pageLog[i - 1].page) {
      return `Page log is not monotonic: page ${pageLog[i].page} at position ${i} is less than previous page ${pageLog[i - 1].page}`;
    }
  }
  return null;
}

function readAndWriteCopy(
  slug: string,
  index: Index,
  libraryPath: string,
  mutate: (copy: Copy) => void,
): Copy {
  const existing = index.getCopy(slug);
  if (!existing) throw { status: 404, message: "Copy not found" };

  const filePath = resolveLibraryPath(`copies/${existing.slug}.md`, libraryPath);

  // Read the canonical file from disk (Obsidian is the alternate editor — §7.4).
  const { frontmatter } = readFile(filePath);
  const copy = frontmatter as unknown as Copy;

  // On some filesystems (Docker overlay2, some network mounts) writes may not be
  // immediately visible to a subsequent readFileSync. The index is always coherent
  // because we update it after every write. For fields managed by this route
  // (read_throughs, loans), prefer the index version to avoid losing our mutations.
  if (existing.read_throughs && existing.read_throughs.length > 0) {
    copy.read_throughs = existing.read_throughs;
  } else if (!copy.read_throughs) {
    copy.read_throughs = [];
  }

  if (existing.loans && existing.loans.length > 0) {
    copy.loans = existing.loans;
  } else if (!copy.loans) {
    copy.loans = [];
  }

  mutate(copy);

  writeFile(filePath, copy as unknown as Record<string, unknown>, renderBody(copy, index));
  index.upsert("copy", copy);

  return copy;
}

function findReadThrough(copy: Copy, startedDate: string, preferStatus?: string): { index: number; rt: ReadThrough } | null {
  if (!copy.read_throughs) return null;

  // Find all matching entries (same date part)
  const matches: { index: number; rt: ReadThrough }[] = [];
  for (let i = 0; i < copy.read_throughs.length; i++) {
    if (toDatePart(copy.read_throughs[i].started_date) === startedDate) {
      matches.push({ index: i, rt: copy.read_throughs[i] });
    }
  }
  if (matches.length === 0) return null;

  // If a preferred status is specified, try that first
  if (preferStatus) {
    const preferred = matches.find((m) => m.rt.status === preferStatus);
    if (preferred) return preferred;
  }

  // Otherwise return the most recent (last) match
  return matches[matches.length - 1];
}

function autoPauseActive(copy: Copy): string | null {
  if (!copy.read_throughs) return null;
  const active = copy.read_throughs.find((rt) => rt.status === "reading");
  if (active) {
    active.status = "paused";
    return toDatePart(active.started_date);
  }
  return null;
}

function findLoan(copy: Copy, lentDate: string): { index: number; loan: Loan } | null {
  if (!copy.loans) return null;

  // Try exact lent_date match first (full ISO string)
  for (let i = 0; i < copy.loans.length; i++) {
    if (copy.loans[i].lent_date === lentDate) {
      return { index: i, loan: copy.loans[i] };
    }
  }

  // Fall back to date-part matching
  const matches: { index: number; loan: Loan }[] = [];
  for (let i = 0; i < copy.loans.length; i++) {
    if (toDatePart(copy.loans[i].lent_date) === lentDate) {
      matches.push({ index: i, loan: copy.loans[i] });
    }
  }
  if (matches.length === 0) return null;

  return matches[matches.length - 1];
}

function recalcCopyStatus(copy: Copy): void {
  if (copy.loans && copy.loans.some((l) => !l.returned_date)) {
    copy.status = "lent";
  } else {
    copy.status = "owned";
  }
}

export function createCopiesRouter(index: Index, libraryPath: string): Router {
  const router = Router();

  router.post("/", (req, res) => {
    const { edition, work } = req.body;

    if (!edition || typeof edition !== "string" || !edition.trim()) {
      res.status(400).json({ error: "edition is required" });
      return;
    }
    if (!work || typeof work !== "string" || !work.trim()) {
      res.status(400).json({ error: "work is required" });
      return;
    }

    const editionSlug = edition.trim();
    const workSlug = work.trim();

    if (!index.getEdition(editionSlug)) {
      res.status(400).json({ error: `Edition '${editionSlug}' does not exist` });
      return;
    }
    if (!index.getWork(workSlug)) {
      res.status(400).json({ error: `Work '${workSlug}' does not exist` });
      return;
    }

    const slug = generateSlug(editionSlug, getAllSlugs(index));

    const status = req.body.status && VALID_STATUSES.has(req.body.status)
      ? req.body.status
      : "owned";

    const copy: Copy = {
      type: "copy",
      slug,
      edition: `[[editions/${editionSlug}]]`,
      work: `[[works/${workSlug}]]`,
      status,
      created_at: new Date().toISOString(),
      _schema: 1,
    };

    if (req.body.cover_image !== undefined) copy.cover_image = req.body.cover_image;
    if (req.body.release_date !== undefined) copy.release_date = req.body.release_date;
    if (req.body.condition !== undefined) copy.condition = req.body.condition;
    if (req.body.acquisition_date !== undefined) copy.acquisition_date = req.body.acquisition_date;
    if (req.body.acquisition_source !== undefined) copy.acquisition_source = req.body.acquisition_source;
    if (req.body.price_amount !== undefined) copy.price_amount = Number(req.body.price_amount);
    if (req.body.price_currency !== undefined) copy.price_currency = req.body.price_currency;
    if (req.body.location !== undefined) copy.location = req.body.location;
    if (Array.isArray(req.body.aliases)) copy.aliases = req.body.aliases;

    const filePath = resolveLibraryPath(`copies/${slug}.md`, libraryPath);
    writeFile(filePath, copy as unknown as Record<string, unknown>, renderBody(copy, index));
    index.upsert("copy", copy);

    res.status(201).json(copy);
  });

  router.get("/", (req, res) => {
    if (req.query.work) {
      res.json(index.getCopiesByWork(req.query.work as string));
    } else if (req.query.edition) {
      res.json(index.getCopiesByEdition(req.query.edition as string));
    } else {
      res.json(index.getAllCopies());
    }
  });

  router.get("/:slug", (req, res) => {
    const copy = index.getCopy(req.params.slug);
    if (!copy) {
      res.status(404).json({ error: "Copy not found" });
      return;
    }

    const editionSlug = slugFromWikilink(copy.edition);
    const workSlug = slugFromWikilink(copy.work);

    const edition = editionSlug ? index.getEdition(editionSlug) : undefined;
    const work = workSlug ? index.getWork(workSlug) : undefined;

    const edition_meta = edition
      ? { slug: edition.slug, publisher: edition.publisher, format: edition.format, page_count: edition.page_count, isbn: edition.isbn }
      : null;

    const work_meta = work
      ? { slug: work.slug, title: work.title, authors: work.authors }
      : null;

    res.json({ ...copy, edition_meta, work_meta, body: renderBody(copy, index) });
  });

  router.patch("/:slug", (req, res) => {
    const existing = index.getCopy(req.params.slug);
    if (!existing) {
      res.status(404).json({ error: "Copy not found" });
      return;
    }

    const filePath = resolveLibraryPath(`copies/${existing.slug}.md`, libraryPath);
    const { frontmatter } = readFile(filePath);

    for (const field of MUTABLE_FIELDS) {
      if (req.body[field] !== undefined) {
        frontmatter[field] = req.body[field];
      }
    }

    // Preserve index arrays to avoid losing data on filesystems with
    // delayed write visibility (Docker overlay2).
    if (existing.read_throughs && existing.read_throughs.length > 0) {
      frontmatter.read_throughs = existing.read_throughs;
    }
    if (existing.loans && existing.loans.length > 0) {
      frontmatter.loans = existing.loans;
    }

    // Validate status against loan state
    const requestedStatus = frontmatter.status;
    const loans = (frontmatter.loans as Loan[] | undefined) || [];
    if (requestedStatus === "lent") {
      res.status(400).json({ error: "Cannot set status to 'lent' manually; use the loan flow instead" });
      return;
    }
    if (requestedStatus === "owned" && loans.some((l: Loan) => !l.returned_date)) {
      res.status(400).json({ error: "Cannot set status to 'owned' while there are outstanding loans" });
      return;
    }

    frontmatter.slug = existing.slug;
    frontmatter.type = "copy";
    frontmatter.edition = existing.edition;
    frontmatter.work = existing.work;
    frontmatter.created_at = existing.created_at;
    frontmatter._schema = 1;

    const updated = frontmatter as unknown as Copy;
    writeFile(filePath, frontmatter, renderBody(updated, index));
    index.upsert("copy", updated);

    res.json(updated);
  });

  router.delete("/:slug", (req, res) => {
    const copy = index.getCopy(req.params.slug);
    if (!copy) {
      res.status(404).json({ error: "Copy not found" });
      return;
    }

    deleteFile(resolveLibraryPath(`copies/${copy.slug}.md`, libraryPath));
    index.remove("copy", copy.slug);

    res.json({ message: "Copy deleted", slug: copy.slug });
  });

  // ── Read-through routes ────────────────────────────────────────

  router.post("/:slug/read-throughs", (req, res) => {
    try {
      const copy = readAndWriteCopy(req.params.slug, index, libraryPath, (c) => {
        if (c.status === "lent") {
          throw { status: 400, message: "Cannot start a read-through on a lent copy" };
        }

        const today = new Date().toISOString();
        const startedDateParam = req.body.started_date || stripTime(today);
        const desiredDate = dateParamToISO(startedDateParam);

        // Ensure unique started_date per copy — the API identifies read-throughs by
        // started_date in the URL path, so duplicates would cause findReadThrough
        // to pick the wrong one.
        let startedDate = desiredDate;
        let suffix = 1;
        while (c.read_throughs!.some((rt) => rt.started_date === startedDate)) {
          startedDate = new Date(Date.parse(desiredDate) + suffix * 1000).toISOString();
          suffix++;
        }

        const responseObj: Record<string, unknown> = {};

        const paused = autoPauseActive(c);
        if (paused) {
          responseObj.warning = `Paused existing active read-through started on ${paused}`;
        }

        const rt: ReadThrough = {
          started_date: startedDate,
          status: "reading",
          page_log: [{ date: startedDate, page: 0 }],
        };

        c.read_throughs!.push(rt);

        (c as unknown as Record<string, unknown>)._response = responseObj;
      });

      const responseObj = (copy as unknown as Record<string, unknown>)._response as Record<string, unknown> | undefined;
      delete (copy as unknown as Record<string, unknown>)._response;

      if (responseObj && Object.keys(responseObj).length > 0) {
        res.status(201).json({ ...copy, ...responseObj });
      } else {
        res.status(201).json(copy);
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && "status" in err) {
        const e = err as { status: number; message: string };
        res.status(e.status).json({ error: e.message });
      } else {
        res.status(404).json({ error: "Copy not found" });
      }
    }
  });

  router.post("/:slug/read-throughs/:startedDate/log", (req, res) => {
    try {
      const startedDate = req.params.startedDate;
      const { page } = req.body;

      if (page === undefined || typeof page !== "number") {
        res.status(400).json({ error: "page is required and must be a number" });
        return;
      }

      const copy = readAndWriteCopy(req.params.slug, index, libraryPath, (c) => {
        const found = findReadThrough(c, startedDate, "reading");
        if (!found) {
          throw { status: 404, message: `No read-through found for started_date ${startedDate}` };
        }

        const { rt } = found;

        if (rt.status !== "reading") {
          throw { status: 400, message: "Cannot log pages on a non-active read-through" };
        }

        const lastEntry = rt.page_log[rt.page_log.length - 1];
        if (page < lastEntry.page) {
          throw { status: 400, message: `Page ${page} is less than last logged page ${lastEntry.page}` };
        }

        const editionSlug = slugFromWikilink(c.edition);
        const edition = editionSlug ? index.getEdition(editionSlug) : undefined;
        const responseObj: Record<string, unknown> = {};

        if (edition?.page_count !== undefined) {
          if (page > edition.page_count) {
            throw { status: 400, message: `Page ${page} exceeds edition page count of ${edition.page_count}` };
          }
          if (page === edition.page_count) {
            responseObj.finished = true;
          }
        } else {
          responseObj.warning = "Edition has no page_count set — cannot validate upper bound";
        }

        const logDate = req.body.date ? dateParamToISO(req.body.date) : new Date().toISOString();
        rt.page_log.push({ date: logDate, page });

        (c as unknown as Record<string, unknown>)._response = responseObj;
      });

      const responseObj = (copy as unknown as Record<string, unknown>)._response as Record<string, unknown> | undefined;
      delete (copy as unknown as Record<string, unknown>)._response;

      res.json({ ...copy, ...responseObj });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "status" in err) {
        const e = err as { status: number; message: string };
        res.status(e.status).json({ error: e.message });
      } else {
        res.status(404).json({ error: "Copy not found" });
      }
    }
  });

  router.patch("/:slug/read-throughs/:startedDate", (req, res) => {
    try {
      const startedDate = req.params.startedDate;
      const { status, rating, finished_date, page } = req.body;

      if (!status || !TRANSITION_TARGETS.has(status)) {
        res.status(400).json({ error: `status must be one of: ${Array.from(TRANSITION_TARGETS).join(", ")}` });
        return;
      }

      if (rating !== undefined && (typeof rating !== "number" || rating < 0 || rating > 10)) {
        res.status(400).json({ error: "rating must be a number between 0 and 10" });
        return;
      }

      const preferStatus = status === "resumed" ? "paused" : "reading";

      const copy = readAndWriteCopy(req.params.slug, index, libraryPath, (c) => {
        const found = findReadThrough(c, startedDate, preferStatus);
        if (!found) {
          throw { status: 404, message: `No read-through found for started_date ${startedDate}` };
        }

        const { rt } = found;
        const finishedDate = finished_date ? dateParamToISO(finished_date) : new Date().toISOString();
        const responseObj: Record<string, unknown> = {};

        const editionSlug = slugFromWikilink(c.edition);
        const edition = editionSlug ? index.getEdition(editionSlug) : undefined;

        switch (status) {
          case "finished": {
            if (rt.status !== "finished" && edition?.page_count !== undefined) {
              const lastPage = rt.page_log[rt.page_log.length - 1]?.page;
              if (lastPage !== edition.page_count) {
                rt.page_log.push({ date: finishedDate, page: edition.page_count });
              }
            }
            rt.status = "finished";
            rt.finished_date = finishedDate;
            if (rating !== undefined) rt.rating = rating;
            break;
          }
          case "dnf": {
            rt.status = "dnf";
            rt.finished_date = finishedDate;
            if (page !== undefined) {
              rt.page_log.push({ date: finishedDate, page: Number(page) });
            }
            break;
          }
          case "paused": {
            rt.status = "paused";
            break;
          }
          case "resumed": {
            const paused = autoPauseActive(c);
            if (paused) {
              responseObj.warning = `Paused existing active read-through started on ${paused}`;
            }
            rt.status = "reading";
            break;
          }
        }

        (c as unknown as Record<string, unknown>)._response = responseObj;
      });

      const responseObj = (copy as unknown as Record<string, unknown>)._response as Record<string, unknown> | undefined;
      delete (copy as unknown as Record<string, unknown>)._response;

      res.json({ ...copy, ...responseObj });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "status" in err) {
        const e = err as { status: number; message: string };
        res.status(e.status).json({ error: e.message });
      } else {
        res.status(404).json({ error: "Copy not found" });
      }
    }
  });

  router.patch("/:slug/read-throughs/:startedDate/entries/:date", (req, res) => {
    try {
      const startedDate = req.params.startedDate;
      const entryDate = req.params.date;

      const copy = readAndWriteCopy(req.params.slug, index, libraryPath, (c) => {
        const found = findReadThrough(c, startedDate, "reading");
        if (!found) {
          throw { status: 404, message: `No read-through found for started_date ${startedDate}` };
        }

        const { rt } = found;
        const entryIdx = rt.page_log.findIndex((e) => toDatePart(e.date) === entryDate);
        if (entryIdx === -1) {
          throw { status: 404, message: `No page log entry found for date ${entryDate}` };
        }

        if (req.body.date !== undefined) {
          rt.page_log[entryIdx].date = dateParamToISO(req.body.date);
        }
        if (req.body.page !== undefined) {
          rt.page_log[entryIdx].page = Number(req.body.page);
        }

        rt.page_log.sort((a, b) => a.date.localeCompare(b.date));

        const monoErr = validateMonotonicity(rt.page_log);
        if (monoErr) {
          throw { status: 400, message: monoErr };
        }
      });

      res.json(copy);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "status" in err) {
        const e = err as { status: number; message: string };
        res.status(e.status).json({ error: e.message });
      } else {
        res.status(404).json({ error: "Copy not found" });
      }
    }
  });

  router.delete("/:slug/read-throughs/:startedDate/entries/:date", (req, res) => {
    try {
      const startedDate = req.params.startedDate;
      const entryDate = req.params.date;

      const copy = readAndWriteCopy(req.params.slug, index, libraryPath, (c) => {
        const found = findReadThrough(c, startedDate, "reading");
        if (!found) {
          throw { status: 404, message: `No read-through found for started_date ${startedDate}` };
        }

        const { rt } = found;
        const entryIdx = rt.page_log.findIndex((e) => toDatePart(e.date) === entryDate);
        if (entryIdx === -1) {
          throw { status: 404, message: `No page log entry found for date ${entryDate}` };
        }

        if (entryIdx === 0 && rt.page_log[0].page === 0) {
          throw { status: 400, message: "Cannot delete the baseline page log entry" };
        }

        rt.page_log.splice(entryIdx, 1);

        const monoErr = validateMonotonicity(rt.page_log);
        if (monoErr) {
          throw { status: 400, message: monoErr };
        }
      });

      res.json(copy);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "status" in err) {
        const e = err as { status: number; message: string };
        res.status(e.status).json({ error: e.message });
      } else {
        res.status(404).json({ error: "Copy not found" });
      }
    }
  });

  router.delete("/:slug/read-throughs/:startedDate", (req, res) => {
    try {
      const startedDate = req.params.startedDate;

      const copy = readAndWriteCopy(req.params.slug, index, libraryPath, (c) => {
        const found = findReadThrough(c, startedDate);
        if (!found) {
          throw { status: 404, message: `No read-through found for started_date ${startedDate}` };
        }
        c.read_throughs!.splice(found.index, 1);
      });

      res.json(copy);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "status" in err) {
        const e = err as { status: number; message: string };
        res.status(e.status).json({ error: e.message });
      } else {
        res.status(404).json({ error: "Copy not found" });
      }
    }
  });
 
  // ── Loan routes ─────────────────────────────────────────────────
 
  router.post("/:slug/loans", (req, res) => {
    const { borrower_name, lent_date, expected_return_date } = req.body;
 
    if (!borrower_name || typeof borrower_name !== "string" || !borrower_name.trim()) {
      res.status(400).json({ error: "borrower_name is required" });
      return;
    }
 
    const trimmedBorrower = borrower_name.trim();
 
    if (expected_return_date !== undefined && typeof expected_return_date !== "string") {
      res.status(400).json({ error: "expected_return_date must be a date string" });
      return;
    }
 
    try {
      const copy = readAndWriteCopy(req.params.slug, index, libraryPath, (c) => {
        if (c.status !== "owned") {
          throw { status: 400, message: `Cannot lend a copy with status '${c.status}'` };
        }
 
        if (c.loans && c.loans.some((l) => !l.returned_date)) {
          throw { status: 400, message: "This copy already has an outstanding loan" };
        }
 
        const today = new Date().toISOString();
        const desiredDate = lent_date ? dateParamToISO(lent_date) : today;
 
        let lentDate = desiredDate;
        let suffix = 1;
        while (c.loans!.some((l) => l.lent_date === lentDate)) {
          lentDate = new Date(Date.parse(desiredDate) + suffix * 1000).toISOString();
          suffix++;
        }
 
        const responseObj: Record<string, unknown> = {};
 
        const paused = autoPauseActive(c);
        if (paused) {
          responseObj.warning = `Paused existing active read-through started on ${paused}`;
        }
 
        if (expected_return_date && expected_return_date < toDatePart(lentDate)) {
          throw { status: 400, message: "expected_return_date must be on or after lent_date" };
        }
 
        const loan: Loan = {
          borrower_name: trimmedBorrower,
          lent_date: lentDate,
        };
        if (expected_return_date) loan.expected_return_date = expected_return_date;
 
        c.loans!.push(loan);
        c.status = "lent";
 
        (c as unknown as Record<string, unknown>)._response = responseObj;
      });
 
      const responseObj = (copy as unknown as Record<string, unknown>)._response as Record<string, unknown> | undefined;
      delete (copy as unknown as Record<string, unknown>)._response;
 
      if (responseObj && Object.keys(responseObj).length > 0) {
        res.status(201).json({ ...copy, ...responseObj });
      } else {
        res.status(201).json(copy);
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && "status" in err) {
        const e = err as { status: number; message: string };
        res.status(e.status).json({ error: e.message });
      } else {
        res.status(404).json({ error: "Copy not found" });
      }
    }
  });
 
  router.patch("/:slug/loans/:lentDate", (req, res) => {
    const lentDate = req.params.lentDate;
    const { borrower_name, lent_date, expected_return_date, returned_date } = req.body;
 
    try {
      const copy = readAndWriteCopy(req.params.slug, index, libraryPath, (c) => {
        const found = findLoan(c, lentDate);
        if (!found) {
          throw { status: 404, message: `No loan found for lent_date ${lentDate}` };
        }
 
        const { loan } = found;
 
        if (borrower_name !== undefined) {
          if (!borrower_name || typeof borrower_name !== "string" || !borrower_name.trim()) {
            throw { status: 400, message: "borrower_name must be a non-empty string" };
          }
          loan.borrower_name = borrower_name.trim();
        }
 
        if (lent_date !== undefined) {
          const newLentDate = dateParamToISO(lent_date);
          if (c.loans!.some((l, i) => i !== found.index && l.lent_date === newLentDate)) {
            throw { status: 400, message: "A loan with this lent_date already exists on this copy" };
          }
          loan.lent_date = newLentDate;
        }
 
        if (expected_return_date !== undefined) {
          const effectiveLentDate = toDatePart(loan.lent_date);
          if (expected_return_date < effectiveLentDate) {
            throw { status: 400, message: "expected_return_date must be on or after lent_date" };
          }
          loan.expected_return_date = expected_return_date;
        } else if (expected_return_date === null) {
          delete loan.expected_return_date;
        }
 
        if (returned_date !== undefined) {
          if (returned_date === null) {
            loan.returned_date = null;
          } else {
            loan.returned_date = dateParamToISO(returned_date);
          }
        }
 
        recalcCopyStatus(c);
      });
 
      res.json(copy);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "status" in err) {
        const e = err as { status: number; message: string };
        res.status(e.status).json({ error: e.message });
      } else {
        res.status(404).json({ error: "Copy not found" });
      }
    }
  });
 
  router.delete("/:slug/loans/:lentDate", (req, res) => {
    const lentDate = req.params.lentDate;
 
    try {
      const copy = readAndWriteCopy(req.params.slug, index, libraryPath, (c) => {
        const found = findLoan(c, lentDate);
        if (!found) {
          throw { status: 404, message: `No loan found for lent_date ${lentDate}` };
        }
        c.loans!.splice(found.index, 1);
        recalcCopyStatus(c);
      });
 
      res.json(copy);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "status" in err) {
        const e = err as { status: number; message: string };
        res.status(e.status).json({ error: e.message });
      } else {
        res.status(404).json({ error: "Copy not found" });
      }
    }
  });
 
  return router;
}
