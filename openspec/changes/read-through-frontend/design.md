## Context

The read-through API backend exposes six endpoints on `/api/copies/:slug/read-throughs` for the full read-through lifecycle. The Copy Detail page and CopyCard component on Work Detail currently show placeholder text ("No read-throughs yet."). The `Copy` and `CopyFull` types on the client lack `read_throughs` entirely.

The client uses bare `fetch()` calls (no API client abstraction) in custom React hooks. Modals use `@base-ui/react/dialog`. Forms use native HTML inputs styled with Tailwind.

## Goals / Non-Goals

**Goals:**
- Display read-through history on Copy Detail: status badges, dates, ratings, page log table with derived columns (%, Δ pages, Δ days)
- Inline editing and deletion of page log entries
- "Start new read-through" form, "Log page count" form, status transition actions (Finish/DNF/Pause/Resume)
- Confirmation dialogs for destructive actions (delete read-through, delete entry, undo last entry)
- CopyCard on Work Detail shows most recent read-through status + page progress
- Graceful handling when edition has no `page_count` (no %, no auto-finish prompt, no page-bound validation UI)

**Non-Goals:**
- Adding `reading_status` to the Work Grid
- Notes integration (optional note on page log — deferred to Notes feature)
- Loans frontend

## Decisions

### 1. Component structure: colocate in CopyDetail with extracted sub-components

CopyDetail will grow significantly. Rather than one monolithic file, extract focused sub-components into files under `client/src/components/`:

| Component | Responsibility |
|---|---|
| `ReadThroughList` | Renders all read-throughs for a copy, iterating over `ReadThroughSection` |
| `ReadThroughSection` | Renders one read-through: status badge, dates, rating, page log table, action buttons |
| `PageLogTable` | Renders the page log as a table with editable rows, delete buttons, undo last entry |
| `PageLogRow` | Single table row; switches between display and edit mode on click (embedded in PageLogTable) |
| `StartReadThroughForm` | Small form with optional start_date field |
| `LogPageForm` | Page number + date input; shown only for active (`status: reading`) read-throughs |
| `FinishModal` | Dialog collecting rating (0–10) and optional finished_date |
| `ConfirmDialog` | Generic confirmation dialog for destructive actions |
| `ReadThroughStatusBadge` | Colored pill badges for reading/paused/finished/dnf statuses |

All status-transition actions (Finish, DNF, Pause, Resume) and the undo-last-entry button are inlined in `ReadThroughSection` rather than extracted into separate components, since each is a single button or a small inline form.

**Rationale:** Keeps CopyDetail readable. Each component has a single responsibility. Matches existing pattern where modals are separate components (EditCopyModal, EditWorkModal, etc.).

**Alternative considered:** Inline everything in CopyDetail. Rejected because the file would grow to 400+ lines and become unmaintainable.

### 2. Data flow: update local state from API responses, no refetch

Every read-through API endpoint returns the updated Copy object including `read_throughs`. After any mutation, extract `data.read_throughs` from the API response and merge it into the local React state via `useCopy`'s `updateCopy` callback: `updateCopy(prev => ({ ...prev, read_throughs: data.read_throughs }))`. This avoids an extra `GET /api/copies/:slug` round-trip and eliminates a race condition on some filesystems (see decision 8).

The `useCopy` hook was extended with an `updateCopy` function that accepts either a `CopyFull` object or a functional updater `(prev: CopyFull) => CopyFull`, mirroring `setState`'s API.

**Rationale:** The PATCH/POST/DELETE responses already contain the updated read_throughs. Using them directly is faster and avoids the stale-read issue documented in decision 8.

**Alternative considered:** `refetch()` after every mutation. Rejected after discovering that on Docker overlay2 filesystems, the GET's disk read can return data from before the PATCH's write, causing the "Cannot log pages on a non-active read-through" error.

### 3. Date handling: strip time, use YYYY-MM-DD for identifiers

The backend uses full ISO 8601 strings internally but identifies read-throughs and entries by their date part (e.g., `/read-throughs/2025-06-01`). The client must:
- Strip time components for display (show "Jun 1, 2025" not the full ISO string)
- Pass `YYYY-MM-DD` for URL params
- Pass ISO strings (or `YYYY-MM-DD` which the server converts) for `started_date`, `finished_date`, and entry dates in request bodies

A `toDatePart(iso: string): string` helper extracts `YYYY-MM-DD`. A `formatDate(date: string): string` helper renders for display. Both live in `client/src/lib/dates.ts`.

### 4. Finished prompt: dismissible inline banner

When `POST .../log` returns `{ finished: true }`, show a banner below the active read-through section: "You've reached the final page. [Mark as finished]" with a button opening the FinishModal. The banner can be dismissed. The explicit "Finish" button remains available regardless.

### 5. Edit/delete page log entries: inline with confirmation

Edit: Click a table row → the page and date cells become `<input>` fields. Save on blur or Enter. Cancel on Escape.

Delete: Each row (except the baseline page:0 entry) has a small delete button. Click → ConfirmDialog → DELETE call. The baseline entry (first entry, page:0) is not deletable — the backend enforces this, and the UI should not show a delete button for it.

