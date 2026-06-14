## 1. Route File Structure

- [x] 1.1 Create `server/src/routes/authors.ts` — Express Router with all Author endpoints, exports `createAuthorsRouter(index, libraryPath)`
- [x] 1.2 Register the authors router in `server/src/index.ts` at `/api/authors`

## 2. POST /api/authors — Create Author

- [x] 2.1 Validate `name` is present and non-empty, return 400 if missing
- [x] 2.2 Generate slug via `generateSlug(name, existingSlugs)`
- [x] 2.3 Build Author frontmatter with type, slug, name, aliases (if provided), created_at, _schema
- [x] 2.4 Write file via `writeFile` with placeholder body
- [x] 2.5 Update index via `index.upsert("author", author)`
- [x] 2.6 Return 201 with the created author JSON

## 3. GET /api/authors — List Authors

- [x] 3.1 Return all authors via `index.getAllAuthors()`
- [x] 3.2 Return 200 with authors array

## 4. GET /api/authors/:slug — Get Single Author

- [x] 4.1 Look up author via `index.getAuthor(slug)`, return 404 if not found
- [x] 4.2 Resolve works via `index.getWorksByAuthor(slug)`, return array of `{ slug, title }`
- [x] 4.3 Return 200 with author JSON including resolved works

## 5. PATCH /api/authors/:slug — Update Author

- [x] 5.1 Look up author via `index.getAuthor(slug)`, return 404 if not found
- [x] 5.2 Re-read file from disk via `readFile`
- [x] 5.3 Merge mutable fields (name, aliases) from request body; preserve slug, type, created_at, _schema
- [x] 5.4 If name is being updated, validate non-empty
- [x] 5.5 Write updated file and update index
- [x] 5.6 Return 200 with updated author

## 6. DELETE /api/authors/:slug — Delete Author

- [x] 6.1 Look up author, return 404 if not found
- [x] 6.2 Check `index.getWorksByAuthor(slug)`. If works exist and `?cascade` is not `"true"`, return 409
- [x] 6.3 If cascade: delete author file and index entry (do not modify works)
- [x] 6.4 Return 200 with success message

## 7. Tests

- [x] 7.1 Create `server/src/routes/authors.test.ts` — test each endpoint using a temp library directory
- [x] 7.2 Test POST creates author with auto-generated slug
- [x] 7.3 Test POST with missing name returns 400
- [x] 7.4 Test GET /api/authors returns all authors
- [x] 7.5 Test GET /api/authors/:slug returns author with resolved works
- [x] 7.6 Test GET /api/authors/:slug returns 404 for non-existent
- [x] 7.7 Test PATCH updates name and aliases
- [x] 7.8 Test PATCH ignores slug changes
- [x] 7.9 Test DELETE with no linked works returns 200
- [x] 7.10 Test DELETE with linked works returns 409
- [x] 7.11 Test DELETE cascade removes author but does not modify linked works (wikilinks remain)

## 8. Verification

- [x] 8.1 Run `npm test` — all tests pass including new author API tests
- [x] 8.2 Manually test with curl: create author, list, get with works, update, delete
