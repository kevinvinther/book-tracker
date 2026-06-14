## 1. Route File Structure

- [x] 1.1 Create `server/src/routes/` directory
- [x] 1.2 Create `server/src/routes/works.ts` — Express Router with all Work endpoints
- [x] 1.3 Register the works router in `server/src/index.ts` at `/api/works`

## 2. POST /api/works — Create Work

- [x] 2.1 Validate `title` is present and non-empty in request body, return 400 if missing
- [x] 2.2 Extract `authors` from request body, compute first author name string for slug generation
- [x] 2.3 Generate slug via `generateSlug(title, existingSlugs, firstAuthorName)`
- [x] 2.4 Build Work frontmatter object with generated slug, type `"work"`, `created_at` set to `new Date().toISOString()`, `_schema: 1`
- [x] 2.5 Merge optional fields from request body (subtitle, authors, original_language, original_publish_year, genres, description, series, series_position, primary_cover)
- [x] 2.6 Write file via `writeFile` with empty body (placeholder)
- [x] 2.7 Update index via `index.upsert("work", work)`
- [x] 2.8 Return 201 with the created work JSON

## 3. GET /api/works — List Works

- [x] 3.1 Read optional `?q=`, `?sort=`, and `?order=` query parameters
- [x] 3.2 If `?q=` is provided, use `index.searchWorks(query)`; otherwise use `index.getAllWorks()`
- [x] 3.3 Implement sorting by `title` (localeCompare, case-insensitive), `author` (resolve first author name from index), and `created_at` (lexicographic ISO 8601)
- [x] 3.4 Default sort: `created_at` descending
- [x] 3.5 Return 200 with sorted works array

## 4. GET /api/works/:slug — Get Single Work

- [x] 4.1 Look up work via `index.getWork(slug)`, return 404 if not found
- [x] 4.2 Resolve `edition_count` from `index.getEditionsByWork(slug).length`
- [x] 4.3 Resolve `copy_count` from `index.getCopiesByWork(slug).length`
- [x] 4.4 Return 200 with work JSON including resolved counts

## 5. PATCH /api/works/:slug — Update Work

- [x] 5.1 Look up work via `index.getWork(slug)`, return 404 if not found
- [x] 5.2 Re-read the file from disk via `readFile` to get latest frontmatter
- [x] 5.3 Define list of mutable fields: title, subtitle, authors, original_language, original_publish_year, genres, description, series, series_position, primary_cover
- [x] 5.4 Merge: for each mutable field present in request body, overwrite in frontmatter; for immutable fields (slug, type, created_at, _schema), keep from disk
- [x] 5.5 If `title` is being updated, validate it is non-empty
- [x] 5.6 Write updated frontmatter via `writeFile` with same body as on disk
- [x] 5.7 Update index via `index.upsert("work", updatedWork)`
- [x] 5.8 Return 200 with the updated work JSON

## 6. DELETE /api/works/:slug — Delete Work

- [x] 6.1 Look up work via `index.getWork(slug)`, return 404 if not found
- [x] 6.2 Check `index.getEditionsByWork(slug)`. If editions exist and `?cascade` is not `"true"`, return 409 with error
- [x] 6.3 If cascade: for each edition, find all copies via `index.getCopiesByEdition(editionSlug)`, find all notes via `index.getNotesByCopy(copySlug)`, delete note files + index entries, delete copy files + index entries, delete edition files + index entries
- [x] 6.4 Delete the work file via `deleteFile`
- [x] 6.5 Remove work from index via `index.remove("work", slug)`
- [x] 6.6 Return 200 with success message

## 7. POST /api/works/:slug/aliases — Add Alias

- [x] 7.1 Look up work via `index.getWork(slug)`, return 404 if not found
- [x] 7.2 Re-read file from disk, append alias to `aliases[]` (initialize array if missing)
- [x] 7.3 Write updated file and update index
- [x] 7.4 Return 200 with updated work

## 8. DELETE /api/works/:slug/aliases — Remove Alias

- [x] 8.1 Look up work via `index.getWork(slug)`, return 404 if not found
- [x] 8.2 Re-read file from disk, check if alias exists in `aliases[]`, return 404 if not found
- [x] 8.3 Remove alias from array, write updated file, update index
- [x] 8.4 Return 200 with updated work

## 9. Tests

- [x] 9.1 Create `server/src/routes/works.test.ts` — test each endpoint using a temp library directory
- [x] 9.2 Test `POST /api/works` creates work, returns 201, slug is auto-generated
- [x] 9.3 Test `POST /api/works` with missing title returns 400
- [x] 9.4 Test `GET /api/works` returns all works
- [x] 9.5 Test `GET /api/works?q=...` filters correctly
- [x] 9.6 Test `GET /api/works?sort=title&order=asc` sorts correctly
- [x] 9.7 Test `GET /api/works/:slug` returns work with counts
- [x] 9.8 Test `GET /api/works/:slug` for non-existent returns 404
- [x] 9.9 Test `PATCH /api/works/:slug` updates fields
- [x] 9.10 Test `PATCH /api/works/:slug` ignores slug changes
- [x] 9.11 Test `PATCH /api/works/:slug` for non-existent returns 404
- [x] 9.12 Test `DELETE /api/works/:slug` with no editions returns 200
- [x] 9.13 Test `DELETE /api/works/:slug` with editions returns 409
- [x] 9.14 Test `DELETE /api/works/:slug?cascade=true` deletes work + editions + copies + notes
- [x] 9.15 Test alias add and remove endpoints

## 10. Verification

- [x] 10.1 Run `npm test` — all tests pass including new work API tests
- [x] 10.2 Manually test with curl: create a work, list works, get single, update, delete
- [x] 10.3 Verify created work file exists on disk with correct frontmatter
- [x] 10.4 Verify re-read before write preserves fields not in PATCH body
