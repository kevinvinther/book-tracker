## 1. Route File

- [x] 1.1 Create `server/src/routes/copies.ts` with an Express Router exported as default
- [x] 1.2 Register the copies router in `server/src/index.ts` under `/api/copies`

## 2. POST /api/copies

- [x] 2.1 Validate `edition` and `work` are present in request body; return 400 for either missing
- [x] 2.2 Verify both the edition and work exist in the index; return 400 if either is not found
- [x] 2.3 Generate a slug from the edition slug via `generateSlug`
- [x] 2.4 Build frontmatter with `type: copy`, `slug`, `edition: "[[editions/{slug}]]"`, `work: "[[works/{slug}]]"`, `status` (default `owned`), all optional fields, `created_at`, `_schema: 1`
- [x] 2.5 Write the copy file to `copies/{slug}.md` via `writeFile`
- [x] 2.6 Insert into index via `index.upsert`; return 201 with the created copy

## 3. GET /api/copies/:slug

- [x] 3.1 Look up copy in index; return 404 if not found
- [x] 3.2 Resolve edition slug from wikilink and fetch from index; include key fields as `edition_meta`
- [x] 3.3 Resolve work slug from wikilink and fetch from index; include key fields as `work_meta`
- [x] 3.4 Return 200 with copy fields plus `edition_meta` and `work_meta`

## 4. PATCH /api/copies/:slug

- [x] 4.1 Look up copy in index; return 404 if not found
- [x] 4.2 Re-read the file from disk before merging
- [x] 4.3 Merge only mutable fields (`condition`, `location`, `cover_image`, `release_date`, `acquisition_date`, `acquisition_source`, `price_amount`, `price_currency`, `status`); ignore `slug`, `type`, `edition`, `work`, `created_at`, `_schema`
- [x] 4.4 Write atomically via `writeFile`; update index via `index.upsert`; return 200

## 5. DELETE /api/copies/:slug

- [x] 5.1 Look up copy in index; return 404 if not found
- [x] 5.2 Delete the copy file from disk via `deleteFile`
- [x] 5.3 Remove from index via `index.remove`; return 200

## 6. Tests

- [x] 6.1 Create `server/src/routes/copies.test.ts` mirroring the structure of `editions.test.ts`
- [x] 6.2 Test POST: successful creation with defaults, all optional fields, missing `edition` (400), missing `work` (400), non-existent edition (400), non-existent work (400)
- [x] 6.3 Test GET /:slug: returns copy with `edition_meta` and `work_meta`, 404 for missing slug
- [x] 6.4 Test PATCH: updates mutable fields, ignores `edition`/`work`/`slug`, 404 for missing slug
- [x] 6.5 Test DELETE: existing copy → 200 + file removed + not in index, 404 for missing slug
