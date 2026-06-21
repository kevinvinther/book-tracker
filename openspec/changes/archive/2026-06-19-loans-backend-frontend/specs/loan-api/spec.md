# loan-api Specification

## Purpose
Full CRUD REST API for loan tracking on copies. Loans are embedded in the copy frontmatter's `loans[]` array, identified by `lent_date` in the URL path. Copy status (`lent`/`owned`) is derived from loan state.

## ADDED Requirements

### Requirement: Loan data model
A Loan SHALL contain `borrower_name` (required, non-empty string), `lent_date` (required, ISO 8601 datetime — serves as the loan identifier), `expected_return_date` (optional, ISO 8601 date string), and `returned_date` (optional, ISO 8601 date string, null when outstanding). Loans SHALL be stored as entries in the copy frontmatter's `loans[]` array. The `loans` key SHALL be omitted from frontmatter when the array is empty.

#### Scenario: Loan stored in copy frontmatter
- **WHEN** a copy has one outstanding loan
- **THEN** the copy file on disk includes a `loans` array with one entry containing `borrower_name`, `lent_date`, `expected_return_date`, and `returned_date`
- **AND** no `loans` key exists when the array is empty

### Requirement: Create a loan
The system SHALL expose `POST /api/copies/:slug/loans` that accepts a JSON body with `borrower_name` (required, non-empty string), `lent_date` (optional, ISO date string, defaults to today), and `expected_return_date` (optional, ISO date string). The handler SHALL validate the copy exists, validate the copy is `owned` (not already `lent`), validate no outstanding loan (returned_date unset) exists, auto-pause any active read-through, create the loan entry, set copy status to `lent`, write atomically, and return the updated copy with HTTP 201.

#### Scenario: Successful loan creation
- **WHEN** a POST request is made to `/api/copies/dune-ace-1990/loans` with `{ "borrower_name": "Sarah", "lent_date": "2025-06-01", "expected_return_date": "2025-07-01" }`
- **THEN** the response has status 201
- **AND** the copy's `loans` array contains the new loan
- **AND** the copy's status is `lent`

#### Scenario: Loan creation with defaults
- **WHEN** a POST request is made with only `{ "borrower_name": "Sarah" }`
- **THEN** the loan is created with today's date as `lent_date`
- **AND** `expected_return_date` is absent

#### Scenario: Missing borrower_name
- **WHEN** a POST request is made without `borrower_name` or with an empty string
- **THEN** the response has status 400 with an error indicating `borrower_name` is required

#### Scenario: Lent copy blocks new loan
- **WHEN** a POST request is made on a copy that already has an outstanding loan
- **THEN** the response has status 400 with an error indicating a loan is already outstanding

#### Scenario: Non-owned copy blocks loan
- **WHEN** a POST request is made on a copy with `status: lost`
- **THEN** the response has status 400 with an error indicating the copy cannot be lent

#### Scenario: Auto-pause active read-through on lend
- **WHEN** a copy has an active read-through with `status: reading` and a loan is created
- **THEN** the active read-through is paused (`status: paused`) before the loan is created
- **AND** the response includes a warning indicating the read-through was paused

#### Scenario: Loan on non-existent copy
- **WHEN** a POST request is made to `/api/copies/nonexistent/loans`
- **THEN** the response has status 404

#### Scenario: Invalid expected_return_date
- **WHEN** a POST request includes `expected_return_date` that is before `lent_date`
- **THEN** the response has status 400 with an error indicating the expected return date must be on or after the lent date

### Requirement: Lent date deduplication
The `POST /api/copies/:slug/loans` handler SHALL ensure each loan has a unique `lent_date` on the copy. If a loan with the same `lent_date` already exists, the handler SHALL append seconds (`T00:00:01Z`, `T00:00:02Z`, etc.) to the new `lent_date` until it is unique.

#### Scenario: First loan on a date
- **WHEN** no loan exists with `lent_date: "2026-06-19T00:00:00.000Z"`
- **THEN** the new loan is created with that exact timestamp

#### Scenario: Duplicate lent_date
- **WHEN** a loan already exists with `lent_date: "2026-06-19T00:00:00.000Z"`
- **THEN** the new loan is created with `"2026-06-19T00:00:01.000Z"`

