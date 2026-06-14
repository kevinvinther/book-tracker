## 1. Vitest Setup

- [x] 1.1 Install `vitest` as devDependency in `server/`
- [x] 1.2 Create `server/vitest.config.ts` with ESM TypeScript support
- [x] 1.3 Add `"test": "vitest run"` and `"test:watch": "vitest"` scripts to `server/package.json`

## 2. Config Module Tests

- [x] 2.1 Create `server/src/config.test.ts` — test `expandHome` (pure function) and `ensureLibraryDirectories` (with temp dir); `readConfig`/`writeConfig` tested via API integration tests
- [x] 2.2 Test `expandHome` resolves `~` to home directory, preserves absolute and relative paths
- [x] 2.3 Test `ensureLibraryDirectories` creates all subdirectories in a temp path
- [x] 2.4 Test `ensureLibraryDirectories` is idempotent (second call does not error)
- [x] 2.5 Test `expandHome` does not modify absolute paths already provided
- [x] 2.6 Test `expandHome` does not modify relative paths

## 3. File I/O Tests

- [x] 3.1 Create `server/src/lib/io.test.ts` — use `beforeAll`/`afterAll` to set up and tear down a temp directory
- [x] 3.2 Test `readFile` with valid YAML frontmatter and body
- [x] 3.3 Test `readFile` with only frontmatter (no body)
- [x] 3.4 Test `readFile` throws on missing file
- [x] 3.5 Test `readFile` throws on invalid YAML
- [x] 3.6 Test `writeFile` creates a new file with correct content
- [x] 3.7 Test `writeFile` creates parent directories if needed
- [x] 3.8 Test `writeFile` overwrites existing file atomically (no .tmp remains)
- [x] 3.9 Test `writeFile` + `readFile` roundtrip preserves data
- [x] 3.10 Test `deleteFile` removes existing file
- [x] 3.11 Test `deleteFile` does not throw on non-existent file
- [x] 3.12 Test `listFiles` returns only `.md` filenames without extensions
- [x] 3.13 Test `listFiles` returns empty array for non-existent directory
- [x] 3.14 Test `resolveLibraryPath` expands `~` and joins paths

## 4. Slug Generation Tests

- [x] 4.1 Create `server/src/lib/slug.test.ts`
- [x] 4.2 Test English title: "The Brothers Karamazov" → "the-brothers-karamazov"
- [x] 4.3 Test Unicode transliteration: "Cien años de soledad" → "cien-anos-de-soledad", "Čapek's War" → "capeks-war"
- [x] 4.4 Test punctuation collapse: "Hello!!!---World" → "hello-world"
- [x] 4.5 Test truncation at 80 characters
- [x] 4.6 Test empty/special-chars-only input returns a non-empty result
- [x] 4.7 Test no collision when slug does not exist in set
- [x] 4.8 Test collision resolved with author surname suffix
- [x] 4.9 Test collision resolved with numeric suffix when author suffix also taken
- [x] 4.10 Test collision resolved with numeric fallback when no author provided

## 5. Index Tests

- [x] 5.1 Create `server/src/lib/index.test.ts` — use temp directory with helpers to create test `.md` files
- [x] 5.2 Test `load()` parses entities from all subdirectories (authors, series, works, editions, copies, notes)
- [x] 5.3 Test `load()` on empty library returns empty collections
- [x] 5.4 Test `load()` skips files with invalid YAML and loads remaining
- [x] 5.5 Test `load()` stores note body text in the entity
- [x] 5.6 Test `load()` omits body from non-note entities
- [x] 5.7 Test lookup methods (`getAuthor`, `getSeries`, `getWork`, `getEdition`, `getCopy`, `getNote`) return correct entity or `undefined`
- [x] 5.8 Test `getAllAuthors()`, `getAllSeries()`, `getAllWorks()`, `getAllEditions()`, `getAllCopies()` return all entities
- [x] 5.9 Test `getWorksByAuthor` returns only works linked to that author
- [x] 5.10 Test `getEditionsByWork` returns only editions linked to that work
- [x] 5.11 Test `getCopiesByEdition` returns only copies linked to that edition
- [x] 5.12 Test `getCopiesByWork` returns only copies linked to that work
- [x] 5.13 Test `getNotesByCopy` returns only notes linked to that copy
- [x] 5.14 Test `searchWorks` matches by title substring
- [x] 5.15 Test `searchWorks` matches by author name
- [x] 5.16 Test `searchWorks` matches by genre
- [x] 5.17 Test `searchWorks` with empty query returns all works
- [x] 5.18 Test `searchWorks` with no-matching query returns empty array
- [x] 5.19 Test `upsert` inserts new entity and makes it retrievable
- [x] 5.20 Test `upsert` replaces existing entity
- [x] 5.21 Test `remove` deletes entity and it becomes `undefined`
- [x] 5.22 Test `remove` on non-existent entity does not throw

## 6. API Integration Tests

- [x] 6.1 Create `server/src/api.test.ts` — start Express server on port 0 before tests, close after
- [x] 6.2 Test `GET /api/health` returns 200 with `{ status: "ok" }`
- [x] 6.3 Test `GET /api/config` returns 200 with a `library_path` field
- [x] 6.4 Test `PATCH /api/config` with valid path returns 200 and updated config
- [x] 6.5 Test `PATCH /api/config` with empty path returns 400 with error
- [x] 6.6 Test `PATCH /api/config` with missing field returns 400

## 7. Verification

- [x] 7.1 Run `npm test` in `server/` — all 61 tests pass, exit code 0
- [x] 7.2 Run `npm run test:watch` — Vitest watch mode starts (interactive, not tested in CI)
- [x] 7.3 Confirm no tests touch real library data (all use `/tmp/bt-*` temp directories with cleanup)
- [x] 7.4 Confirm total test run completes in under 2 seconds (463ms)
