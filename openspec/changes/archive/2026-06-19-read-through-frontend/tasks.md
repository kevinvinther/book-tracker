## 1. Client type definitions

- [x] 1.1 Add `PageLog` and `ReadThrough` interfaces to `client/src/lib/types.ts`
- [x] 1.2 Add `read_throughs?: ReadThrough[]` to `Copy` and `CopyFull` types

## 2. Shared components

- [x] 2.1 Create `ReadThroughStatusBadge` component (`client/src/components/ReadThroughStatusBadge.tsx`) — renders colored badge for reading/paused/finished/dnf statuses
- [x] 2.2 Create `ConfirmDialog` component (`client/src/components/ConfirmDialog.tsx`) — generic confirmation dialog for destructive actions, using `@base-ui/react/dialog`

## 3. Page log table

- [x] 3.1 Create `PageLogTable` component (`client/src/components/PageLogTable.tsx`) — renders a table of page log entries sorted newest first with columns: date (formatted), page, %, Δ pages, Δ days
- [x] 3.2 Create `PageLogRow` component (`client/src/components/PageLogRow.tsx`) — single table row that switches to edit mode on click; handles inline save/cancel with Escape key support
- [x] 3.3 Implement page log entry inline edit — `PATCH /api/copies/:slug/read-throughs/:startedDate/entries/:date` on save
- [x] 3.4 Implement page log entry delete — delete button per non-baseline row with `ConfirmDialog`, calls `DELETE /api/copies/:slug/read-throughs/:startedDate/entries/:date`

## 4. Read-through section per read-through

- [x] 4.1 Create `ReadThroughSection` component (`client/src/components/ReadThroughSection.tsx`) — renders one read-through with status badge, dates, rating (if finished), and the page log table
- [x] 4.2 Implement "Undo last entry" button on active read-throughs — `ConfirmDialog` → `DELETE .../entries/:lastDate`
- [x] 4.3 Implement "Delete read-through" action — `ConfirmDialog` → `DELETE /api/copies/:slug/read-throughs/:startedDate`

## 5. Log page count form

- [x] 5.1 Create `LogPageForm` component (`client/src/components/LogPageForm.tsx`) — page number input (required) + date input (optional, defaults to today)
- [x] 5.2 Implement submit — `POST /api/copies/:slug/read-throughs/:startedDate/log` with error display
- [x] 5.3 Implement finished prompt — when response includes `finished: true`, show dismissible banner with "Mark as finished" button

## 6. Status transition actions

- [x] 6.1 Create `FinishModal` component (`client/src/components/FinishModal.tsx`) — rating input (0–10, optional) + finished_date (optional, defaults today); submits `PATCH .../read-throughs/:startedDate` with `{ status: "finished", ... }`
- [x] 6.2 Implement DNF action — inline form with optional final page + finished_date; submits `PATCH .../read-throughs/:startedDate` with `{ status: "dnf", ... }`
- [x] 6.3 Implement Pause action — immediate `PATCH .../read-throughs/:startedDate` with `{ status: "paused" }`
- [x] 6.4 Implement Resume action — immediate `PATCH .../read-throughs/:startedDate` with `{ status: "resumed" }`; display warning if response includes auto-pause info

## 7. Start new read-through

- [x] 7.1 Create `StartReadThroughForm` component (`client/src/components/StartReadThroughForm.tsx`) — optional start_date field (defaults to today)
- [x] 7.2 Implement submit — `POST /api/copies/:slug/read-throughs`; display warning if auto-pause occurred
- [x] 7.3 Block start on lent copies — disable button with explanatory message when `copy.status === "lent"`

## 8. Copy Detail page integration

- [x] 8.1 Create `ReadThroughList` component (`client/src/components/ReadThroughList.tsx`) — iterates `read_throughs[]` rendering `ReadThroughSection` for each, with "Start new read-through" button at top
- [x] 8.2 Replace placeholder section in `CopyDetail.tsx` with `ReadThroughList`
- [x] 8.3 Ensure `refetch` is called after every mutation (pass `onUpdate` callback through component tree)

## 9. CopyCard read-through display

- [x] 9.1 Add date helper (`formatDate`, `toDatePart`) to `client/src/lib/dates.ts`
- [x] 9.2 Update `CopyCard.tsx` to show most recent read-through status + page progress when `copy.read_throughs` is non-empty
- [x] 9.3 Handle cases: no read-throughs (no change), edition without page_count (omit "/N"), finished with rating (show star), finished without rating, DNF
