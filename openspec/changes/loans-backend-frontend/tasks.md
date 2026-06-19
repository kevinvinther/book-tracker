## 1. Client types

- [x] 1.1 Add `Loan` interface to `client/src/lib/types.ts` with fields: `borrower_name`, `lent_date`, `expected_return_date?`, `returned_date?`
- [x] 1.2 Add `loans?: Loan[]` to the `Copy` interface in `client/src/lib/types.ts`
- [x] 1.3 Add `loans?: Loan[]` to the `CopyFull` interface in `client/src/lib/types.ts`

## 2. Server: readAndWriteCopy + helpers

- [x] 2.1 Extend `readAndWriteCopy` to merge `loans` from the in-memory index (same pattern as `read_throughs` merge at `copies.ts:72-76`)
- [x] 2.2 Add `findLoan(copy, lentDate)` helper — find a loan by `lent_date` (day-part matching, same approach as `findReadThrough`)
- [x] 2.3 Add `recalcCopyStatus(copy)` helper — if any loan has no `returned_date` → `lent`, else → `owned`

## 3. Server: POST /api/copies/:slug/loans

- [x] 3.1 Add `POST /:slug/loans` route inside `createCopiesRouter`
- [x] 3.2 Validate `borrower_name` required and non-empty; `lent_date` defaults to today; `expected_return_date` optional
- [x] 3.3 Validate copy is `owned` and no outstanding loan exists (reject with 400 otherwise)
- [x] 3.4 Auto-pause active read-through via existing `autoPauseActive`
- [x] 3.5 Deduplicate `lent_date` (increment seconds, same pattern as read-through `started_date`)
- [x] 3.6 Create loan entry, set copy status to `lent`, write atomically via `readAndWriteCopy`, return updated copy with HTTP 201

## 4. Server: PATCH /api/copies/:slug/loans/:lentDate

- [x] 4.1 Add `PATCH /:slug/loans/:lentDate` route inside `createCopiesRouter`
- [x] 4.2 Accept `borrower_name`, `lent_date`, `expected_return_date`, `returned_date`
- [x] 4.3 Validate `expected_return_date` >= `lent_date` when both present
- [x] 4.4 Reject `lent_date` change if it conflicts with another loan on the same copy
- [x] 4.5 Recalculate copy status via `recalcCopyStatus` after mutation (triggered by `returned_date` changes)
- [x] 4.6 Write atomically, return updated copy

## 5. Server: DELETE /api/copies/:slug/loans/:lentDate

- [x] 5.1 Add `DELETE /:slug/loans/:lentDate` route inside `createCopiesRouter`
- [x] 5.2 Remove matching loan from `loans[]` array
- [x] 5.3 Recalculate copy status via `recalcCopyStatus`
- [x] 5.4 Write atomically, return updated copy

## 6. Server: Main PATCH status restrictions

- [x] 6.1 In `PATCH /:slug`, reject `status: "owned"` when copy has outstanding loans (any loan with no `returned_date`)
- [x] 6.2 In `PATCH /:slug`, reject `status: "lent"` (must use loan flow)

## 7. Server tests

- [x] 7.1 Test POST create loan: success with required fields, success with all fields, default lent_date, missing borrower_name, non-existent copy, non-owned copy, already-lent copy
- [x] 7.2 Test auto-pause active read-through on loan creation
- [x] 7.3 Test lent_date deduplication
- [x] 7.4 Test PATCH edit loan: set returned_date (status recalc), clear returned_date, edit borrower_name, edit dates, conflicting lent_date, non-existent loan, invalid expected_return_date
- [x] 7.5 Test DELETE loan: remove outstanding (status recalc to owned), non-existent loan
- [x] 7.6 Test main PATCH rejects `owned` with outstanding loans and rejects `lent`; accepts `lost`/`given-away`/`sold`
- [x] 7.7 Test `readAndWriteCopy` loan index merge (verify disk-returned stale loans don't win over index)

## 8. Frontend: CopyDetail loan section

- [x] 8.1 Replace hardcoded "No loans yet." in `CopyDetail.tsx` with a `LoanHistory` component
- [x] 8.2 `LoanHistory` renders a table: columns for Borrower, Lent, Expected, Returned; outstanding loans first; overdue dates in red/orange text
- [x] 8.3 Add "Lend this copy" button (disabled when already lent or not `owned`)
- [x] 8.4 Add "Mark as returned" button per outstanding loan row
- [x] 8.5 Add edit button per loan row (opens inline or modal edit form)
- [x] 8.6 Add delete button per loan row with confirmation dialog
- [x] 8.7 Wire up refetch after mutations (same pattern as `handleRTUpdate`)

## 9. Frontend: LendCopyForm

- [x] 9.1 Create `LendCopyForm` component with borrower name input, lent date picker (defaults today), expected return date picker
- [x] 9.2 POST to `/api/copies/:slug/loans` on submit; show errors; refresh on success

## 10. Frontend: CopyCard loan display

- [x] 10.1 In `CopyCard.tsx`, extract outstanding loans (no `returned_date`)
- [x] 10.2 Display "Lent to [comma-joined borrower names]" below the status badge when outstanding loans exist
- [x] 10.3 First-in-last-out ordering for borrower names (same order as they appear in `loans[]`)

## 11. Frontend: EditCopyModal status restrictions

- [x] 11.1 Remove `lent` from the status dropdown options in `EditCopyModal.tsx`
- [x] 11.2 Disable (gray out) the `owned` option when the copy has outstanding loans
- [x] 11.3 Add tooltip or helper text explaining why `owned` is unavailable
