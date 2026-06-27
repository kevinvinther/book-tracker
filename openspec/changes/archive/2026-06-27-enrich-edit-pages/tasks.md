## 1. Backend: multi-source lookup

- [x] 1.1 Add per-source cache helpers to `server/src/lib/lookup.ts` (`readSourceCache`/`writeSourceCache` keyed by `{isbn}.{source}.json`), treating corrupt files as misses
- [x] 1.2 Add a `lookupAllSources(isbn, sources, libraryPath, skipCache)` function that runs the selected per-source lookups (`lookupGoogleBooks`, `lookupOpenLibrary`) via `Promise.allSettled`, tags each with its `source`, returns raw `cover_url` without downloading, and applies the per-source cache
- [x] 1.3 Add `GET /api/lookup/all` (in the lookup router) accepting `isbn`, optional `sources` (csv), and `nocache`; validate `isbn` (400 if missing); return `{ results }` (200, empty array allowed)
- [x] 1.4 Confirm `GET /api/lookup` and quick-add behavior are unchanged
- [x] 1.5 Tests in `server/src/routes/lookup.test.ts` / `server/src/lib/lookup.test.ts`: both sources succeed, source selection limits queries, partial failure omits a source, all-fail returns empty results, missing isbn 400, per-source cache hit/skip, no collision with `{isbn}.json`, no cover download

## 2. Frontend: edition edit page

- [x] 2.1 Add route `/editions/:slug/edit` and a page component; load edition + parent work, render not-found state for a missing edition
- [x] 2.2 Build the form: shared Work fields (title, subtitle, authors via `AuthorSelector`, genres via `GenreSelector`, description) and Edition fields (isbn, publisher, publish_date, page_count, format, language, contributors)
- [x] 2.3 Cover section: image upload via `POST /api/attachments/upload` with preview; "Set as Work cover" (default) and opt-in "also apply to this edition's copies (N)"
- [x] 2.4 Enrich panel: ephemeral per-source checkboxes (default all), "Fetch metadata" button (no fetch on load), skip-cache control; call `GET /api/lookup/all?isbn=&sources=&nocache=`
- [x] 2.5 Field-by-field adoption: show each source's value next to the current value; adopt replaces local form state (scalars and arrays); cover thumbnails from each source selectable as pending cover
- [x] 2.6 Disable/hide enrich with an "Add an ISBN to fetch metadata" hint when the edition has no ISBN; keep manual editing + upload available
- [x] 2.7 Save: `PATCH /api/works/:slug` (work fields) + `PATCH /api/editions/:slug` (edition fields); download chosen source cover (only on save) before writing `primary_cover`; `PATCH` each copy's `cover_image` when opt-in is set; send cleared optionals as `null`; navigate back to the edition detail page on success

## 3. Frontend: work edit page

- [x] 3.1 Add route `/works/:slug/edit` and a page component; load work, render not-found state for a missing work
- [x] 3.2 Build the form for all Work mutable fields (title required, subtitle, authors, genres, description, series, series_position, original_language, original_publish_year, aliases); no enrich panel
- [x] 3.3 Cover upload via `POST /api/attachments/upload` with preview, writing `primary_cover` on save
- [x] 3.4 Save via `PATCH /api/works/:slug` with find-or-create authors; navigate back to the work detail page on success

## 4. Wire up detail pages and retire modals

- [x] 4.1 Change the edition detail page "Edit Edition" action to navigate to `/editions/:slug/edit`
- [x] 4.2 Change the work detail page "Edit Work" action to navigate to `/works/:slug/edit`
- [x] 4.3 Remove `EditEditionModal` and `EditWorkModal` and their references/imports

## 5. Verification

- [x] 5.1 Run server tests and the frontend build/lint (server: 432 passed; the lone `api.test.ts` failure is a pre-existing environmental one, confirmed identical on clean HEAD. client: `tsc -b` + eslint clean)
- [x] 5.2 Manual pass: enrich an edition by ISBN from each source, adopt fields incl. cover, save, verify Work + Edition + (opt-in) copies updated; verify no-ISBN edition disables enrich; verify work edit page and cover upload
