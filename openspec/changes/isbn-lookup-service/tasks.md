## 1. Cache Layer

- [x] 1.1 Implement `readCache(isbn, libraryPath)` — check `.booktracker/cache/{isbn}.json`, return parsed JSON or null on miss/corruption
- [x] 1.2 Implement `writeCache(isbn, data, libraryPath)` — atomic write of normalized lookup result to `.booktracker/cache/{isbn}.json`
- [x] 1.3 Test cache read/write with valid, missing, and corrupted cache files

## 2. Open Library Integration

- [x] 2.1 Implement `fetchOpenLibrary(isbn)` — query `https://openlibrary.org/isbn/{isbn}.json` with 5s timeout
- [x] 2.2 Implement `normalizeOpenLibrary(data)` — map Open Library response fields to normalized format (title, authors, publisher, publish_date, page_count, subjects → genres, description, covers → cover URL)
- [x] 2.3 Test Open Library normalization with sample response data (mock fetch return)

## 3. Google Books Integration

- [x] 3.1 Implement `fetchGoogleBooks(isbn)` — query `https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}` with API key from `GOOGLE_BOOKS_API_KEY` env var, 5s timeout; return null if key not configured
- [x] 3.2 Implement `normalizeGoogleBooks(data)` — map Google Books volume info to normalized format (title, authors, publisher, publishedDate, pageCount, categories → genres, description, imageLinks)
- [x] 3.3 Test Google Books normalization with sample response data

## 4. Cover Image Download

- [x] 4.1 Implement `downloadCover(coverUrl, libraryPath)` — download image to `attachments/{filename}` using built-in fetch + fs write, return relative path; failure is non-fatal (return null)
- [x] 4.2 Test cover download with a known public cover image URL

## 5. Core Lookup Function

- [x] 5.1 Implement `lookupISBN(isbn, libraryPath)` — check cache, then try Open Library, then Google Books, normalize result, download cover, write cache, return normalized result or null on failure
- [x] 5.2 Test full lookup pipeline with cache hit, cache miss, and double-failure scenarios

## 6. API Endpoint

- [x] 6.1 Create `server/src/routes/lookup.ts` — Express router with `GET /` handler that reads `isbn` query param, calls `lookupISBN`, returns 200 with data or 404/400 errors
- [x] 6.2 Register the lookup router in `server/src/index.ts` at `/api/lookup`
- [x] 6.3 Add api test: `server/src/lookup.test.ts` — integration tests for missing param, valid ISBN (mocked fetch), ISBN not found

## 7. Verification

- [x] 7.1 Run all existing tests to confirm no regressions
- [x] 7.2 Manually test the endpoint with a real ISBN via curl
- [x] 7.3 Verify cache file is created in `.booktracker/cache/` after a successful lookup
