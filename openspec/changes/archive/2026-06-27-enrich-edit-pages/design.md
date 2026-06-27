## Context

The app stores books as Markdown + YAML frontmatter, split across three entities: **Work** (canonical title/authors/genres/description/cover), **Edition** (a specific publication: isbn/publisher/date/pages/format/language/contributors), and **Copy** (a physical item). Metadata lookup today (`server/src/lib/lookup.ts`) is first-wins — `lookupISBN` tries Google Books, falls back to Open Library, returns one `LookupResult`, downloads the cover, and caches one `{isbn}.json` file. Quick-add (`AddBook.tsx`) consumes that. Editing is done in two cramped modals (`EditEditionModal`, `EditWorkModal`) where covers are set by typing a filename.

This change keeps quick-add untouched and adds a Calibre-style enrich workflow on dedicated edit pages: fetch from all (selected) sources at once, compare, and adopt values field by field.

## Goals / Non-Goals

**Goals:**
- A multi-source endpoint that returns each source's normalized result independently, tolerating partial failure, with per-source caching.
- Dedicated `/editions/:slug/edit` page editing both shared Work fields and Edition fields, with cover upload and an ISBN-driven enrich panel.
- Dedicated `/works/:slug/edit` page for Work-only fields with cover upload.
- Retire both edit modals; keep quick-add and `GET /api/lookup` exactly as-is.

**Non-Goals:**
- New providers (Amazon, Goodreads, Google Images, Kindle covers) — separate spec.
- Title/author search (ISBN-only here).
- A per-edition cover field in the schema.
- Garbage-collecting orphaned attachment files when a cover is replaced.

## Decisions

### Separate `GET /api/lookup/all` endpoint rather than changing `GET /api/lookup`
Quick-add depends on the single-result, cover-downloading, fast path. Rather than reshape it, add a sibling endpoint that returns `{ results: SourceResult[] }`. This isolates risk and keeps quick-add fast. The two existing per-source functions — `lookupGoogleBooks` and `lookupOpenLibrary` (already exported, each returning `Omit<LookupResult, "source">`) — are reused directly; the new endpoint just runs the selected ones via `Promise.allSettled` and tags each with its `source`. Alternative considered: one endpoint with a `mode` flag — rejected as it muddies the cache shape and quick-add's contract.

### No cover download in the multi-source endpoint
`lookupISBN` downloads the cover eagerly. For enrich we instead return raw `cover_url`s and let the client preview remotely, downloading only the chosen cover at save time via the existing `downloadCover`. This avoids accumulating orphaned files in `attachments/` for covers the user previews but rejects. The per-source normalizers already produce `cover_url` without forcing a download, so the endpoint simply skips the download step `lookupISBN` performs.

### Per-source cache files `{isbn}.{source}.json`
The existing `{isbn}.json` format holds a single merged result and can't represent multiple sources. Per-source files are additive, never collide with the quick-add cache, and let each source be cached/skipped independently. `nocache=1` forces a refetch and overwrite, mirroring AddBook's "skip cache" affordance. Corrupt/unreadable per-source files are treated as misses (same policy as the existing cache).

### Edition edit page owns shared Work fields; save fans out to existing PATCH routes
The richest enrichable metadata (description, genres, cover, title, authors) lives on the Work, so an edition-only editor would be nearly useless for enrich. The page therefore edits Work fields (title, subtitle, authors, genres, description, cover) and Edition fields together. On save it issues `PATCH /api/works/:slug` and `PATCH /api/editions/:slug` separately (both already exist and merge field-by-field, treating `null` as delete). When the cover copy opt-in is set, it additionally `PATCH`es each copy of the edition. No new write endpoints are needed.

### Adopt = replace, applied to local form state only
Each enrichable field shows the current editable value next to each source's offering. "Adopt" overwrites the field's local state (scalars and arrays alike); nothing persists until save. This matches the Calibre mental model and keeps the page a plain controlled form. Authors flow through `AuthorSelector` (name-based) and on save through the server's existing find-or-create; genres through `normalizeGenre` on the server, as today.

### Cover defaults to Work, with a copy opt-in
Editions have no cover field. The canonical, everywhere-visible cover is `Work.primary_cover`, so that's the default target. A checkbox optionally also writes the cover to every copy of the edition (`Copy.cover_image`) for cases where a copy's scanned cover is wrong. The work edit page sets `primary_cover` only (a work's copies span multiple editions, so a copy opt-in there would be ambiguous).

### Two real pages, modals retired
Side-by-side source comparison needs more room than a dialog. `/editions/:slug/edit` and `/works/:slug/edit` become routed pages; the detail pages' Edit buttons navigate to them. `EditEditionModal` and `EditWorkModal` are removed. The work edit page absorbs the full set of Work fields the modal had (series, original_language, aliases, etc.) so nothing is lost.

## Risks / Trade-offs

- **One result per source may be too coarse for ambiguous ISBNs** → Accepted for now; the endpoint shape (`results` array) leaves room to return multiple candidates per source later without a breaking change.
- **Replacing a cover orphans the old attachment file** → Accepted (out of scope); non-destructive repointing is safe, cleanup can come later.
- **Editing Work fields from the edition page overlaps with the work edit page** → Intentional; both write through the same PATCH routes, and re-read-before-write on the server keeps untouched fields intact.
- **Per-source cache can grow** → Small JSON files keyed by ISBN+source; same footprint characteristics as the existing cache.
- **Rate limits on Google Books** → Mitigated by ephemeral per-source toggles defaulting on but fully deselectable, fetch only on explicit button click, and per-source caching.

## Migration Plan

No data migration. Cache files are additive. Deploy is a code-only change; rollback is reverting the code (per-source cache files are harmless if left behind). The Docker live app reindexes on restart per the usual flow.
