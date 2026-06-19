## Context

The app supports full CRUD for Works, Editions, and Copies. Read-through tracking is built on the Copy entity. The missing piece is freeform journaling — notes, observations, and annotations tied to specific books, editions, or copies.

The `Note` type already exists in `server/src/lib/types.ts`. The in-memory index (`Index` class) already loads, stores, upserts, and removes notes, including the markdown body for search. The `notes/` directory is created on startup. There is no HTTP API, no client types, and no UI for notes. Copy Detail has a hardcoded "No notes yet." placeholder.

Notes are independent markdown files, not embedded in another entity's YAML. This differs from ReadThroughs (which live inside Copy frontmatter). A top-level `/api/notes` router is the right shape.

## Goals / Non-Goals

**Goals:**
- REST API for note CRUD: create, list (with filters), get single, update, delete
- Note files named as `YYYY-MM-DD-HHMMSS.md` in `notes/`
- Notes can reference a Work, Edition, or Copy (at least one required); denormalized chain resolved server-side
- Optional `read_through` association (validated against copy if copy is set) and `context_page`
- Body text search via `?q=` query parameter on the list endpoint
- Client: Note editor modal with `react-markdown` preview toggle
- Client: Notes timeline on Copy Detail, Edition Detail, and Work Detail pages
- Note slug generation via timestamp with collision suffixes

**Non-Goals:**
- Body regeneration — notes appearing in Copy/Edition/Work auto-generated bodies is deferred
- Full-text search engine — `?q=` is basic substring matching, not indexed search
- Pagination — note volume is small for a personal library
- Copy deletion cascade — deleting a copy leaves its notes as dangling files
- Tags controlled vocabulary — note tags are freeform strings

## Decisions

### 1. Top-level `/api/notes` router, not sub-routes of copies

Notes are independent files (unlike ReadThroughs, which live inside Copy frontmatter). A top-level router makes notes discoverable across all entity types and supports filtering by work, edition, or copy via query parameters. This matches the existing pattern where each entity with its own files gets its own route file and router factory.

**Alternatives considered:** Sub-routes of `/api/copies/:slug/notes`. Rejected because notes can now target works or editions directly (no copy required), and top-level routes make cross-entity queries natural.

### 2. Note reference fields relaxed to optional

The `Note` interface previously required `copy`, `edition`, and `work` as non-optional strings. With notes now able to target any entity in the chain, all three become optional. The server requires at least one of `work`, `edition`, or `copy` in the create body and resolves the denormalized chain upward from whatever is provided.

```typescript
// Before (current):
export interface Note {
  copy: string;      // required
  edition: string;   // required  
  work: string;      // required
  // ...
}

// After:
export interface Note {
  work?: string;
  edition?: string;
  copy?: string;
  // at least one of the above must be present
  // ...
}
```

**Resolution rules on create:**
- If `copy` provided → look up copy in index, resolve `edition` and `work` wikilinks from the copy's fields
- If only `edition` provided → look up edition in index, resolve `work` wikilink from the edition's `work` field
- If only `work` provided → set `work` wikilink, `edition` and `copy` remain unset (omitted from YAML)

### 3. Dedicated `generateNoteSlug()` function

Existing `generateSlug()` transliterates names — wrong algorithm for timestamp-based slugs. A new function in `server/src/lib/slug.ts` generates `YYYY-MM-DD-HHMMSS`, checks the set of existing note slugs for collisions, and appends `-2`, `-3`, etc. if needed. This keeps slug authority centralized in one module.

```typescript
export function generateNoteSlug(existingSlugs: Set<string>): string {
  const now = new Date();
  const base = now.toISOString().replace(/:/g, "").replace(/\..*/, "").replace("T", "-");
  // YYYY-MM-DD-HHMMSS
  let slug = base;
  let counter = 2;
  while (existingSlugs.has(slug)) {
    slug = `${base}-${counter}`;
    counter++;
  }
  return slug;
}
```

### 4. Mutable vs immutable fields on PATCH

The fields `work`, `edition`, `copy`, and `date` are immutable after creation. Changing the target entity would break existing wikilinks in the note file (these are denormalized into the YAML). If the user wants to change what entity a note targets, they delete and recreate.

Mutable fields: `body` (the markdown content), `read_through`, `context_page`, `tags`. On every PATCH, `modified` is auto-set to the current ISO 8601 timestamp.

The PATCH handler re-reads the file from disk before applying changes, preserving any fields the client doesn't send. This follows the existing re-read-before-write convention.

### 5. `read_through` validation

If `read_through` is provided in the request body, `copy` must also be provided — a read-through only exists on a copy. The server validates that the copy exists in the index and has a read-through entry whose `started_date` matches the provided value. If validation fails, the request is rejected with a 400 error.

