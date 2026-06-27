## Why

Quick-add must stay quick, but curating a library needs the opposite: the ability to pull metadata from every available source and pick the best value for each field, Calibre-style. Today the only lookup path is first-wins (Google Books, then Open Library fallback) returning a single result, and editing a work or edition happens in cramped modals where covers can only be set by typing a filename — which makes no sense for a web app.

## Supersedes

- **2026-06-17-edition-copy-detail-pages**: Partially superseded — the "Edit Edition" modal (`EditEditionModal`) introduced there is replaced by a dedicated edition edit page.
- **2026-06-17-work-grid-and-detail**: Partially superseded — the "Edit Work" modal (`EditWorkModal`) introduced there is replaced by a dedicated work edit page.

The `2026-06-18-isbn-lookup-service` change is **extended, not superseded**: its single-result `GET /api/lookup` endpoint and cache stay exactly as they are; this change adds a separate multi-source endpoint alongside them.

## What Changes

- New `GET /api/lookup/all?isbn={isbn}&sources={csv}` endpoint that queries the selected sources **in parallel** and returns one normalized result per source. Partial failures are tolerated (a source that errors or 404s is omitted, not fatal). Results are cached per source.
- New dedicated **edition edit page** at `/editions/:slug/edit` that edits both the shared Work fields (title, subtitle, authors, genres, description, cover) and the Edition's own fields (isbn, publisher, publish_date, page_count, format, language, contributors), with cover **upload** (not filename entry) and an enrich-from-sources panel. **BREAKING** for the UI: replaces `EditEditionModal`.
- New dedicated **work edit page** at `/works/:slug/edit` for Work-only fields (incl. series, series_position, original_language, original_publish_year, aliases) with cover upload, and no enrich panel. **BREAKING** for the UI: replaces `EditWorkModal`.
- The Edit buttons on the edition detail and work detail pages navigate to these pages instead of opening modals.

## Capabilities

### New Capabilities
- `multi-source-lookup`: Given an ISBN and a set of selected sources, query each source in parallel and return one normalized result per source, tolerating partial failures and caching each source's result independently.
- `edition-edit-page`: A dedicated client page for editing an edition together with its parent work's shared fields, including cover upload and an ISBN-driven enrich-from-sources panel for field-by-field metadata selection.
- `work-edit-page`: A dedicated client page for editing a work's own fields, including cover upload (no enrich panel).

### Modified Capabilities
- `edition-detail-page`: The "Edit Edition" action navigates to `/editions/:slug/edit` instead of opening a modal.
- `work-detail-page`: The "Edit Work" action navigates to `/works/:slug/edit` instead of opening a modal.

## Impact

- New server module/endpoint: `GET /api/lookup/all` (new router or extension of the lookup router), reusing the existing per-source fetch/normalize helpers in `server/src/lib/lookup.ts` and `downloadCover`.
- New per-source cache files: `.booktracker/cache/{isbn}.{source}.json` (additive; existing `{isbn}.json` untouched).
- New client routes/pages: `/editions/:slug/edit`, `/works/:slug/edit`.
- Removed client components: `EditEditionModal`, `EditWorkModal`.
- Reuses existing `PATCH /api/works/:slug`, `PATCH /api/editions/:slug`, `PATCH /api/copies/:slug`, `POST /api/attachments/upload`, `AuthorSelector`, `GenreSelector`, `CoverImage`.
- No schema changes. No new npm dependencies (Node built-in `fetch`).
