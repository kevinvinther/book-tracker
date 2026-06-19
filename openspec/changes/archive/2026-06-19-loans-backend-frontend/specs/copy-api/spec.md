# copy-api Specification

## MODIFIED Requirements

### Requirement: Client-side Copy type includes read-throughs
The client-side TypeScript interfaces for Copy and CopyFull SHALL include an optional `read_throughs` field containing an array of `ReadThrough` objects, and an optional `loans` field containing an array of `Loan` objects. The `ReadThrough` interface SHALL include `started_date`, `finished_date` (optional), `status` (one of `"reading" | "finished" | "dnf" | "paused"`), `rating` (optional number), and `page_log` (array of `PageLog`). The `PageLog` interface SHALL include `date` (ISO string) and `page` (number). The `Loan` interface SHALL include `borrower_name`, `lent_date`, `expected_return_date` (optional), and `returned_date` (optional).

#### Scenario: Copy returned from API includes read_throughs and loans
- **WHEN** a GET request to `/api/copies/:slug` returns a copy with read-throughs and loans
- **THEN** the client deserializes `read_throughs` and `loans` into the correct TypeScript types
- **AND** the `Copy` and `CopyFull` types accept both fields without type errors

### Requirement: readAndWriteCopy prefers index for read_throughs and loans
The `readAndWriteCopy` function SHALL read the canonical file from disk (preserving Obsidian edits to all fields), but SHALL prefer the in-memory index's `read_throughs` and `loans` arrays over the disk version. This prevents stale disk reads on filesystems where writes are not immediately visible to subsequent reads (e.g., Docker overlay2).

#### Scenario: Disk returns stale read_throughs after write
- **WHEN** a `writeFile` sets a read-through status to `"reading"` and a subsequent `readFile` returns a cached `"paused"`
- **THEN** the index's `read_throughs` (which reflects the write) is used, not the disk's stale version

#### Scenario: Disk returns stale loans after write
- **WHEN** a `writeFile` adds a new loan and a subsequent `readFile` returns a cached version without the loan
- **THEN** the index's `loans` (which reflects the write) is used, not the disk's stale version

#### Scenario: Index has no read_throughs or loans (fresh start)
- **WHEN** the index copy has no `read_throughs` or `loans` (empty or absent)
- **THEN** the disk version is used as-is

### Requirement: Update a copy
The system SHALL expose `PATCH /api/copies/:slug` that accepts a JSON body with any subset of mutable copy fields (`condition`, `location`, `cover_image`, `release_date`, `acquisition_date`, `acquisition_source`, `price_amount`, `price_currency`, `status`). The handler SHALL re-read the file from disk, merge incoming fields, write atomically, and update the index. The `slug`, `type`, `edition`, `work`, `created_at`, and `_schema` fields SHALL never be modified. The handler SHALL reject requests that set `status` to `owned` when the copy has outstanding loans (any loan with no `returned_date`), and SHALL reject requests that set `status` to `lent` (must use the loan flow).

#### Scenario: Update condition and location
- **WHEN** a PATCH request is made to `/api/copies/dune-ace-books-1990` with `{ "condition": "worn", "location": "bedroom shelf" }`
- **THEN** the response has status 200 and both fields are updated
- **AND** all other fields including `edition` and `work` remain unchanged

#### Scenario: Update status to lost
- **WHEN** a PATCH request is made with `{ "status": "lost" }`
- **THEN** the response has status 200 and `status` is updated to `lost`

#### Scenario: Reject ownership when loans outstanding
- **WHEN** a PATCH request tries to set `status: "owned"` on a copy with an unreturned loan
- **THEN** the response has status 400 with an error indicating outstanding loans prevent this change

#### Scenario: Reject manual lent
- **WHEN** a PATCH request tries to set `status: "lent"` directly
- **THEN** the response has status 400 with an error indicating the loan flow must be used

#### Scenario: Attempt to change edition or work
- **WHEN** a PATCH request is made with `{ "edition": "other-edition", "work": "other-work" }`
- **THEN** the `edition` and `work` fields in the request are ignored

#### Scenario: Update non-existent copy
- **WHEN** a PATCH request is made to `/api/copies/nonexistent` with `{ "condition": "good" }`
- **THEN** the response has status 404 with an error message