Undo last entry: Button in the active read-through section. ConfirmDialog → DELETE call for the last page_log entry.

### 6. CopyCard extension: most recent read-through

For each copy in the editions list on WorkDetail, determine the most recent `read_throughs` entry (by `started_date` descending). Display a compact line:
- Active: "Reading · pg 104/796"
- Paused: "Paused · pg 104/796"
- Finished with rating: "Finished · ★ 9.0"
- Finished without rating: "Finished"
- DNF: "DNF"  
- No read-throughs: nothing (no change from current display)

If edition has no `page_count`, omit the "/N" part and just show "pg 104".

### 7. Status badges: new `ReadThroughStatusBadge` component

A separate component (not extending `StatusStamp`) for read-through statuses:
- reading: verdigris green
- paused: stamp (amber/warm)
- finished: muted
- dnf: secondary

**Rationale:** Read-through statuses are semantically different from copy statuses (owned/lent/lost). A separate component clarifies this distinction and allows independent styling.

### 8. Server: protect read_throughs from stale disk reads

The `readAndWriteCopy` function in `server/src/routes/copies.ts` follows the re-read-from-disk pattern (spec §7.4) to preserve Obsidian edits to copy fields. However, on Docker overlay2 with bind mounts, a `readFileSync` immediately after a `writeFileSync` can return bytes from *before* the write — the overlay filesystem caches reads and doesn't invalidate them promptly.

The fix: after reading the canonical file from disk, the `read_throughs` array is taken from the in-memory index (which is always coherent because `index.upsert` runs after every `writeFile`). All other fields (title, condition, location, acquisition info, etc.) still come from disk, preserving Obsidian edits to those fields.

**Trade-off:** If someone manually edits `read_throughs` YAML in Obsidian, those edits will be overwritten by the index version. Since `read_throughs` is managed entirely by the web app and the markdown body is auto-generated from frontmatter, this is not a realistic editing scenario.

### 9. Server: started_date deduplication

The `started_date` is the identifier for read-throughs in API routes (`/read-throughs/:startedDate`). If two read-throughs share the same date, `findReadThrough` can return the wrong one, causing operations (log, finish, delete) to target the wrong read-through.

The server now prevents duplicates: when creating a read-through and the desired `started_date` already exists on that copy, the server appends seconds (`T00:00:01Z`, `T00:00:02Z`, etc.) to ensure uniqueness. The deduplication operates on the full ISO timestamp, so the date part shown to the user remains the same.

**Rationale:** The API identifies read-throughs by `started_date` in the URL path. Without uniqueness, `findReadThrough(c, "2026-06-19")` returns the first match, which could be a finished or paused read-through instead of the active one.

### 10. Server: findReadThrough with status preference

Even with deduplication, existing data may contain duplicate `started_date` values from before the fix. To handle this, `findReadThrough` accepts an optional `preferStatus` parameter:

- **Log entries** — prefers `"reading"`
- **Pause/DNF/Finish** — prefers `"reading"`
- **Resume** — prefers `"paused"`
- **Delete/Edit entries** — prefers `"reading"`
- **Delete read-through** — returns the last (most recent) match

If no entry has the preferred status, the function falls back to the last matching entry (by array index, which is insertion order).

### 11. Server: auto-log page_count on finish

The `PATCH .../read-throughs/:startedDate` handler's "finished" case previously required the last logged page to equal the edition's `page_count`. This forced users to manually log the final page before clicking Finish.

The handler now auto-logs `page_count` when finishing with an incomplete page log, using the provided `finished_date` as the log date. The `FinishModal` on the client is a simple single-request form (just a PATCH with `status: "finished"`).

A re-finish of an already-finished read-through (e.g., to update the rating) skips the `page_count` check entirely.

### 12. Client: page log table sort by date part only

The page log table displays entries newest-first. Entries in the same page_log array may have different sub-second timestamps (e.g., `T00:00:05Z` from a deduplicated started_date vs `T00:00:00Z` from a manually-dated log entry). Sorting by full timestamp would scatter same-day entries based on millisecond differences.

The sort uses only the `YYYY-MM-DD` date part for comparison (`date.slice(0, 10)`). Same-date entries are sorted by page descending, which produces the intuitive order (most pages read first within a day).

**Rationale:** Users expect all entries from "June 19" to be grouped together, with the highest page at the top.

### 13. Client: delta calculations use date-only

The Δ days column in the page log table computes the day difference between consecutive entries. Using full timestamps caused same-day entries to show `1` instead of `0` (when times differed by more than 12 hours), and different-day entries to show `29` instead of `30` (when time components skewed the rounding).

The fix: strip to `YYYY-MM-DD` before computing differences, so same-day entries always show `0` and calendar-day gaps are exact.

### 14. Client: unique React keys for table rows

Multiple page log entries on the same date produced duplicate React keys (`key={toDatePart(entry.date)}`), causing React reconciliation to scramble row order. Keys now use `${datePart}-${page}-${index}` which is always unique.

Similarly, `ReadThroughList` uses `${rt.started_date}-${index}` for its section keys to avoid collisions from existing duplicate started_dates.
