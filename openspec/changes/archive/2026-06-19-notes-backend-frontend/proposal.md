## Supersedes

None.

## Why

Users can catalog books and track reading progress, but they can't write diary entries, observations, or annotations tied to specific works, editions, or copies. Without freeform notes, the app is a catalog and log — not a diary. This completes the journal half of a book diary.

## What Changes

- New REST endpoints under `/api/notes` for full note CRUD: create, list (with filtering), get single, update, delete
- Note files stored as independent markdown files in `notes/`, named by timestamp (`YYYY-MM-DD-HHMMSS.md`)
- Notes can target a Work, an Edition, or a Copy (at least one required); denormalized reference chain resolved server-side
- Note references a specific read-through session and context page (both optional)
- List endpoint supports `?work=`, `?edition=`, `?copy=` filters and `?q=` for body text search
- Client: `Note` type added to client types
- Client: Note editor modal with markdown preview toggle (using `react-markdown`)
- Client: Copy Detail, Edition Detail, and Work Detail pages gain a notes section with reverse-chronological timeline
- Client: Note editor auto-suggests the active read-through when creating from Copy Detail
- `read_through` field validated against the copy's read-throughs array when a copy is specified
- No copy-deletion cascade — deleting a copy leaves its notes as dangling files

## Capabilities

### New Capabilities
- `notes-api`: REST API for creating, reading, updating, and deleting freeform markdown notes with denormalized wikilink references
- `notes-frontend`: Note creation/editing modal with markdown preview, notes timeline on detail pages, and note display with context metadata

### Modified Capabilities
- `copy-detail-page`: Notes section replaces static placeholder with full notes timeline and "Add Note" action
- `work-detail-page`: New "Recent Notes" section aggregating notes across all copies of the work
- `edition-detail-page`: New notes section displaying notes targeting the edition

## Impact

- **New route file**: `server/src/routes/notes.ts` — exported `createNotesRouter()` mounted at `/api/notes` in `server/src/index.ts`
- **Server types**: `Note` interface relaxed — `copy`, `edition`, `work` all become optional (at least one required)
- **Server slug**: New `generateNoteSlug()` function in `server/src/lib/slug.ts` — timestamp-based with collision suffixes
- **Server index**: Already supports notes fully; verify body text search works
- **Client types**: New `Note` interface in `client/src/lib/types.ts`; new `NoteMeta` types for resolved context
- **Client components**: New `NoteEditorModal`, `NoteTimeline`, `NoteCard` components
- **Client dependencies**: New `react-markdown` dependency
- **Client hooks**: New `useNotes` hook for fetching filtered note lists; extended `useCopy`, `useEdition`, `useWork` hooks (if needed)
- **Client pages**: `CopyDetail.tsx`, `EditionDetail.tsx`, `WorkDetail.tsx` — Notes section replaces or extends current state
- **Tests**: New test file `server/src/routes/notes.test.ts` covering all CRUD endpoints
