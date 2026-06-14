## Why

The library directory and in-memory index exist, but there's no way to create or manage Work entities through the API. Works are the central entity in the data model — they anchor editions, copies, notes, authors, and series. Without a Work CRUD API, no data can enter the system programmatically, and the frontend has nothing to display.

## What Changes

- **`POST /api/works`** — create a new Work file with auto-generated slug, persisted atomically to `works/{slug}.md`, indexed in memory, returns the created work
- **`GET /api/works`** — list all works with optional `?q=` search (delegates to `index.searchWorks`), `?sort=` (title, author, created_at), and `?order=` (asc, desc)
- **`GET /api/works/:slug`** — return a single work with resolved edition count and copy count from the index
- **`PATCH /api/works/:slug`** — update work fields (title, subtitle, authors, original_language, original_publish_year, genres, description, series, series_position, primary_cover). Re-reads the file from disk before writing to merge external changes. Slug is never modified.
- **`DELETE /api/works/:slug`** — delete a work. Orphan-protected: refuses if editions reference this work. Accepts `?cascade=true` to force-delete the work and all linked editions, copies, and notes.
- **`POST /api/works/:slug/aliases`** — append an alias to the work's aliases list
- **`DELETE /api/works/:slug/aliases`** — remove an alias from the work's aliases list

## Capabilities

### New Capabilities

- `work-api`: Full REST CRUD for Work entities including creation with auto-generated slug, listing with search/sort, single retrieval with resolved relation counts, field-level PATCH with re-read-before-write merge, orphan-protected deletion with cascade override, and alias management.

### Modified Capabilities

- `in-memory-index`: `searchWorks` now also matches against `work.aliases[]` in addition to title, author names, and genres

## Impact

- New file: `server/src/routes/works.ts` (Work route handlers)
- Modified: `server/src/index.ts` (register `/api/works` routes)
- No new dependencies
- No client changes (frontend work pages come later)
- Sets the pattern for all subsequent entity APIs (Author, Edition, Copy, Series)
