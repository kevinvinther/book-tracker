## Supersedes

None.

## Why

The read-through API backend is complete — start, page logging, status transitions, entry editing, and deletion. Without a frontend to drive it, users who've added books to their library can't track reading. This is the diary half of a book diary; without it, the app is a catalog.

## What Changes

- Add `ReadThrough` and `PageLog` types to the client, and `read_throughs` to `Copy`/`CopyFull`
- Copy Detail page — replace placeholder "No read-throughs yet." with a full Read-through History section:
  - List each read-through with status badge, started/finished dates, rating
  - Page log table (newest first) with page, %, Δ pages, Δ days columns
  - Inline edit/delete for individual page log entries
  - "Undo last entry" shortcut button
  - "Start new read-through" form with optional start date
  - Active read-through: "Log page count" form with page number + date
  - Status transition actions: Finish (modal with rating + finished_date), DNF, Pause, Resume
  - Finished prompt when page log reaches edition page_count
  - Delete entire read-through with confirmation dialog
- CopyCard component — show most recent read-through status + page progress
- Server: `readAndWriteCopy` prefers in-memory index for `read_throughs` to avoid stale disk reads on Docker overlay2
- Server: finish handler auto-logs `page_count` when finishing with incomplete page log
- Server: `findReadThrough` accepts `preferStatus` to correctly target read-throughs when duplicates exist
- Server: `started_date` deduplication prevents multiple read-throughs with identical identifiers

## Capabilities

### New Capabilities
- `read-through-frontend`: Display and interaction layer for read-throughs — status badges, page log table, start/log/finish/dnf/pause/resume actions, inline entry editing, undo last entry, and delete read-through. CopyCard shows most recent read-through status + page progress on Work Detail.

### Modified Capabilities
- `copy-detail-page`: Read-through History section replaces static placeholder with full interactive implementation.
- `work-detail-page`: CopyCard display extended to include read-through status and page progress.
- `copy-api`: Copy types on the client extended to include `read_throughs` and related interfaces.

## Impact

- **Client types**: New `PageLog`, `ReadThrough` interfaces; `Copy` and `CopyFull` gain `read_throughs?: ReadThrough[]`
- **Client components**: `CopyDetail.tsx` — replaces placeholder with `ReadThroughList`; `CopyCard.tsx` — extended to show read-through status; new components: `ReadThroughStatusBadge`, `ConfirmDialog`, `PageLogTable`, `LogPageForm`, `FinishModal`, `ReadThroughSection`, `StartReadThroughForm`, `ReadThroughList`
- **Client hooks**: `useCopy` extended with `updateCopy(data | fn)` for direct state updates from API responses without refetching
- **Client utilities**: New `client/src/lib/dates.ts` with `toDatePart()` and `formatDate()`
- **Server routes**: `readAndWriteCopy` prefers index for `read_throughs` on Docker overlay2; `findReadThrough` supports `preferStatus`; finish handler auto-logs page_count; `started_date` deduplication
- **Tests**: Updated "blocks finish when page != page_count" → "auto-logs page_count when finishing with incomplete page log"
