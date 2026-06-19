## Supersedes

None.

## Why

The copy detail page has a hardcoded "No loans yet." placeholder and copy cards show no loan information. Users can't lend books, track who has them, or see loan history. Lending is a core diary action — without it, the app can't answer "where is my copy of Dune?"

## What Changes

- Three new REST endpoints under `/api/copies/:slug/loans` for full loan CRUD: create (lend), edit, delete
- Loan creation auto-pauses any active read-through and sets copy status to `lent`
- Loan return (setting `returned_date` via PATCH) recalculates copy status back to `owned` if no outstanding loans remain
- Loan deletion recalculates copy status
- Only one outstanding (unreturned) loan per copy at a time
- `readAndWriteCopy` merges `loans` from the in-memory index (same Docker overlay2 protection as `read_throughs`)
- Copy status `lent` and `owned` are derived from loan state — main PATCH rejects manual transitions that conflict with outstanding loans
- `lent_date` deduplication (increment seconds, same pattern as `started_date`)
- Config retrieval includes `loans` in the Copy and CopyFull types

## Capabilities

### New Capabilities
- `loan-api`: Backend REST API for loan lifecycle — create, edit, return, delete. Loans embedded in copy frontmatter's `loans[]` array. Copy status derived from loan state. Auto-pause active read-throughs on lend. Validation: one outstanding loan at a time, borrower_name required, valid dates, status conflicts blocked.
- `loan-frontend`: Display and interaction layer for loans — Loan History table on Copy Detail (Borrower, Lent, Expected, Returned with overdue color styling), "Lend this copy" button with form, "Mark as returned" button, edit and delete actions per loan row. Copy cards show outstanding borrower names when lent. EditCopyModal restricts status dropdown to prevent manual `lent`/`owned` manipulation.

### Modified Capabilities
- `copy-api`: Loan endpoints added (POST/PATCH/DELETE `/:slug/loans`). `readAndWriteCopy` merges `loans` from index. Main PATCH rejects `status: owned` when outstanding loans exist and rejects `status: lent` (must use loan flow). Client types gain `Loan` and `loans?: Loan[]`.
- `copy-detail-page`: Loan History section replaces empty state with full loan table and CRUD actions. "Lend this copy" button added. EditCopyModal removes `lent` from status dropdown, disables `owned` when outstanding loans exist.
- `work-detail-page`: Copy cards display "Lent to [borrower names]" when the copy has outstanding loans (replacing previous "SHALL NOT" deferral).

## Impact

- **Server routes**: New loan endpoints added to `server/src/routes/copies.ts`; `readAndWriteCopy` extended to merge `loans` from index; main PATCH validation tightened for loan-state consistency
- **Server types**: `Loan` interface already exists; no schema changes
- **Client types**: New `Loan` interface; `Copy` and `CopyFull` gain `loans?: Loan[]`
- **Client pages**: `CopyDetail.tsx` — Loan History section rebuilt; `EditCopyModal.tsx` — status dropdown restricted
- **Client components**: `CopyCard.tsx` — shows outstanding borrower names for lent copies; new components for loan form and table
- **Tests**: New loan API tests in `copies.test.ts` (or new `loans.test.ts`)
