## Context

The app currently supports full CRUD for copies (physical books), but has no mechanism for tracking reading activity — page counts, progress, status transitions, or re-read history. The `read_throughs[]` field already exists in the `Copy` interface and is loaded by the in-memory index, but no endpoints touch it. This change adds the backend endpoints to manage read-throughs stored in the Copy file's frontmatter.

## Goals / Non-Goals

**Goals:**
- Start new read-throughs with auto-initialized page log
- Log page counts with validation against edition metadata
- Transition read-through status through the full state machine (reading → finished, dnf, paused; paused → resumed)
- Correct mistakes by editing or deleting individual page log entries
- Delete entire read-throughs from history
- Enforce single active read-through per copy
- Block read-throughs on lent copies

**Non-Goals:**
- Frontend UI for read-through display or interaction
- Body regeneration to render read-through tables in markdown
- Loan interaction (auto-pausing read-throughs when lending)
- Notes linked to read-throughs

## Decisions

### 1. Routes live in the existing copies router

The six read-through endpoints are sub-routes of `/api/copies/:slug/read-throughs`. They share the copies router's dependencies (`Index`, `libraryPath`) and mutation patterns. Express supports nested path matching within a single router; no separate file or top-level mount needed.

### 2. Date format in URL params

`started_date` and page log `date` are formatted as `YYYY-MM-DD` in URL path parameters. This avoids encoding issues with `T` separators and matches the day-granularity of read-through dates. The stored frontmatter retains ISO 8601 format; URL extraction strips time components.

### 3. Read-through identifier

A read-through is identified by its `started_date` within a copy's `read_throughs[]` array. This is a stable key — replacing a date would effectively create a new read-through. The user can backdate `started_date` when creating, but cannot change it later via edit.

### 4. Auto-pause on conflict

When a new read-through starts or a paused one resumes, if another read-through on the same copy has `status: reading`, the conflicting one is auto-paused (status set to `paused`). The response includes a `warning` field describing which read-through was paused. This matches the spec's UX intent: the user's latest action is treated as authoritative.

### 5. Initial page log entry

Starting a new read-through automatically creates a `page_log` entry with `page: 0` and `date: started_date`. This establishes a baseline and avoids requiring the user to explicitly log "page 0" as a separate step.

### 6. finish requires page == page_count (when known)

To mark a read-through as `finished`, the page log must already contain an entry where `page == edition.page_count`. If `page_count` is unknown (Edition has no `page_count` field), this check is skipped. This ensures the finished state is grounded in actual reading data.

### 7. dnf optionally captures current page

When marking a read-through as `dnf`, the client may pass an optional `page` field. If provided, a final page log entry is appended (with `date: finished_date`) before freezing. If omitted, the existing last entry becomes the final position.

### 8. PATCH `/:startedDate` uses a `status` body field

All four status transitions (finish, dnf, pause, resume) share a single `PATCH` endpoint. The desired status is passed as `req.body.status`. Side effects (setting `finished_date`, auto-pausing others) are determined server-side from the status value.

### 9. Entry editing replaces date and page

Editing a page log entry accepts both `date` and `page` as mutable. After updating, the `page_log` array is re-sorted by date ascending, then validated for page monotonicity. This supports correcting both the recorded date and the page number.

### 10. Re-read-before-write applies to every mutation

Every read-through endpoint follows the same pattern as the existing PATCH `/api/copies/:slug`: re-read the Copy file from disk, pick up any external changes (Obsidian edits), merge the read-through mutation, write atomically, then update the index.

### 11. Response always returns the full Copy

All read-through endpoints return the full updated Copy object, consistent with the existing `/api/copies/:slug` GET behavior. The frontend needs the complete state to re-render.

### 12. No body regeneration in this change

Bodies will remain empty strings (`""`) on writes until the body regeneration engine is wired in separately.

## Risks / Trade-offs

**[Risk] Inconsistent state if server crashes between write and index update** → The write is atomic (temp file + rename), so disk is never corrupted. On restart, the index is rebuilt from disk — any incomplete mutation is simply lost, which is acceptable for a local-only app.

**[Trade-off] Read-throughs stored inline in Copy rather than separate files** → This was a pre-existing design decision (see data model in types). It means editing a read-through requires reading/writing the entire Copy file, but since Copy files are small (<5KB), this is not a performance concern.

**[Risk] `page_count` may be absent from Edition** → Upper-bound page validation is skipped with a soft warning in the response. The user can update the Edition's page count to enable full validation.
