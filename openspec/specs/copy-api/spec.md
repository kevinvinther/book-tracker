# copy-api Specification

## Purpose
Full CRUD REST API for Copy entities. A Copy represents a user's physical or digital ownership of a specific Edition of a Work. Copies are leaf nodes — nothing links to them by slug, so deletes are hard deletes with no orphan protection.
## Requirements
### Requirement: Copy file format
A Copy entity SHALL be stored as a markdown file at `copies/{slug}.md` with YAML frontmatter containing `type: copy`, `slug`, `edition` (required, wikilink to `editions/{slug}`), `work` (required, wikilink to `works/{slug}`), `status` (required, one of `owned`, `lent`, `lost`, `given-away`, `sold`), optional fields `cover_image`, `release_date`, `condition`, `acquisition_date`, `acquisition_source`, `price_amount`, `price_currency`, `location`, `aliases[]`, `created_at`, and `_schema`.

#### Scenario: Example copy file on disk
- **WHEN** a copy of edition `dune-ace-books-1990` (work `dune`) is created with condition `good`, status `owned`, and aliases `["Dune paperback"]`
- **THEN** the file `copies/dune-ace-books-1990.md` exists on disk with:
  ```yaml
  ---
  type: copy
  slug: dune-ace-books-1990
  edition: "[[editions/dune-ace-books-1990]]"
  work: "[[works/dune]]"
  status: owned
  condition: good
  aliases:
    - "Dune paperback"
  created_at: 2024-01-10T12:00:00.000Z
  _schema: 1
  ---
  ```

### Requirement: Create a copy
The system SHALL expose `POST /api/copies` that accepts a JSON body with at least `edition` (edition slug) and `work` (work slug), validates both exist in the index, generates a slug from the edition slug via `generateSlug`, creates a Copy file in `copies/{slug}.md`, inserts it into the index, and returns the created copy with HTTP 201. The `status` field SHALL default to `owned` if not provided. The optional `aliases` field, when provided as an array of strings, SHALL be written to the copy's frontmatter.

#### Scenario: Successful creation with required fields
- **WHEN** a POST request is made to `/api/copies` with `{ "edition": "dune-ace-books-1990", "work": "dune" }`
- **THEN** the response has status 201 and the copy has `edition: "[[editions/dune-ace-books-1990]]"`, `work: "[[works/dune]]"`, and `status: "owned"`

#### Scenario: Creation with aliases
- **WHEN** a POST request is made to `/api/copies` with `{ "edition": "dune-ace-books-1990", "work": "dune", "aliases": ["Dune paperback", "My Dune"] }`
- **THEN** the response has status 201 and the copy file on disk contains the aliases array

#### Scenario: Creation with all optional fields
- **WHEN** a POST request is made with `edition`, `work`, `condition`, `acquisition_date`, `acquisition_source`, `price_amount`, `price_currency`, `location`, `status`, and `aliases`
- **THEN** the response has status 201 and all provided fields appear in the response and on disk

#### Scenario: Creation with missing edition
- **WHEN** a POST request is made to `/api/copies` without an `edition` field
- **THEN** the response has status 400 with an error indicating `edition` is required

#### Scenario: Creation with missing work
- **WHEN** a POST request is made to `/api/copies` without a `work` field
- **THEN** the response has status 400 with an error indicating `work` is required

#### Scenario: Creation with non-existent edition
- **WHEN** a POST request is made with `{ "edition": "nonexistent", "work": "dune" }`
- **THEN** the response has status 400 with an error indicating the edition does not exist

#### Scenario: Creation with non-existent work
- **WHEN** a POST request is made with `{ "edition": "dune-ace-books-1990", "work": "nonexistent" }`
- **THEN** the response has status 400 with an error indicating the work does not exist

### Requirement: List copies with optional work/edition filter
The system SHALL expose `GET /api/copies` that returns all copies as a JSON array, accepting optional query parameters `?work=` (filters to copies of that work, via `index.getCopiesByWork`) and `?edition=` (filters to copies of that edition, via `index.getCopiesByEdition`). If both are provided, `?work=` takes precedence.

