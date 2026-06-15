## 1. Route File

- [x] 1.1 Create `server/src/routes/editions.ts` with an Express Router exported as default
- [x] 1.2 Register the editions router in `server/src/index.ts` under `/api/editions`

## 2. POST /api/editions

- [x] 2.1 Validate `work` is present in request body; return 400 if missing
- [x] 2.2 Verify the referenced work exists in the index; return 400 if not found
- [x] 2.3 Generate a slug from `work + publisher + publish_date` via `generateSlug`
- [x] 2.4 Build frontmatter with `type: edition`, `slug`, `work: "[[works/{slug}]]"`, all optional fields, `created_at`, and `_schema: 1`
- [x] 2.5 Write the edition file to `editions/{slug}.md` via `writeFile`
- [x] 2.6 Insert into index via `index.upsert`; return 201 with the created edition

## 3. GET /api/editions

- [x] 3.1 Return all editions from the index as a JSON array
- [x] 3.2 Support optional `?work=` query param; filter via `index.getEditionsByWork(work)` when provided

## 4. GET /api/editions/:slug

- [x] 4.1 Look up edition in index; return 404 if not found
- [x] 4.2 Resolve `copy_count` via `index.getCopiesByEdition(slug).length`
- [x] 4.3 Return 200 with edition fields plus `copy_count`

## 5. PATCH /api/editions/:slug

- [x] 5.1 Look up edition in index; return 404 if not found
- [x] 5.2 Re-read the file from disk before merging
- [x] 5.3 Merge only mutable fields (`isbn`, `publisher`, `publish_date`, `page_count`, `format`, `language`, `contributors`); ignore `slug`, `type`, `work`, `created_at`, `_schema`
- [x] 5.4 Write atomically via `writeFile`; update index via `index.upsert`; return 200

## 6. DELETE /api/editions/:slug

- [x] 6.1 Look up edition in index; return 404 if not found
- [x] 6.2 Check `index.getCopiesByEdition(slug)`; if copies exist and neither `?force` nor `?cascade` is set, return 409 with copy count
- [x] 6.3 If `?force=true` (and not cascade), delete the edition file and index entry only; leave copy files untouched
- [x] 6.4 If `?cascade=true`, delete all linked copy files from disk and remove from index, then delete the edition
- [x] 6.5 Delete the edition file from disk; remove from index via `index.remove`; return 200

## 7. Tests

- [x] 7.1 Create `server/src/routes/editions.test.ts` mirroring the structure of `authors.test.ts`
- [x] 7.2 Test POST: successful creation, missing `work` (400), non-existent work (400)
- [x] 7.3 Test GET all: returns all editions, `?work=` filter returns only matching editions
- [x] 7.4 Test GET /:slug: returns edition with `copy_count`, 404 for missing slug
- [x] 7.5 Test PATCH: updates mutable fields, ignores `work`/`slug`, 404 for missing slug
- [x] 7.6 Test DELETE: no copies → 200, with copies → 409, force → 200 + copies untouched, cascade → 200 + copies deleted, 404 for missing slug
