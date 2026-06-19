## 1. Server: Prerequisites

- [x] 1.1 Add `generateNoteSlug()` function to `server/src/lib/slug.ts` — generates `YYYY-MM-DD-HHMMSS` timestamp slug with collision suffix (`-2`, `-3`, etc.)
- [x] 1.2 Relax `Note` interface in `server/src/lib/types.ts` — make `copy`, `edition`, `work` all optional (at least one required at runtime)

## 2. Server: Notes Router

- [x] 2.1 Create `server/src/routes/notes.ts` — `createNotesRouter(index, libraryPath)` factory function
- [x] 2.2 `POST /api/notes` — validate at least one of work/edition/copy, resolve denormalized wikilinks from index, validate read_through against copy if provided, generate slug, generate date/modified timestamps, atomic write, index upsert, return note with resolved metadata
- [x] 2.3 `GET /api/notes` — filter by `?work=`, `?edition=`, `?copy=` query params against index; `?q=` case-insensitive body search; return notes with resolved metadata sorted by date descending
- [x] 2.4 `GET /api/notes/:slug` — single note lookup with resolved metadata; 404 if not found
- [x] 2.5 `PATCH /api/notes/:slug` — re-read from disk, merge mutable fields (body, read_through, context_page, tags), auto-set modified, ignore immutable fields (work, edition, copy, date), atomic write, index upsert
- [x] 2.6 `DELETE /api/notes/:slug` — delete file from disk, remove from index; 404 if not found

## 3. Server: Integration

- [x] 3.1 Import and mount `createNotesRouter()` at `/api/notes` in `server/src/index.ts`
- [x] 3.2 Verify index body text loading works for notes (the index already loads note bodies; confirm they are accessible for `?q=` search and response inclusion)
- [x] 3.3 Create `server/src/routes/notes.test.ts` — test suite covering: create (all entity types, read_through validation, reference validation, collision slugs), list (filters, search, empty), get (found, not found), update (mutable fields, immutable ignored, re-read merge), delete (found, not found)

## 4. Client: Types and Data Layer

- [x] 4.1 Add `Note`, `NoteCopyMeta`, `NoteEditionMeta`, `NoteWorkMeta`, `NoteReadThroughMeta` interfaces to `client/src/lib/types.ts`
- [x] 4.2 Add `react-markdown` dependency to `client/package.json`
- [x] 4.3 Create `client/src/hooks/useNotes.ts` — accepts `{ work?, edition?, copy?, q? }`, fetches `GET /api/notes` with query params, exposes `notes`, `loading`, `error`, `refetch`

## 5. Client: Components

- [x] 5.1 Create `NoteCard` component — displays date, read-through context badge (if `read_through_meta`), tags, body excerpt (first 200 chars), and entity context (copy/work/edition meta). Click opens `NoteEditorModal` in edit mode
- [x] 5.2 Create `NoteTimeline` component — renders `NoteCard` list reverse-chronological (newest first), "Add Note" button at top, "No notes yet." empty state. Props: entity type + slug for filtering and for passing to the editor modal's auto-targeting
- [x] 5.3 Create `NoteEditorModal` component — modal dialog with: textarea for body, preview toggle (react-markdown render), read_through dropdown, context_page input, tags input. Supports create mode (pre-targets entity, auto-selects active read-through on Copy Detail) and edit mode (pre-populates from existing note). Save/Delete actions with confirmation for delete

## 6. Client: Page Integrations

- [x] 6.1 Replace notes placeholder in `CopyDetail.tsx` with `NoteTimeline` component, passing `copySlug` for auto-targeting and `?copy=` filtering
- [x] 6.2 Add "Recent Notes" section to `WorkDetail.tsx` using `NoteTimeline` component with `?work=` filter and work auto-targeting
- [x] 6.3 Add "Notes" section to `EditionDetail.tsx` using `NoteTimeline` component with `?edition=` filter and edition auto-targeting
