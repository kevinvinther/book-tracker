import { Router, Request } from "express";
import { Index } from "../lib/index.js";
import { ReadThrough, PageLog, Copy, Work, Author, Note } from "../lib/types.js";

interface DateRange {
  from: string;
  to: string;
}

function extractSlug(wikilink: string | undefined, prefix: string): string | null {
  if (!wikilink) return null;
  const match = wikilink.match(new RegExp(`^\\[\\[${prefix}/(.+)\\]\\]$`));
  return match ? match[1] : null;
}

function parseDateInput(input: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return `${input}T00:00:00.000Z`;
  }
  if (/^\d{4}$/.test(input)) {
    return `${input}-01-01T00:00:00.000Z`;
  }
  return new Date(input).toISOString();
}

function parseDateRange(query: Request["query"]): DateRange | null {
  const year = typeof query.year === "string" ? query.year : undefined;
  const from = typeof query.from === "string" ? query.from : undefined;
  const to = typeof query.to === "string" ? query.to : undefined;

  if (year === "all") return null;

  if (year) {
    if (from || to) {
      throw { status: 400, message: "Cannot combine 'year' with 'from'/'to'" };
    }
    if (!/^\d{4}$/.test(year)) {
      throw { status: 400, message: "Invalid year format. Use YYYY." };
    }
    return {
      from: `${year}-01-01T00:00:00.000Z`,
      to: `${year}-12-31T23:59:59.999Z`,
    };
  }

  if (from || to) {
    if (!from || !to) {
      throw { status: 400, message: "Both 'from' and 'to' are required for custom date ranges" };
    }

    let fromDate: string;
    let toDate: string;
    try {
      fromDate = parseDateInput(from);
      toDate = parseDateInput(to);
    } catch {
      throw { status: 400, message: "Invalid date format. Use YYYY-MM-DD." };
    }

    if (fromDate > toDate) {
      throw { status: 400, message: "'from' must be on or before 'to'" };
    }

    return { from: fromDate, to: toDate };
  }

  return null;
}

function isReadThroughInRange(rt: ReadThrough, from: string, to: string): boolean {
  return rt.started_date <= to && (!rt.finished_date || rt.finished_date >= from);
}

function pagesReadInRange(rt: ReadThrough, from: string, to: string): number {
  let total = 0;
  for (let i = 1; i < rt.page_log.length; i++) {
    const entryDate = rt.page_log[i].date;
    if (entryDate >= from && entryDate <= to) {
      total += rt.page_log[i].page - rt.page_log[i - 1].page;
    }
  }
  return total;
}

function activeDaysInRange(rt: ReadThrough, from: string, to: string): number {
  const start = rt.started_date > from ? rt.started_date : from;
  const end = rt.finished_date && rt.finished_date < to ? rt.finished_date : to;
  const startDay = Math.floor(new Date(start).getTime() / 86400000);
  const endDay = Math.floor(new Date(end).getTime() / 86400000);
  return Math.max(0, endDay - startDay);
}

function isDateInRange(dateStr: string | undefined, from: string, to: string): boolean {
  if (!dateStr) return false;
  return dateStr >= from && dateStr <= to;
}

function monthLabel(iso: string): string {
  return iso.slice(0, 7);
}

