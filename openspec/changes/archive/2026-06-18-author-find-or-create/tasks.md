## 1. Create Find-or-Create Utility Module

- [x] 1.1 Create `server/src/lib/authors.ts` — export `findOrCreateAuthors(names, index, libraryPath)` with signature `(string[], Index, string) => { slug: string; name: string; isNew: boolean }[]`
- [x] 1.2 Implement matching: for each name, normalize whitespace (trim, collapse spaces), lowercase compare against each author's `name` and `aliases` fields; return existing slug if found
- [x] 1.3 Implement creation fallback: generate slug via `generateSlug`, create Author file at `authors/{slug}.md` with `{ type: "author", slug, name, created_at, _schema: 1 }`, upsert into index, return with `isNew: true`

## 2. Unit Tests for Find-or-Create

- [x] 2.1 Create `server/src/lib/authors.test.ts` — test all match scenarios with a fresh Index per test
- [x] 2.2 Test exact match on `name` (case-insensitive, whitespace-normalized)
- [x] 2.3 Test match via `aliases` field
- [x] 2.4 Test multiple names — mix of existing and new
- [x] 2.5 Test all-new names — verifies file creation on disk and index insertion
- [x] 2.6 Test empty input array returns empty array
- [x] 2.7 Test that fuzzy/transliteration variants create separate authors (e.g., "Dostoevsky" ≠ "Dostoyevsky")

## 3. Refactor Quick-Add Route

- [x] 3.1 In `server/src/routes/quick-add.ts`, remove the inline `findOrCreateAuthor` function and import `findOrCreateAuthors` from `../lib/authors.js`
- [x] 3.2 Update the call site: replace `authorNames.map(name => findOrCreateAuthor(name, ...))` with `findOrCreateAuthors(authorNames, ...)` and extract slugs from results

## 4. Verification

- [x] 4.1 Run all existing tests (`npm test` in server/) to confirm no regressions
- [x] 4.2 Verify quick-add tests still pass including author matching and creation scenarios
