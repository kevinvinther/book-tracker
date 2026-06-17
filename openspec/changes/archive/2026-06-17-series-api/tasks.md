## 1. Index support

- [x] 1.1 Add `getWorksBySeries(seriesSlug: string): Work[]` to `server/src/lib/index.ts`, filtering `getAllWorks()` by `series === "[[series/{seriesSlug}]]"`

## 2. Series router

- [x] 2.1 Create `server/src/routes/series.ts` with `createSeriesRouter(index, libraryPath)` following the existing router factory pattern
- [x] 2.2 `POST /` — validate `name` is non-empty, generate slug via `generateSlug` against the global slug set, build the Series object (`type`, `slug`, `name`, optional `total_works`/`aliases`, `created_at`, `_schema`), write file to `series/{slug}.md`, upsert into index, return 201
- [x] 2.3 `GET /` — return `index.getAllSeries()`
- [x] 2.4 `GET /:slug` — 404 if missing; otherwise resolve `getWorksBySeries(slug)`, map to `{ slug, title, series_position }`, sort ascending by `series_position` (undefined sorts last), return series + `works`
- [x] 2.5 `PATCH /:slug` — 404 if missing; reject empty `name`; re-read file, merge mutable fields (`name`, `total_works`, `aliases`), preserve `slug`/`type`/`created_at`/`_schema`, write atomically, upsert index, return updated series
- [x] 2.6 `DELETE /:slug` — 404 if missing; compute linked works via `getWorksBySeries`; if any exist and `?cascade=true` not set, return 409 with linked work count; if `?cascade=true`, for each linked work re-read its file, delete `series`/`series_position` keys, write back, upsert into index; then delete the series file and remove from index; return 200

## 3. Wiring

- [x] 3.1 Import and register `createSeriesRouter` in `server/src/index.ts` at `/api/series`

## 4. Tests

- [x] 4.1 Create `server/src/routes/series.test.ts` covering: create (defaults + optional fields + missing name), list, get-with-works (sorted by position, position-less last, no works, not found), patch (name, total_works, empty-name rejection, ignore slug/type changes, not found), delete (no linked works, linked works without cascade returns 409, cascade clears fields from work files and index, not found)
- [x] 4.2 Add a unit test for `Index.getWorksBySeries` in `server/src/lib/index.test.ts` (or equivalent existing test file)
- [x] 4.3 Run full test suite, confirm all tests pass

## 5. Manual verification

- [x] 5.1 Start the dev server, exercise create/list/get/patch/delete via curl, confirm files on disk match spec examples and cascade delete clears `series`/`series_position` from linked Work files
