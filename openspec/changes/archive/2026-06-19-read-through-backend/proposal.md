## Supersedes

None.

## Why

Users can add books to their library, but they can't track reading — page logging, progress, pauses, re-reads, or ratings. This is the diary half of a book diary. Without it, the app is a catalog.

## What Changes

- Six new REST endpoints under `/api/copies/:slug/read-throughs` for the full read-through lifecycle
- Start a new read-through with auto-created initial page log entry
- Log page counts mid-read, with validation against the edition's page count
- Change read-through status: finish (with rating), DNF, pause, resume
- Edit or delete individual page log entries to correct mistakes
- Delete an entire read-through to remove it from history
- Auto-pause existing active read-throughs to enforce single-active-read-through per copy
- Block read-through creation on copies with status `lent`

## Capabilities

### New Capabilities
- `read-through-api`: Backend state machine for read-throughs — start, page logging, status transitions (finish/dnf/pause/resume), entry editing, and deletion. All endpoints are sub-routes of the copies router.

### Modified Capabilities
None.

## Impact

- **Server routes**: New read-through endpoints added to `server/src/routes/copies.ts`
- **Server types**: `ReadThrough` and `PageLog` interfaces already exist in `server/src/lib/types.ts`; no schema changes needed
- **File I/O**: Reads and writes the Copy file to mutate `read_throughs[]` in frontmatter; re-read-before-write pattern preserved
- **Index**: Copy entries updated via existing `index.upsert("copy", ...)` after each mutation
- **Client types**: `Copy` interface in `client/src/lib/types.ts` may need `read_throughs[]` added for response consumption (but frontend display is out of scope for this change)