If a note targets a work or edition (no copy), `read_through` is rejected if provided.

### 6. GET /api/notes response includes resolved metadata

To avoid N+1 client requests, single-note GET and list GET responses include resolved metadata objects:

- `copy_meta`: `{ slug, condition, location }` — null if note has no copy
- `edition_meta`: `{ slug, publisher, format, page_count }` — null if not resolvable
- `work_meta`: `{ slug, title, authors_meta[] }` — null if not resolvable
- `read_through_meta`: `{ started_date, status, rating }` — null if not set

The list endpoint resolves metadata for every note in the response array. With personal-library-scale data (hundreds of notes), this is cheap — all data is in-memory.

### 7. Note editor is a modal with markdown preview

Following the project's existing pattern (modals for editing: EditCopyModal, EditWorkModal, FinishModal), the note editor is a modal dialog with:
- A textarea for the markdown body
- A preview pane toggled by a "Preview" tab/button, rendered via `react-markdown`
- Optional fields: `read_through` dropdown (populated from copy's read-throughs), `context_page` number input, `tags` freeform text input

For edit mode, the modal pre-populates all fields from the existing note. For create mode from Copy Detail, the read-through dropdown auto-selects the active read-through (status: "reading") if one exists.

The modal communicates with the parent page via an `onSaved` callback. After save, the parent refetches notes.

### 8. Component decomposition

| Component | Responsibility |
|---|---|
| `NoteEditorModal` | Create/edit modal with textarea, markdown preview toggle, optional fields |
| `NoteTimeline` | Reverse-chronological list of note cards with "Add Note" button |
| `NoteCard` | Single note display: date, read-through context, tags, excerpt (first 200 chars), click to open editor |

`NoteTimeline` is a reusable component embedded in Copy Detail, Edition Detail, and Work Detail. Each page fetches notes with the appropriate filter (`?copy=`, `?edition=`, `?work=`) via a shared `useNotes` hook.

**Alternatives considered:** Inline everything in each detail page. Rejected because the same timeline pattern appears in three places — a component avoids duplication.

### 9. react-markdown for preview

`react-markdown` is the standard React markdown renderer. It sanitizes output (no raw HTML injection by default), supports standard CommonMark, and is lightweight (~20KB). No plugins needed for basic markdown features (headings, bold, italic, lists, links, code blocks).

The dependency is added to `client/package.json`. No separate Markdown library on the server side — the body is stored as-is and rendered client-side.

### 10. Auto-suggest active read-through on Copy Detail note creation

When the user clicks "Add Note" on Copy Detail, the `NoteEditorModal` detects the active read-through (status: "reading") from the copy's data and pre-selects it in the `read_through` dropdown. The user can change or clear it. If `context_page` is also auto-populated with the last logged page from that read-through.

### 11. Body text search via `?q=` parameter

`GET /api/notes?q=keyword` performs a case-insensitive substring match against each note's `body` field using the in-memory index. This is a linear scan — acceptable for personal-scale data. The post-filter is applied after any entity-type filter (`?work=` etc.), so a query like `?work=dune&q=spice` returns only Dune-related notes mentioning "spice."

The index already stores note body text (it's the only entity type where body is preserved in RAM). No changes needed to the index for this to work.

## Risks / Trade-offs

**[Risk] Dangling notes on copy deletion** → If a copy is deleted, notes referencing that copy remain on disk with broken wikilinks. The note timeline on Copy Detail naturally won't show them (the copy doesn't exist). Work Detail could still show them if the note's `work` field was resolved. This is an accepted edge case for v1 — explicit decision to not cascade.

**[Risk] Note slug collision at same-second granularity** → Two notes created in the same second get slugs `YYYY-MM-DD-HHMMSS.md` and `YYYY-MM-DD-HHMMSS-2.md`. The collision suffix handles this correctly. Risk is low — a single user typing notes is unlikely to create two in one second. Automated imports (e.g., from a migration script) could trigger it, but the suffix handles that.

**[Trade-off] No editing of reference fields** → If a user notes something about a Work but later wants to re-target the note to a specific Copy, they must delete and recreate. This is intentional — changing the target would break the wikilink chain in the note file and potentially create confusing backlinks in Obsidian. The delete-and-recreate workflow is simple and clear.

**[Trade-off] In-memory body storage** → All note bodies are stored in the index (unlike other entities where bodies are discarded). For a personal library with thousands of notes averaging a few KB each, this is ~10–30MB of RAM. Acceptable for a local-only desktop app. If this becomes a concern, bodies can be lazy-loaded from disk on search.
