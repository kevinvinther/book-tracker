## Context

The home route `/` renders `WorkGrid`, a grid of every Work fetched from `GET /api/works`. Reading activity lives elsewhere: read-throughs are stored on **copies** (`copy.read_throughs[]`), each with a `status` (`reading`/`finished`/`dnf`/`paused`), a `page_log[]`, `started_date`, optional `finished_date`, and optional `rating`. Progress is `lastPage / edition.page_count`. The `Index` class (`server/src/lib/index.ts`) holds all entities in memory and offers cross-entity lookups (`getAllCopies`, `getEdition`, `getWork`, `getAuthor`). No existing endpoint lists currently-reading copies, recently-finished read-throughs, or recently-added copies — `GET /api/works` returns works, not copies.

The frontend already has reusable building blocks: `LogPageForm` (POSTs a page to `/api/copies/:slug/read-throughs/:startedDate/log`), `NoteEditorModal` (creates a note against a copy, auto-prefilling the active read-through and context page), `FinishModal` (the finish flow), `CoverImage`, and `useRefetchOnChange` (re-fetch on file-watcher WebSocket events).

## Goals / Non-Goals

**Goals:**
- Make `/` a personal reading dashboard with currently-reading as the centerpiece.
- Let the user log a page, jot a note, and finish a book without leaving the dashboard, by reusing existing components.
- Move the library grid to `/library` with the navigation updated so it stays one click away.
- Add one server endpoint that does the cross-entity assembly in a single index pass.

**Non-Goals:**
- Reading streaks (deferred — needs careful per-day activity logic).
- On-loan/overdue and recent-notes sections (their own surfaces; deferred).
- Any change to how read-throughs, notes, or copies are stored. No schema or migration.
- Redesigning the copy detail page's logging UI.

## Decisions

### One `GET /api/dashboard` endpoint, glance folded in
The server assembles everything in a single pass over `index.getAllCopies()`, joining each read-through to its copy → edition (for `page_count`) → work (title) → author → cover. The alternative — assembling client-side from several calls — is rejected because the needed lists aren't queryable today and the joins are exactly what the in-memory index does well. The "glance" numbers are computed in the same pass rather than via `/api/stats`, because "finished this year" and "pages this month" are two different date ranges (two extra round trips) when we only need three integers.

Response shape (slim — only what the cards render and what the reused components need):
```
{
  "currently_reading": [
    { "copy_slug", "started_date", "status",        // "reading" | "paused"
      "page_log": [...], "last_page", "page_count",  // page_count nullable
      "work": { "slug", "title", "author" }, "cover" }
  ],
  "recently_finished": [
    { "copy_slug", "finished_date", "rating",
      "work": { "slug", "title", "author" }, "cover" }
  ],
  "recently_added": [
    { "copy_slug", "created_at",
      "work": { "slug", "title", "author" }, "cover" }
  ],
  "glance": { "finished_this_year", "pages_this_month", "currently_reading" }
}
```
The full `page_log` and `started_date` are included so the card can feed `LogPageForm` (needs `startedDate`, `lastPage`) and `NoteEditorModal` (needs the read-through list) without a second fetch.

### Currently-reading ordering and paused handling
Entries with `status: "reading"` come first, ordered by most recent page-log activity (the date of the last `page_log` entry, falling back to `started_date`), descending. `paused` entries follow, after all reading ones, ordered the same way. `dnf` and `finished` never appear here. This realizes "pick up where you left off" inside the hero rather than as a separate section.

### Glance date math mirrors existing stats code
`stats.ts` compares ISO date strings directly (e.g. `finished_date >= from`). The dashboard reuses that approach: "this year" / "this month" are computed as ISO-prefix bounds and compared as strings, keeping behavior consistent with the existing stats endpoint. Page deltas for "pages this month" sum `page_log[i].page - page_log[i-1].page` for entries dated within the month — the same delta logic `stats.ts` already uses.

### Frontend: new page + hook, reuse everything else
`Dashboard.tsx` at `/`, backed by `useDashboard.ts` which fetches `/api/dashboard` and subscribes via `useRefetchOnChange` to `copy`/`edition`/`work`/`note` events. Logging a page, saving a note, or finishing all write files → the watcher broadcasts → the dashboard refetches; an immediate refetch after each action keeps it snappy. `WorkGrid` is unchanged except for its route; `App.tsx` maps `/` → `Dashboard` and `/library` → `WorkGrid`.

### Navigation
`BottomNav` gains a Library tab (5 total: Home, Library, Stats, Add, Settings); the existing tab to `/` is relabeled "Home" (it already uses the Home icon). The top header gains a "Library" link beside Stats and Settings.

## Risks / Trade-offs

- **Five bottom tabs is tighter on narrow phones** → tabs already use `flex-1` and truncation; five fit, and labels stay short.
- **`GET /api/dashboard` iterates all copies on every call** → the index is in memory and libraries are personal-scale (hundreds, not millions); this matches how `stats.ts` already scans all copies. No caching needed.
- **A copy with multiple active read-throughs yields multiple hero cards** → intentional and rare; each read-through is its own progress, so showing both is correct.
- **Inline finish changes what's "currently reading"** → after `FinishModal` succeeds the dashboard refetches, so the finished book drops out of the hero and appears under recently-finished on the same load.

## Migration Plan

No data migration. The only externally visible change is routing: `/` now shows the dashboard and the library moves to `/library`. Bookmarks to `/` still resolve (to the dashboard); deep links to detail pages are unaffected. Rollback is reverting the route map and nav — no persisted state depends on this change.
