# copy-api Delta Specification

## ADDED Requirements

### Requirement: Client-side Copy type includes read-throughs
The client-side TypeScript interfaces for Copy and CopyFull SHALL include an optional `read_throughs` field containing an array of `ReadThrough` objects. The `ReadThrough` interface SHALL include `started_date`, `finished_date` (optional), `status` (one of `"reading" | "finished" | "dnf" | "paused"`), `rating` (optional number), and `page_log` (array of `PageLog`). The `PageLog` interface SHALL include `date` (ISO string) and `page` (number).

#### Scenario: Copy returned from API includes read_throughs
- **WHEN** a GET request to `/api/copies/:slug` returns a copy with read-throughs
- **THEN** the client deserializes `read_throughs` into the correct TypeScript type
- **AND** the `Copy` and `CopyFull` types accept the `read_throughs` field without type errors

### Requirement: readAndWriteCopy prefers index for read_throughs
The `readAndWriteCopy` function SHALL read the canonical file from disk (preserving Obsidian edits to all fields), but SHALL prefer the in-memory index's `read_throughs` array over the disk version. This prevents stale disk reads on filesystems where writes are not immediately visible to subsequent reads (e.g., Docker overlay2).

#### Scenario: Disk returns stale read_throughs after write
- **WHEN** a `writeFile` sets a read-through status to `"reading"` and a subsequent `readFile` returns a cached `"paused"`
- **THEN** the index's `read_throughs` (which reflects the write) is used, not the disk's stale version

#### Scenario: Index has no read_throughs (fresh start)
- **WHEN** the index copy has no `read_throughs` (empty or absent)
- **THEN** the disk version is used as-is

### Requirement: started_date deduplication on start
The `POST /api/copies/:slug/read-throughs` handler SHALL ensure each read-through has a unique `started_date` on the copy. If a read-through with the same `started_date` already exists, the handler SHALL append seconds (`T00:00:01Z`, `T00:00:02Z`, etc.) to the new `started_date` until it is unique.

#### Scenario: First read-through on a date
- **WHEN** no read-through exists with `started_date: "2026-06-19T00:00:00.000Z"`
- **THEN** the new read-through is created with that exact timestamp

#### Scenario: Duplicate started_date
- **WHEN** a read-through already exists with `started_date: "2026-06-19T00:00:00.000Z"`
- **THEN** the new read-through is created with `"2026-06-19T00:00:01.000Z"`

### Requirement: findReadThrough with status preference
The `findReadThrough` function SHALL accept an optional `preferStatus` parameter. When multiple read-throughs match the same `started_date`, the function SHALL prefer the one with the matching status. If no match has the preferred status, the function SHALL return the last matching entry (most recently added).

#### Scenario: Log finds reading read-through among duplicates
- **WHEN** two read-throughs share `started_date: "2026-06-19"` (one "finished", one "reading")
- **AND** `findReadThrough` is called with `preferStatus: "reading"`
- **THEN** the "reading" read-through is returned

#### Scenario: Resume finds paused read-through among duplicates
- **WHEN** `findReadThrough` is called with `preferStatus: "paused"`
- **THEN** the "paused" read-through is returned if one exists

### Requirement: Finish auto-logs page_count
The `PATCH /api/copies/:slug/read-throughs/:startedDate` handler's "finished" case SHALL, when the read-through is not already finished and the last logged page is below the edition's `page_count`, automatically append a page log entry at `page_count` before marking the read-through as finished. Re-finishing an already-finished read-through SHALL skip the page count check entirely.

#### Scenario: Finish with incomplete page log
- **WHEN** the last logged page is 0 and the edition has `page_count: 604`
- **AND** a PATCH is sent with `{ status: "finished" }`
- **THEN** a page log entry at page 604 is automatically added and the read-through is marked as finished

#### Scenario: Re-finish already-finished read-through
- **WHEN** the read-through is already `status: "finished"` with last page 0
- **THEN** the PATCH succeeds without requiring the page count check
- **AND** the read-through's rating and finished_date may be updated