### Requirement: Edit a loan
The system SHALL expose `PATCH /api/copies/:slug/loans/:lentDate` that accepts a JSON body with any subset of `borrower_name`, `lent_date`, `expected_return_date`, and `returned_date`. The handler SHALL validate the copy and loan exist, apply the requested changes, write atomically, and return the updated copy. When `returned_date` is set or cleared, the handler SHALL recalculate the copy's status: if any loan has no `returned_date`, status is `lent`; otherwise, status is `owned`. When editing `lent_date`, the handler SHALL reject the edit if the new date conflicts with another loan's `lent_date`.

#### Scenario: Set returned_date
- **WHEN** a PATCH request is made to `/api/copies/dune-ace-1990/loans/2025-06-01` with `{ "returned_date": "2025-08-15" }`
- **THEN** the loan's `returned_date` is set
- **AND** the copy status is recalculated to `owned` (no other outstanding loans)

#### Scenario: Clear returned_date
- **WHEN** a loan has `returned_date: "2025-08-15"` and a PATCH clears it to `null`
- **THEN** the loan's `returned_date` is unset
- **AND** the copy status is recalculated to `lent`

#### Scenario: Edit borrower_name
- **WHEN** a PATCH request changes `borrower_name` from "Sarah" to "Sarah Connor"
- **THEN** the loan's `borrower_name` is updated
- **AND** other loan fields and copy status remain unchanged

#### Scenario: Edit with conflicting lent_date
- **WHEN** a PATCH tries to change `lent_date` to a date that matches another loan on the same copy
- **THEN** the response has status 400 with an error indicating date conflict

#### Scenario: Edit non-existent loan
- **WHEN** a PATCH request targets a `lent_date` that does not match any loan
- **THEN** the response has status 404

#### Scenario: Invalid expected_return_date on edit
- **WHEN** a PATCH request sets `expected_return_date` before `lent_date`
- **THEN** the response has status 400

### Requirement: Delete a loan
The system SHALL expose `DELETE /api/copies/:slug/loans/:lentDate` that removes the loan entry from the copy's `loans[]` array, writes atomically, and returns the updated copy. The handler SHALL recalculate the copy's status after deletion: if any remaining loan has no `returned_date`, status is `lent`; otherwise, status is `owned`.

#### Scenario: Delete outstanding loan
- **WHEN** a DELETE request removes the only outstanding loan
- **THEN** the loan is removed from the array
- **AND** the copy status is recalculated to `owned`

#### Scenario: Delete one of multiple loans
- **WHEN** a copy has two loans (one returned, one outstanding) and the returned one is deleted
- **THEN** the loan is removed
- **AND** the copy status remains `lent` (outstanding loan still exists)

#### Scenario: Delete non-existent loan
- **WHEN** a DELETE request targets a `lent_date` that does not match any loan
- **THEN** the response has status 404

### Requirement: readAndWriteCopy merges loans from index
The `readAndWriteCopy` function SHALL read the canonical file from disk, but SHALL prefer the in-memory index's `loans` array over the disk version when the index has loans. If the index has no loans, the disk version is used as-is. This prevents stale disk reads on filesystems where writes are not immediately visible (e.g., Docker overlay2).

#### Scenario: Disk returns stale loans after write
- **WHEN** a `writeFile` sets a loan with `returned_date: null` and a subsequent `readFile` returns a cached version without the new loan
- **THEN** the index's `loans` (which reflects the write) is used, not the disk's stale version

#### Scenario: Index has no loans (fresh start)
- **WHEN** the index copy has no `loans` (empty or absent)
- **THEN** the disk version is used as-is

### Requirement: Copy PATCH rejects loan-conflicting status changes
The `PATCH /api/copies/:slug` handler SHALL reject requests that set `status` to `owned` when the copy has outstanding loans (any loan with no `returned_date`), returning HTTP 400. The handler SHALL reject requests that set `status` to `lent`, returning HTTP 400 — the `lent` status must be set through the loan flow. Other statuses (`lost`, `given-away`, `sold`) SHALL be accepted regardless of loan state.

#### Scenario: Reject owned when loans outstanding
- **WHEN** a PATCH request tries to set `status: "owned"` on a copy with an unreturned loan
- **THEN** the response has status 400 with an error indicating outstanding loans

#### Scenario: Reject manual lent
- **WHEN** a PATCH request tries to set `status: "lent"` (not through the loan flow)
- **THEN** the response has status 400 with an error indicating the loan flow must be used

#### Scenario: Accept lost regardless of loans
- **WHEN** a PATCH request sets `status: "lost"` on a copy with outstanding loans
- **THEN** the response has status 200 and status is updated to `lost`
