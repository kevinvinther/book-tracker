> ⚠️ **Superseded by [`enrich-edit-pages`](../../2026-06-27-enrich-edit-pages/proposal.md)** (archived 2026-06-27)
>
> The "Edit Work" modal (`EditWorkModal`) introduced here is replaced by a dedicated work edit page at `/works/:slug/edit`.

---

## Why

The backend has full CRUD for Work, Author, Edition, Copy, and Series, but there is no UI to browse or manage any of it. The Work Grid and Work Detail pages are the front door of the app — without them there is no way to see the library at all.

## What Changes

- New Work Grid page (`/`): responsive cover grid with live search, sort, and genre filter
- New Work Detail page (`/works/:slug`): metadata, editions grouped with their copies, series link, edit form
- New minimal attachment-serving endpoint so cover images stored under the library's `attachments/` directory can be rendered by `<img>` tags
- `GET /api/works/:slug` extended to resolve `authors_meta` (name per author) and `series_meta` (name, if linked) so the frontend doesn't need N+1 requests
- `GET /api/copies` extended with a list endpoint supporting `?work=` and `?edition=` filters, needed to show copy cards grouped under each edition on Work Detail

**Deferred (not in this change, because the backing data doesn't exist yet):**
- Reading-status badges/filtering (depends on the not-yet-built read-through backend)
- Note counts on copy cards (depends on the not-yet-built notes backend)
- Loan badges (depends on the not-yet-built loans backend)

These will land as modifications to Work Detail/copy cards once their respective backends exist.

## Capabilities

### New Capabilities
- `work-grid-page`: Searchable, sortable, filterable grid of Work cover thumbnails as the app's home page
- `work-detail-page`: Full Work detail view — metadata, series link, editions grouped with copy cards, inline edit
- `attachment-serving`: Serves files from the library's `attachments/` directory over HTTP so cover images can be displayed

### Modified Capabilities
- `work-api`: `GET /api/works/:slug` additionally resolves `authors_meta` and `series_meta`
- `copy-api`: adds `GET /api/copies` list endpoint with optional `?work=`/`?edition=` filters

## Impact

- New files under `client/src/pages/` (Work Grid, Work Detail) and supporting components/hooks
- `client/src/App.tsx` — add `/works/:slug` route, replace `/` route content
- `server/src/routes/works.ts` — extend `GET /:slug` handler
- `server/src/routes/copies.ts` — add `GET /` handler
- New `server/src/routes/attachments.ts` (or equivalent static-serving wire-up) + registration in `server/src/index.ts`