#### Scenario: List all copies
- **WHEN** a GET request is made to `/api/copies`
- **THEN** the response has status 200 and a JSON array of all copies

#### Scenario: Filter by work
- **WHEN** a GET request is made to `/api/copies?work=dune` and the work has 3 copies across two editions
- **THEN** the response has status 200 and a JSON array of exactly those 3 copies

#### Scenario: Filter by edition
- **WHEN** a GET request is made to `/api/copies?edition=dune-ace-1990` and that edition has 2 copies
- **THEN** the response has status 200 and a JSON array of exactly those 2 copies

#### Scenario: Filter matching nothing
- **WHEN** a GET request is made to `/api/copies?work=nonexistent`
- **THEN** the response has status 200 and an empty JSON array

### Requirement: Get a single copy with resolved metadata
The system SHALL expose `GET /api/copies/:slug` that returns the full copy entity with an inline `edition_meta` object (key fields from the linked Edition), `work_meta` object (key fields from the linked Work), and a `body` field containing the rendered markdown body generated by `renderBody(copy, index)`. All resolved from the in-memory index.

#### Scenario: Copy exists with body
- **WHEN** a GET request is made to `/api/copies/dune-ace-books-1990`
- **THEN** the response has status 200 and includes all copy fields plus `edition_meta` (with at minimum `slug`, `publisher`, `format`, `page_count`), `work_meta` (with at minimum `slug`, `title`, `authors`), and a `body` string containing a rendered markdown body with the copy's metadata, reading history, loan history, and notes

#### Scenario: Copy does not exist
- **WHEN** a GET request is made to `/api/copies/nonexistent`
- **THEN** the response has status 404 with an error message

### Requirement: Update a copy
The system SHALL expose `PATCH /api/copies/:slug` that accepts a JSON body with any subset of mutable copy fields (`condition`, `location`, `cover_image`, `release_date`, `acquisition_date`, `acquisition_source`, `price_amount`, `price_currency`, `status`, `aliases`). The handler SHALL re-read the file from disk, merge incoming fields, write atomically, and update the index. The `slug`, `type`, `edition`, `work`, `created_at`, and `_schema` fields SHALL never be modified. The handler SHALL reject requests that set `status` to `owned` when the copy has outstanding loans (any loan with no `returned_date`), and SHALL reject requests that set `status` to `lent` (must use the loan flow).

#### Scenario: Update condition and location
- **WHEN** a PATCH request is made to `/api/copies/dune-ace-books-1990` with `{ "condition": "worn", "location": "bedroom shelf" }`
- **THEN** the response has status 200 and both fields are updated
- **AND** all other fields including `edition` and `work` remain unchanged

#### Scenario: Update aliases
- **WHEN** a PATCH request is made with `{ "aliases": ["Updated name"] }`
- **THEN** the response has status 200 and the copy's aliases are updated

#### Scenario: Omit aliases in PATCH
- **WHEN** a PATCH request is made without an `aliases` field
- **THEN** existing aliases on disk are preserved (not cleared)

#### Scenario: Update status to lost
- **WHEN** a PATCH request is made with `{ "status": "lost" }`
- **THEN** the response has status 200 and `status` is updated to `lost`

#### Scenario: Reject owned when loans outstanding
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

### Requirement: Delete a copy
The system SHALL expose `DELETE /api/copies/:slug` that performs a hard delete of the copy file and removes it from the index. No orphan protection is applied since no other entity links to copies by slug.

#### Scenario: Delete existing copy
- **WHEN** a DELETE request is made to `/api/copies/dune-ace-books-1990`
- **THEN** the response has status 200
- **AND** the copy file is removed from disk
- **AND** the copy is no longer returned by `index.getCopiesByEdition` or `index.getCopiesByWork`

#### Scenario: Delete non-existent copy
- **WHEN** a DELETE request is made to `/api/copies/nonexistent`
- **THEN** the response has status 404 with an error message

### Requirement: Client-side Copy type includes read-throughs and loans
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

