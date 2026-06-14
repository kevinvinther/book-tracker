## 1. Dependencies

- [x] 1.1 Install `gray-matter` and `limax` in `server/` (`npm install gray-matter limax`)
- [x] 1.2 Install `@types/limax` in `server/` devDependencies (unnecessary — limax ships its own types)

## 2. Entity Type Definitions

- [x] 2.1 Create `server/src/lib/types.ts` with TypeScript interfaces for all entity types: Author (name, aliases, created_at), Series (name, total_works, aliases, created_at), Work (title, subtitle, authors, original_language, original_publish_year, genres, description, series, series_position, primary_cover, created_at), Edition (isbn, publisher, publish_date, page_count, format, language, contributors, work, created_at), Copy (edition, work, cover_image, release_date, condition, acquisition_date, acquisition_source, price_amount, price_currency, location, status, loans, read_throughs, created_at), Note (date, modified, copy, edition, work, read_through, context_page, tags), plus embedded types ReadThrough (started_date, finished_date, status, rating, page_log), PageLog (date, page), Loan (borrower_name, lent_date, expected_return_date, returned_date)
- [x] 2.2 Define `EntityType` union type (`"author" | "series" | "work" | "edition" | "copy" | "note"`) for use in Index methods
- [x] 2.3 Export all types from `server/src/lib/types.ts`

## 3. File I/O Primitives

- [x] 3.1 Create `server/src/lib/io.ts` with `readFile(filePath)` — reads `.md` file, parses YAML frontmatter with gray-matter, returns `{ frontmatter, body }`
- [x] 3.2 Add error handling to `readFile` — throw descriptive error on missing file or invalid YAML
- [x] 3.3 Implement `writeFile(filePath, frontmatter, body)` — serialize frontmatter to YAML (using js-yaml `dump`), join with body, write atomically via temp file + rename
- [x] 3.4 Ensure `writeFile` creates parent directories if they don't exist
- [x] 3.5 Implement `deleteFile(filePath)` — remove file from disk, no error if file doesn't exist
- [x] 3.6 Implement `listFiles(dirPath)` — return array of filenames (without `.md` extension) for all `.md` files in directory, empty array if directory missing
- [x] 3.7 Implement `resolveLibraryPath(relativePath, libraryPath)` — expand `~` via `expandHome` from config.ts, join with relative path, return absolute path

## 4. Slug Generation

- [x] 4.1 Create `server/src/lib/slug.ts` with `generateSlug(title, existingSlugs?, author?)` — the sole slug authority: (1) transliterate Unicode to ASCII with limax, (2) lowercase, (3) replace non-[a-z0-9-] with hyphen, (4) collapse consecutive hyphens, (5) strip leading/trailing hyphens, (6) truncate to 80 chars, (7) disambiguate collisions with author surname suffix
- [x] 4.2 Use `limax` for Unicode transliteration (ñ→n, é→e, Č→c)
- [x] 4.3 Implement post-transliteration normalization pipeline (steps 2–6 above)
- [x] 4.4 Implement collision handling: append author last name suffix (`dune-herbert`), incrementing number if still colliding (`dune-herbert-2`), numeric fallback if no author provided (`dune-2`)
- [x] 4.5 Export `generateSlug` function

## 5. In-Memory Index

- [x] 5.1 Create `server/src/lib/index.ts` with `Index` class using private `Map<string, Entity>` maps per entity type
- [x] 5.2 Implement `load()` — walk all library subdirectories (authors, series, works, editions, copies, notes), read and parse every `.md` file, populate maps, log elapsed time
- [x] 5.3 Handle malformed files gracefully during load — skip and log warning, continue loading
- [x] 5.4 Implement lookup methods: `getAuthor(slug)`, `getSeries(slug)`, `getWork(slug)`, `getEdition(slug)`, `getCopy(slug)`, `getNote(filename)`
- [x] 5.5 Implement `getAllAuthors()`, `getAllSeries()`, `getAllWorks()`, `getAllEditions()`, `getAllCopies()`
- [x] 5.6 Implement cross-entity navigation: `getWorksByAuthor(slug)`, `getEditionsByWork(slug)`, `getCopiesByEdition(slug)`, `getCopiesByWork(slug)`, `getNotesByCopy(slug)`
- [x] 5.7 Implement `searchWorks(query)` — case-insensitive match against title, author names, and genres
- [x] 5.8 Implement `upsert(type, entity)` — insert or replace entity in the appropriate map
- [x] 5.9 Implement `remove(type, slug)` — delete entity from the appropriate map
- [x] 5.10 Store note body text in index (set `body` field on Note entities); omit body for other entity types

## 6. Server Startup Integration

- [x] 6.1 In `server/src/index.ts`, instantiate the Index after config reads and directory scaffold completes
- [x] 6.2 Call `index.load()` before the server starts listening
- [x] 6.3 Log total index load time at startup
- [x] 6.4 Make the Index instance available to route handlers (export or attach to app locals)

## 7. Verification

- [x] 7.1 Manually create a few test `.md` files in the library directory (one author, one work, one edition, one copy) and verify the Index loads them correctly
- [x] 7.2 Verify `searchWorks` returns expected results for title, author, and genre queries
- [x] 7.3 Verify cross-entity navigation methods return correct related entities
- [x] 7.4 Verify `upsert` and `remove` update the index correctly at runtime
- [x] 7.5 Verify slug generation produces correct output for English titles, Unicode titles, and collision scenarios
- [x] 7.6 Verify `writeFile` with `readFile` roundtrip: write a file, read it back, confirm frontmatter matches
- [x] 7.7 Verify atomic write: kill server during write, confirm original file remains intact
- [x] 7.8 Generate 500 test files programmatically, measure index load time, confirm <1000ms
