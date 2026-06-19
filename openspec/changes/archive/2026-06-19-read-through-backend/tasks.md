## 1. Helper utilities

- [x] 1.1 Add date extraction helpers in `copies.ts` — parse `YYYY-MM-DD` URL params, format `started_date` to ISO 8601, normalize dates for comparison
- [x] 1.2 Add a `readAndWriteCopy` helper that re-reads the Copy file from disk, applies a mutation function to `read_throughs[]`, atomically writes, and updates the index

## 2. Start read-through endpoint

- [x] 2.1 Implement `POST /api/copies/:slug/read-throughs` — validate slug exists, validate copy is not `lent`, auto-create initial `page_log` entry with `page: 0`, auto-pause existing active read-throughs with `warning` in response, upsert copy to index, return full copy

## 3. Log page endpoint

- [x] 3.1 Implement `POST /api/copies/:slug/read-throughs/:startedDate/log` — validate read-through exists and is `reading`, validate page ≥ last entry, validate page ≤ edition's `page_count` (skip with `warning` if unknown), return `finished: true` when page == page_count

## 4. Change status endpoint

- [x] 4.1 Implement `PATCH /api/copies/:slug/read-throughs/:startedDate` — dispatch on `status` field: `finished` (validate page == page_count, set `finished_date` and optional `rating`), `dnf` (set `finished_date`, optionally append final page entry), `paused` (set status), `resumed` (set status, auto-pause other active read-through)

## 5. Edit page log entry endpoint

- [x] 5.1 Implement `PATCH /api/copies/:slug/read-throughs/:startedDate/entries/:date` — allow mutation of `date` and `page`, re-sort by date, validate page monotonicity

## 6. Delete page log entry endpoint

- [x] 6.1 Implement `DELETE /api/copies/:slug/read-throughs/:startedDate/entries/:date` — remove entry, reject deletion of baseline `page: 0` entry, re-validate page monotonicity

## 7. Delete read-through endpoint

- [x] 7.1 Implement `DELETE /api/copies/:slug/read-throughs/:startedDate` — remove the entire read-through from `read_throughs[]`

## 8. Tests

- [x] 8.1 Write tests for starting a read-through (basic, auto-pause, lent copy block, 404, defaults)
- [x] 8.2 Write tests for page logging (basic, page == page_count signal, validation errors, unknown page_count warning, non-active read-through)
- [x] 8.3 Write tests for status transitions (finish with rating, finish validation, dnf with/without page, pause, resume with auto-pause, invalid status)
- [x] 8.4 Write tests for editing and deleting page log entries (mutate page/date, monotonicity checks, baseline protection)
- [x] 8.5 Write tests for deleting a read-through
- [x] 8.6 Verify all existing copy tests still pass
