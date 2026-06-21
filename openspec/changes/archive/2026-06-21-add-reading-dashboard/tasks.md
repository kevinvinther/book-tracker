## 1. Dashboard API

- [x] 1.1 Create `server/src/routes/dashboard.ts` exporting `createDashboardRouter(index, libraryPath)` with `GET /`
- [x] 1.2 Build `currently_reading`: iterate all copies' read-throughs, keep `reading` and `paused`, join copy → edition (`page_count`) → work (title) → author → cover; include `started_date`, `status`, full `page_log`, `last_page`, nullable `page_count`
- [x] 1.3 Order `currently_reading`: `reading` before `paused`, each group by last page-log date (fallback `started_date`) descending
- [x] 1.4 Build `recently_finished`: `finished` read-throughs ordered by `finished_date` desc, capped at 6, with `rating`, work meta, cover
- [x] 1.5 Build `recently_added`: copies ordered by `created_at` desc, capped at 6, with work meta, cover
- [x] 1.6 Compute `glance`: `finished_this_year`, `pages_this_month` (sum of in-month page-log deltas), `currently_reading` count — using ISO-string bounds like `stats.ts`
- [x] 1.7 Register the router in `server/src/index.ts` as `/api/dashboard`
- [x] 1.8 Add `server/src/routes/dashboard.test.ts` covering ordering, paused-after-reading, finished/dnf exclusion, null page_count, six-item caps, empty library, and glance math

## 2. Routing and navigation

- [x] 2.1 In `client/src/App.tsx`, map `/` → new `Dashboard` and add `/library` → existing `WorkGrid`
- [x] 2.2 Add a "Library" link to the desktop header beside Stats/Settings
- [x] 2.3 In `client/src/components/BottomNav.tsx`, relabel the `/` tab to "Home" and add a "Library" tab → `/library` (5 tabs total)

## 3. Dashboard data hook and types

- [x] 3.1 Add dashboard response types to `client/src/lib/types.ts` (`DashboardResponse` with `currently_reading`, `recently_finished`, `recently_added`, `glance`)
- [x] 3.2 Create `client/src/hooks/useDashboard.ts` fetching `/api/dashboard`, exposing `{ data, loading, error, refetch }`, subscribed via `useRefetchOnChange` to `copy`/`edition`/`work`/`note` events

## 4. Dashboard page and sections

- [x] 4.1 Create `client/src/pages/Dashboard.tsx` rendering the four sections in order with loading and error states
- [x] 4.2 Currently-reading card: cover, title, author, link to copy detail; progress bar from `last_page / page_count`, or "p. N" when `page_count` is null; dimmed/paused styling for `paused` entries
- [x] 4.3 Wire inline page logging into the card by reusing `LogPageForm`; refetch the dashboard on success
- [x] 4.4 Wire the quick-note action by reusing `NoteEditorModal` (entityType `copy`, the entry's read-throughs); refetch on save
- [x] 4.5 Wire the inline finish flow by reusing `FinishModal` when the final page is logged; refetch so the finished book leaves currently-reading
- [x] 4.6 Build the glance strip from `glance`
- [x] 4.7 Build recently-finished and recently-added rows (up to 6 each); hide each section when its list is empty
- [x] 4.8 Empty states: inviting currently-reading empty state with a link to `/library`; single "add your first book" state when the library has no books

## 5. Verification

- [x] 5.1 Run server and client test suites and the type check; fix failures
- [x] 5.2 Manually verify the dashboard at `/`: log a page, add a note, and finish a book from a card, confirming live updates; confirm `/library` and the new nav entries on desktop and mobile widths
