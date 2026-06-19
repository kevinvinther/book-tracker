## Context

The read-through and notes systems are complete. Copies now have full read-tracking and note-taking, but no loan tracking. The copy detail page has a hardcoded empty state for loans. Copy cards on the work detail page explicitly defer loan badges.

Loans are per-copy (not per-edition) and stored in the copy's frontmatter `loans[]` array. The `Loan` type already exists server-side. No new entity types or directory structures are needed — loans are embedded in the existing copy file, just like `read_throughs[]`.

The existing read-through sub-route pattern under `server/src/routes/copies.ts` provides the blueprint: `readAndWriteCopy()` for atomic operations, index merge for Docker overlay2 safety, date-based identification, and deduplication.

## Goals / Non-Goals

**Goals:**
- Full CRUD REST API for loans on copies (lend, edit, return, delete)
- Copy status (`lent`/`owned`) automatically derived from loan state
- Auto-pause active read-throughs when a copy is lent
- Loan History table on Copy Detail with overdue highlighting
- Loan badges with borrower names on copy cards (Work Detail and Edition Detail)
- Remove manual status manipulation that could conflict with loan state

**Non-Goals:**
- No borrower entity or wikilinks (borrower is free text)
- No email/notification for overdue books
- No editing or deleting loans through the main copy PATCH endpoint
- No multi-user or shared library features

## Decisions

### Loans follow the read-through sub-route pattern

Loans live under `/api/copies/:slug/loans`, mirroring the read-through routes. Each loan is identified by `lent_date` in the URL path — same approach as read-throughs using `started_date`.

**Alternatives considered:**
- **Separate top-level loan router** (`/api/loans`): Adds indirection. Loans are copy state; keeping them under the copies router is simpler and localizes copy-level mutations.
- **Loan IDs instead of date-based identification**: Adds complexity with no benefit. Date-based keys are human-readable in URLs and consistent with read-throughs.

### Single flat PATCH, no dedicated `/return` endpoint

One `PATCH /api/copies/:slug/loans/:lentDate` edits any loan field — `borrower_name`, `lent_date`, `expected_return_date`, `returned_date`. When `returned_date` is set or cleared, the server recalculates copy status.

**Why not a dedicated `/return` endpoint:** Read-throughs have complex state transitions (auto-log page_count on finish, auto-pause others on resume) that justify dedicated endpoints. Loan return is simpler — setting a date field — and doesn't warrant a separate route. A flat PATCH keeps the API surface smaller.

### Copy status derived from loan state

A `recalcCopyStatus()` function runs after every loan mutation (create, edit, delete):
- If any loan has no `returned_date` → status is `lent`
- Otherwise → status is `owned`

The main copy PATCH (`PATCH /:slug`) rejects attempts to manually set `status: owned` while outstanding loans exist, and rejects `status: lent` entirely (only the loan flow can set it). Other statuses (`lost`, `given-away`, `sold`) are unrestricted — the user can mark a copy as lost even while it's lent out, and the loan records remain as-is.

### `readAndWriteCopy` merges loans from index

Same Docker overlay2 protection already applied to `read_throughs`: after reading the canonical file from disk, prefer the index's `loans` array. This prevents losing loan data on filesystems where writes aren't immediately visible to subsequent reads (Docker overlay2, some network mounts).

```ts
if (existing.loans && existing.loans.length > 0) {
  copy.loans = existing.loans;
} else if (!copy.loans) {
  copy.loans = [];
}
```

### Only one outstanding loan at a time

`POST /api/copies/:slug/loans` validates that no existing loan has `returned_date` unset. A physical copy can only be with one person at a time. The `loans[]` array supports multiple historical loans — returned loans coexist with the active one.

### `lent_date` deduplication

If a loan with the same `lent_date` already exists on the copy, the handler increments seconds (`T00:00:01Z`, `T00:00:02Z`, etc.) until the date is unique. Same algorithm as `started_date` deduplication for read-throughs. On PATCH, if the user edits `lent_date` to one that conflicts, the edit is rejected with a validation error.

### Frontend structure

- **CopyDetail page**: Loan History table replaces the "No loans yet." placeholder. New `LendCopyForm` component (or inline) for creating loans. "Mark as returned" button per outstanding loan. Edit and delete actions per loan row. Overdue dates styled in red/orange.
- **CopyCard**: For copies with outstanding loans, display "Lent to [comma-joined borrower names]" below the status badge.
- **EditCopyModal**: Remove `lent` from the status dropdown. Disable `owned` when the copy has outstanding loans (grayed out, not selectable).

### When to auto-pause

Auto-pause happens only on loan creation (POST). If an active read-through exists (`status: "reading"`), it's paused before the copy status changes to `lent`. On return, the read-through stays paused — the user resumes manually. This matches the spec: lending pauses, returning does not auto-resume.

## Risks / Trade-offs

- **Docker overlay2 write visibility**: Mitigated by index merge in `readAndWriteCopy` — same protection already in place for read-throughs.
- **Main PATCH bypass**: The main `PATCH /:slug` reads disk directly, not through `readAndWriteCopy`. If a loan is written and immediately followed by a copy edit, the PATCH could theoretically read stale loan data on Docker overlay2. Mitigation: the PATCH preserves whatever `loans` it reads from disk (it only touches `MUTABLE_FIELDS`); on normal filesystems this is fine. Long-term fix would route all copy mutations through `readAndWriteCopy`.
- **Borrower name collisions**: Borrower is free text. Two different people named "Sarah" will merge in the copy card display. Acceptable for v1 — this is a personal tracking tool, not a library management system.
- **Lost/sold while lent**: If a copy is marked `lost` while it has outstanding loans, the loan records remain. No cleanup or auto-return. The user manages these edge cases manually.
