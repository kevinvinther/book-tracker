import { Router } from "express";
import { Index } from "../lib/index.js";
import { Copy, ReadThrough, PageLog } from "../lib/types.js";

function slugFromWikilink(wikilink: string | undefined, prefix: string): string | null {
  if (!wikilink) return null;
  const match = wikilink.match(new RegExp(`^\\[\\[${prefix}/(.+)\\]\\]$`));
  return match ? match[1] : null;
}

interface WorkMeta {
  slug: string;
  title: string;
  author: string;
}

interface CopyContext {
  work: WorkMeta | null;
  cover: string | null;
  pageCount: number | null;
}

function lastPage(rt: ReadThrough): number {
  return rt.page_log.length > 0 ? rt.page_log[rt.page_log.length - 1].page : 0;
}

function lastActivityDate(rt: ReadThrough): string {
  return rt.page_log.length > 0
    ? rt.page_log[rt.page_log.length - 1].date
    : rt.started_date;
}

export function createDashboardRouter(index: Index, _libraryPath: string): Router {
  const router = Router();

  function resolveCopyContext(copy: Copy): CopyContext {
    const editionSlug = slugFromWikilink(copy.edition, "editions");
    const edition = editionSlug ? index.getEdition(editionSlug) : undefined;

    const workSlug = slugFromWikilink(copy.work, "works");
    const work = workSlug ? index.getWork(workSlug) : undefined;

    let author = "";
    if (work) {
      const authorSlug = slugFromWikilink(work.authors[0], "authors");
      const authorEntity = authorSlug ? index.getAuthor(authorSlug) : undefined;
      author = authorEntity?.name ?? "";
    }

    return {
      work: work ? { slug: work.slug, title: work.title, author } : null,
      cover: copy.cover_image ?? work?.primary_cover ?? null,
      pageCount: edition?.page_count ?? null,
    };
  }

  router.get("/", (_req, res) => {
    const now = new Date();
    const yearPrefix = String(now.getFullYear());
    const monthPrefix = `${yearPrefix}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const currentlyReading: Array<{
      copy_slug: string;
      started_date: string;
      status: "reading" | "paused";
      page_log: PageLog[];
      last_page: number;
      page_count: number | null;
      work: WorkMeta | null;
      cover: string | null;
      _activity: string;
    }> = [];

    const recentlyFinished: Array<{
      copy_slug: string;
      finished_date: string;
      rating?: number;
      work: WorkMeta | null;
      cover: string | null;
    }> = [];

    const recentlyAdded: Array<{
      copy_slug: string;
      created_at: string;
      work: WorkMeta | null;
      cover: string | null;
    }> = [];

    let finishedThisYear = 0;
    let pagesThisMonth = 0;
    let currentlyReadingCount = 0;

    for (const copy of index.getAllCopies()) {
      const ctx = resolveCopyContext(copy);

      recentlyAdded.push({
        copy_slug: copy.slug,
        created_at: copy.created_at,
        work: ctx.work,
        cover: ctx.cover,
      });

      for (const rt of copy.read_throughs || []) {
        // Glance: pages read within the current calendar month, across all read-throughs.
        for (let i = 1; i < rt.page_log.length; i++) {
          if (rt.page_log[i].date.slice(0, 7) === monthPrefix) {
            pagesThisMonth += rt.page_log[i].page - rt.page_log[i - 1].page;
          }
        }

        if (rt.status === "reading" || rt.status === "paused") {
          if (rt.status === "reading") currentlyReadingCount++;
          currentlyReading.push({
            copy_slug: copy.slug,
            started_date: rt.started_date,
            status: rt.status,
            page_log: rt.page_log,
            last_page: lastPage(rt),
            page_count: ctx.pageCount,
            work: ctx.work,
            cover: ctx.cover,
            _activity: lastActivityDate(rt),
          });
        } else if (rt.status === "finished" && rt.finished_date) {
          if (rt.finished_date.slice(0, 4) === yearPrefix) finishedThisYear++;
          recentlyFinished.push({
            copy_slug: copy.slug,
            finished_date: rt.finished_date,
            ...(rt.rating != null ? { rating: rt.rating } : {}),
            work: ctx.work,
            cover: ctx.cover,
          });
        }
      }
    }

    // Currently reading: `reading` before `paused`; within each group, most
    // recent page-log activity (fallback started_date) first.
    currentlyReading.sort((a, b) => {
      if (a.status !== b.status) return a.status === "reading" ? -1 : 1;
      return b._activity.localeCompare(a._activity);
    });

    recentlyFinished.sort((a, b) => b.finished_date.localeCompare(a.finished_date));
    recentlyAdded.sort((a, b) => b.created_at.localeCompare(a.created_at));

    res.json({
      currently_reading: currentlyReading.map(({ _activity, ...entry }) => entry),
      recently_finished: recentlyFinished.slice(0, 6),
      recently_added: recentlyAdded.slice(0, 6),
      glance: {
        finished_this_year: finishedThisYear,
        pages_this_month: pagesThisMonth,
        currently_reading: currentlyReadingCount,
      },
    });
  });

  return router;
}
