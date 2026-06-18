## Context

The backend already has full CRUD for all entity types (Works, Authors, Editions, Copies, Series) backed by an in-memory index and markdown files on disk. Editions have an `isbn` field. The `.booktracker/cache/` directory is scaffolded at startup. The `attachments/` directory is set up with static serving via Express. No external API integration exists yet.

The ISBN lookup service provides the data-fetching layer that the future Quick Add with Scan flow will consume. It operates independently of the entity CRUD — it only reads from external APIs and writes to cache, never modifies entity files.

Node 22's built-in `fetch` is available, so no HTTP client dependency is needed.

## Goals / Non-Goals

**Goals:**
- Given an ISBN, return structured metadata from Open Library (primary) and Google Books (fallback)
- Normalize responses from both APIs into a consistent internal format
- Cache successful lookups as JSON files in `.booktracker/cache/` to avoid redundant API calls
- Download cover images to `attachments/` when a cover URL is available
- Return a clear error when no API returns results for the ISBN
- Expose via a `GET /api/lookup?isbn=...` endpoint

**Non-Goals:**
- No UI components — this is a backend-only service
- No barcode scanning — that's a separate frontend concern
- No entity creation — this service does not create Authors, Works, Editions, or Copies
- No ISBN validation beyond API rejection — the API's 404/error is sufficient feedback
- No cache invalidation mechanism — manual cache clearing only

## Decisions

### API priority: Open Library → Google Books
Open Library is free, requires no API key, and returns fields well-matched to our data model. Google Books has broader coverage but requires an API key. We try Open Library first; if it returns an error (not just missing optional fields), we fall back to Google Books. If both fail, we return a 404 with the message "Couldn't find this ISBN".

### Module location: `server/src/lib/lookup.ts`
Following existing conventions, service logic lives in `server/src/lib/`. The lookup module exports a single `lookupISBN(isbn, libraryPath)` function and is called from a route handler. This keeps the route thin and the logic testable.

### Caching: JSON files keyed by ISBN
Each successful lookup writes to `.booktracker/cache/{isbn}.json`. On subsequent lookups, we check the cache before hitting any API. The cache has no TTL — users get the same result forever unless they manually delete the cache file. This avoids complex invalidation logic and the spec does not require freshness guarantees.

### Cover image download: sync during lookup
When the API returns a cover URL, we download the image immediately and store it in `attachments/{filename}`. The filename uses the last segment of the cover URL to avoid collisions (e.g., `{coverId}-M.jpg`). The attachment URL is returned in the response. A download failure is non-fatal — the rest of the metadata is still returned.

### Error handling: graceful degradation
Each external API call is wrapped in a try/catch. Network errors, timeouts, and non-200 responses from either API are treated as "this API failed, try the next". Only when both APIs fail do we return an error to the caller. A 5-second timeout is set on each fetch.

### Rate limiting: no server-side enforcement
Open Library has generous rate limits and Google Books allows 1,000 queries/day on a free key. At the scope of a personal book diary, rate limits are unlikely to be hit. We document recommended usage (don't batch-scan hundreds of ISBNs rapidly) but do not implement a token bucket or queue.

### Response format
A single normalized response shape regardless of which API succeeded:

```ts
{
  title: string;
  subtitle?: string;
  authors: string[];
  publisher?: string;
  publish_date?: string;
  page_count?: number;
  format?: string;
  language?: string;
  genres: string[];
  description?: string;
  cover_image?: string;        // relative path e.g. "12345-M.jpg"
  cover_url?: string;          // raw URL for frontend preview
  contributors?: { role: string; name: string }[];
  source: "openlibrary" | "google";
}
```

### No config for API keys yet
Google Books requires an API key. We read it from `process.env.GOOGLE_BOOKS_API_KEY` (via dotenv, already loaded at startup). If the key is not set, Google Books fallback is skipped entirely. The OPEN spec section with decision "API key management" is deferred — for now, a `.env` variable suffices.

### Module exported as an Express router
Following the existing pattern (all route modules export a `createLookupRouter` factory), the new route receives the library path. The cache path and attachments path are derived from it.

## Risks / Trade-offs

- **Cached data may be stale**: If an API improves its data (better cover, added description), the user never sees the update unless they delete the cache file. Mitigation: document where cache files live so users can clear them manually. Future work: a "Refresh metadata" button on the preview screen.
- **No ISBN validation**: Invalid ISBNs (wrong checksum) will just fail at both APIs with a generic "Couldn't find" message. Mitigation: the generic message is clear enough. The user can correct the ISBN and retry.
- **Cover download is synchronous**: A slow cover download blocks the API response. Mitigation: 5-second timeout per fetch. Cover download failure is non-fatal — metadata is still returned.
- **Google Books API key is optional**: If the key is not configured, only Open Library is used, reducing coverage. Mitigation: document the env var in README. Most ISBNs are found on Open Library.
