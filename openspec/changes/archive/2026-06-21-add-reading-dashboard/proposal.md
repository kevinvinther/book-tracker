## Supersedes

None.

## Why

The home route `/` currently renders the full library grid — the same "browse every book you own" view you'd expect behind a "Library" link. There is nothing personal or differentiated about landing there. The app already tracks rich reading activity (active read-throughs, page logs, finishes, ratings, recent acquisitions) but surfaces none of it as a landing experience. This change turns `/` into a personal reading dashboard that puts what you're reading *right now* front and center, and moves the library grid to its own route.

## What Changes

- **BREAKING (routing)**: `/` no longer renders the library grid. It renders a new reading dashboard. The library grid moves to `/library`.
- New `GET /api/dashboard` endpoint assembles, in a single pass over the in-memory index: currently-reading entries, recently-finished read-throughs, recently-added copies, and a small "glance" stats object.
- New **reading dashboard** page at `/` with four sections, in order:
  1. **Currently reading** (hero) — one card per active read-through (`status: "reading"`); cover, title/author, progress bar (`lastPage / page_count`) or last page read when no page count is known. **Paused** read-throughs fold in here, rendered dimmed at the end. Ordered by most recent page-log activity. Each card supports inline **page logging**, **quick note**, and the inline **finish** flow — reusing the existing `LogPageForm`, `NoteEditorModal`, and `FinishModal` components.
  2. **Reading at a glance** — Finished this year · Pages this month · Currently reading.
  3. **Recently finished** — up to 6 finished read-throughs (rating shown), ordered by `finished_date` descending.
  4. **Recently added** — up to 6 copies, ordered by `created_at` descending.
- Navigation updates: the bottom bar gains a **Library** tab (Home · Library · Stats · Add · Settings); the "Grid" tab is relabeled "Home" and continues to point at `/`. The top header gains a **Library** link alongside Stats and Settings.
- Empty states: currently-reading shows an inviting empty state linking to the library when nothing is active; recently-finished and recently-added hide when empty; glance shows zeros; a brand-new library (no books at all) shows a single welcoming "Add your first book" state.

## Capabilities

### New Capabilities
- `reading-dashboard-api`: The `GET /api/dashboard` endpoint — its response shape and the rules for selecting/ordering currently-reading, recently-finished, recently-added entries and computing the glance numbers.
- `reading-dashboard-page`: The dashboard page at `/` — its sections, the currently-reading card behavior (inline log/note/finish), ordering, paused handling, and empty states.

### Modified Capabilities
- `work-grid-page`: The library grid is served at `/library` instead of `/`.
- `mobile-navigation`: The bottom navigation gains a Library tab and the home tab is relabeled.

## Impact

- **New code**: `server/src/routes/dashboard.ts` (+ registration in `server/src/index.ts`); `client/src/pages/Dashboard.tsx`; `client/src/hooks/useDashboard.ts`; dashboard section components.
- **Modified code**: `client/src/App.tsx` (route `/` → Dashboard, add `/library` → WorkGrid, header Library link); `client/src/components/BottomNav.tsx` (Library tab, relabel Home).
- **Reused without change**: `LogPageForm`, `NoteEditorModal`, `FinishModal`, `useRefetchOnChange`/`useWebSocket`, `CoverImage`, `WorkCard`.
- **No data/schema changes**: read from the existing index; no new frontmatter fields, no migration.
- **Live updates**: the dashboard refetches via the existing `useRefetchOnChange` pattern on `copy`/`edition`/`work`/`note` change events.