export function createStatsRouter(index: Index, _libraryPath: string): Router {
  const router = Router();

  router.get("/", (req, res) => {
    try {
      const range = parseDateRange(req.query);
      const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 10);

      // ── Library snapshot ────────────────────────────────────────

      const total_works = index.getAllWorks().length;
      const total_editions = index.getAllEditions().length;
      const total_copies = index.getAllCopies().length;

      const copies_by_format: Record<string, number> = {};
      const copies_by_status: Record<string, number> = {};
      const copies_by_condition: Record<string, number> = {};

      for (const copy of index.getAllCopies()) {
        if (copy.format) {
          copies_by_format[copy.format] = (copies_by_format[copy.format] || 0) + 1;
        }
        copies_by_status[copy.status] = (copies_by_status[copy.status] || 0) + 1;
        if (copy.condition) {
          copies_by_condition[copy.condition] = (copies_by_condition[copy.condition] || 0) + 1;
        }
      }

      const works_by_genre: Record<string, number> = {};
      const works_by_language: Record<string, number> = {};
      const works_by_series: Record<string, number> = {};

      for (const work of index.getAllWorks()) {
        if (work.genres) {
          for (const genre of work.genres) {
            works_by_genre[genre] = (works_by_genre[genre] || 0) + 1;
          }
        }
        if (work.original_language) {
          works_by_language[work.original_language] =
            (works_by_language[work.original_language] || 0) + 1;
        }
        const seriesSlug = extractSlug(work.series, "series");
        if (seriesSlug) {
          works_by_series[seriesSlug] = (works_by_series[seriesSlug] || 0) + 1;
        }
      }

      // ── Reading stats ───────────────────────────────────────────

      let finished_count = 0;
      let currently_reading_count = 0;
      let total_pages_read = 0;
      let total_active_days = 0;
      const workRatings = new Map<string, { sum: number; count: number; title: string }>();
      let copies_acquired = 0;

      for (const copy of index.getAllCopies()) {
        const workSlug = extractSlug(copy.work, "works");
        const workTitle = workSlug ? index.getWork(workSlug)?.title || "" : "";

        if (range) {
          if (range.from === range.to) continue; // degenerate range, skip
        }

        for (const rt of copy.read_throughs || []) {
          if (rt.status === "reading") {
            currently_reading_count++;
          }

          if (range && isReadThroughInRange(rt, range.from, range.to)) {
            total_pages_read += pagesReadInRange(rt, range.from, range.to);
            total_active_days += activeDaysInRange(rt, range.from, range.to);
          }

          if (rt.rating !== undefined && rt.rating !== null) {
            if (workSlug) {
              const existing = workRatings.get(workSlug);
              if (existing) {
                existing.sum += rt.rating;
                existing.count++;
              } else {
                workRatings.set(workSlug, { sum: rt.rating, count: 1, title: workTitle });
              }
            }
          }

          if (
            rt.status === "finished" &&
            rt.finished_date &&
            (!range || (rt.finished_date >= range.from && rt.finished_date <= range.to))
          ) {
            finished_count++;
          }
        }

        if (!range || (copy.acquisition_date && isDateInRange(copy.acquisition_date, range.from, range.to))) {
          if (copy.acquisition_date !== undefined) {
            copies_acquired++;
          }
        }
      }

      const avg_pages_per_day =
        total_active_days > 0
          ? Math.round((total_pages_read / total_active_days) * 10) / 10
          : 0;

      const avg_rating_by_work = Array.from(workRatings.entries())
        .map(([slug, { sum, count, title }]) => ({
          slug,
          title,
          avg_rating: Math.round((sum / count) * 10) / 10,
          read_through_count: count,
        }))
        .sort((a, b) => b.avg_rating - a.avg_rating);

      const authorRatings = new Map<string, { sum: number; count: number; name: string }>();
      for (const [workSlug, { sum, count }] of workRatings) {
        const work = index.getWork(workSlug);
        if (!work) continue;
        for (const authorWikilink of work.authors) {
          const authorSlug = extractSlug(authorWikilink, "authors");
          if (!authorSlug) continue;
          const author = index.getAuthor(authorSlug);
          const existing = authorRatings.get(authorSlug);
          if (existing) {
            existing.sum += sum;
            existing.count += count;
          } else {
            authorRatings.set(authorSlug, {
              sum,
              count,
              name: author?.name || authorSlug,
            });
          }
        }
      }

      const avg_rating_by_author = Array.from(authorRatings.entries())
        .map(([slug, { sum, count, name }]) => ({
          slug,
          name,
          avg_rating: Math.round((sum / count) * 10) / 10,
          read_through_count: count,
        }))
        .sort((a, b) => b.avg_rating - a.avg_rating);

      // ── Note stats ──────────────────────────────────────────────

      const noteToWorkMap = new Map<string, Note[]>();

      for (const note of index.getAllNotes()) {
        const workSlug = extractSlug(note.work, "works");
        if (workSlug) {
          const list = noteToWorkMap.get(workSlug) || [];
          list.push(note);
          noteToWorkMap.set(workSlug, list);
        }
      }

      let total_notes = 0;
      const notes_per_month: Record<string, number> = {};

      for (const note of index.getAllNotes()) {
        if (!range || (note.date >= range.from && note.date <= range.to)) {
          total_notes++;
          const month = monthLabel(note.date);
          notes_per_month[month] = (notes_per_month[month] || 0) + 1;
        }
      }

      const most_annotated_works = Array.from(noteToWorkMap.entries())
        .map(([slug, notes]) => {
          const work = index.getWork(slug);
          return {
            slug,
            title: work?.title || "",
            note_count: notes.length,
          };
        })
        .sort((a, b) => b.note_count - a.note_count)
        .slice(0, limit);

      // ── Response ─────────────────────────────────────────────────

      const response: Record<string, unknown> = {
        library: {
          total_works,
          total_editions,
          total_copies,
          copies_by_format,
          copies_by_status,
          copies_by_condition,
          works_by_genre,
          works_by_language,
          works_by_series,
        },
        reading: {
          finished_count,
          currently_reading_count,
          total_pages_read,
          avg_pages_per_day,
          avg_rating_by_work,
          avg_rating_by_author,
          copies_acquired,
        },
        notes: {
          total_notes,
          notes_per_month,
          most_annotated_works,
        },
      };

      if (range) {
        response.range = {
          from: range.from.slice(0, 10),
          to: range.to.slice(0, 10),
        };
      }

      res.json(response);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "status" in err) {
        const e = err as { status: number; message: string };
        res.status(e.status).json({ error: e.message });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  return router;
}
