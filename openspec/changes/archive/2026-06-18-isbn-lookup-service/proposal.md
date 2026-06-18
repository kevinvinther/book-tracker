## Why

Manually entering book metadata is tedious and error-prone. Users who own physical copies often have the ISBN readily available. An ISBN lookup service eliminates manual data entry by fetching structured metadata (title, authors, publisher, cover, etc.) from open book APIs, making the add-book flow fast and accurate.

## What Changes

- New `isbn-lookup` service module that queries external book APIs (Open Library primary, Google Books fallback) for structured metadata
- New `GET /api/lookup?isbn={isbn}` endpoint that returns normalized book metadata
- Cache ISBN lookup results as JSON files in `.booktracker/cache/` to avoid redundant API calls
- Download cover images to `attachments/` when available from the API response

## Capabilities

### New Capabilities
- `isbn-lookup`: Given an ISBN, query external book APIs and return structured metadata (title, subtitle, authors, publisher, publish_date, page_count, format, language, genres, description, cover image). Cache results locally and handle failures gracefully.

### Modified Capabilities
<!-- None -->

## Impact

- New server module: `server/src/lib/lookup.ts` (service logic)
- New API endpoint: `GET /api/lookup?isbn={isbn}`
- Cache directory: `.booktracker/cache/` (directory already scaffolded)
- Attachments directory: `attachments/` (already set up for static serving)
- No new npm dependencies required (Node 22 built-in `fetch` suffices)
