## Context

The barcode scanner (`<BarcodeScanner>`) and ISBN lookup service (`lookupISBN`, exposed as `GET /api/lookup`) are built and tested but entirely disconnected from the add-book flow. The manual add form at `/add` works for typing metadata by hand but has no path to use scanned data. The `POST /api/quick-add` endpoint creates Work + Edition + Copy atomically for manual input, but has no concept of deduplication or attaching to an existing Work that was discovered via ISBN lookup.

All required components exist. This change is about wiring them together and adding the minimal backend support for dedup and attach-to-existing.

## Goals / Non-Goals

**Goals:**
- Wire the barcode scanner into the `/add` page so a user can scan a book barcode
- Call `GET /api/lookup` with the scanned ISBN and display the fetched metadata in a preview/edit screen
- Check for duplicate Editions (by ISBN) and potential duplicate Works (by title+author) before creating entities
- Allow the user to attach to an existing Work (creating only Edition + Copy) when a match is confirmed
- Let the user edit all fetched fields before confirming creation
- Keep the manual entry path functional alongside the scan path

**Non-Goals:**
- No changes to the barcode scanner component or its behavior
- No changes to author find-or-create logic
- No automatic background lookup without user action (no "proactive" scanning)
- No batch scanning of multiple books

## Decisions

### 1. Dedup check: dedicated endpoint over reusing existing routes

**Choice**: New `GET /api/quick-add/check-dedup?isbn=&title=&author=` endpoint.

**Rationale**: The dedup check involves two queries (ISBN exact match on Editions, title+author fuzzy match on Works) and returns a structured result suitable for the preview screen. Reusing existing `GET /api/editions` and `GET /api/works?q=` would require the client to make two requests and interpret raw entity lists. A dedicated endpoint encapsulates the dedup logic server-side and returns a purpose-built response.

**Alternatives considered**: Client-side dedup using existing endpoints — rejected because it complicates the client with dedup matching logic that properly belongs with the entity index.

**Response shape**:
```json
{
  "editionMatch": { "editionSlug": "...", "workSlug": "...", "workTitle": "...", "copyCount": 2 } | null,
  "workMatches": [{ "workSlug": "...", "workTitle": "...", "authorNames": ["..."] }]
}
```

### 2. Attach-to-existing via `attachToWorkSlug` on POST /api/quick-add

**Choice**: Accept an optional `attachToWorkSlug` field. When provided, skip Work creation and create only Edition + Copy linked to the existing Work.

**Rationale**: Keeps the API surface minimal. The same `POST /api/quick-add` handles both create-new and attach-to-existing paths. The Work's metadata is never modified when attaching, which preserves the user's curated data.

**Alternatives considered**: Separate `POST /api/editions` + `POST /api/copies` calls from the client — rejected because it breaks the atomicity guarantee (both must succeed or neither should be persisted).

### 3. Preview screen as a new state within the existing `/add` page

**Choice**: Extend the `AddBook` component with additional states (`scanning`, `loading`, `preview`) rather than creating a separate page or route.

**Rationale**: The `/add` page already manages form state and submission. Adding states keeps navigation simple (one route for all add flows) and lets the user switch between manual and scan modes without losing context.

### 4. Frontend state machine

```
idle → (click Scan) → scanning → (ISBN captured) → loading → (lookup + dedup done) → preview → (confirm) → submitting → (success) → redirect to Work Detail
idle → (fill form manually) → submitting → redirect       [existing path unchanged]
scanning → (cancel) → idle
loading → (lookup fails) → idle + error toast
preview → (cancel) → idle
```

### 5. Author correction in preview

**Choice**: Each author shown in the preview is a dropdown that defaults to the resolved match (the `findOrCreateAuthors` result) but allows the user to pick a different existing author or create a new one.

**Rationale**: ISBN lookups sometimes return ambiguous author names (e.g., "Herbert, Frank" vs "Frank Herbert" with the wrong author in the index). The user needs to correct mismatches before creation. This reuses the existing `AuthorSelector` component.

### 6. Copy fields in preview are optional before confirmation

**Choice**: The preview screen shows copy-specific fields (condition, source, location, price) but they are optional — the user can skip them and confirm with just a "condition" defaulting to unset.

**Rationale**: The primary value of scanning is getting work/edition metadata automatically. Copy details like condition and location are physical-world concerns the user adds later. Forcing these fields would slow down the quick-add flow.

### 7. Google Books first, Open Library as fallback

**Choice**: Query Google Books before Open Library in `lookupISBN`, reversing the original order.

**Rationale**: During testing with real ISBNs, Open Library was found to return author names mixed into the `publishers` array (e.g., `["Brandon Sanderson", "Tor Fantasy"]`). Google Books returns cleaner publisher data with no author noise. However, Google requires an API key and has a quota, so it's best-effort: skip Google when no key is configured, and fall back to Open Library when Google returns no data.

**Alternatives considered**: Keep Open Library first and filter publishers against authors — this was implemented as a safety net for the fallback path, but Google-first avoids the problem at the source when a key is available.

### 8. Publisher filtering against author names (Open Library fallback)

**Choice**: When Open Library is used (either as primary without a key, or as fallback), cross-reference the `publishers` array against resolved author names and skip any entry that matches.

**Rationale**: Open Library editions sometimes list the author as a publisher. Taking `publishers[0]` blindly (the original behavior) shows the author name as the publisher. By filtering the publishers list against resolved author names (case-insensitive), the first actual publisher is selected.

### 9. ISBN normalization before lookup

**Choice**: On the client side, strip all non-digit characters from the scanned or typed ISBN. Convert 12-digit UPC-A to 13-digit EAN-13 by prepending `0`. Truncate barcodes with price add-ons (more than 13 digits starting with 978/979) to 13 digits.

**Rationale**: Barcode scanners can return UPC-A (12 digits, common on older books), barcodes with appended 5-digit price supplements, or values with whitespace and special characters. Open Library and Google Books expect clean digit strings. Without normalization, these lookups fail silently.

### 10. Publish date normalization for HTML date input

**Choice**: Parse the `publish_date` string from the lookup API into `YYYY-MM-DD` format before populating the `<input type="date">` field.

**Rationale**: The HTML date input only renders values in `YYYY-MM-DD` format. Open Library returns dates as `"1965"`, `"Mar 03, 2015"`, or other freeform strings. Without normalization, the input appears blank even though data was received. Year-only values are rendered as `1965-01-01`.

### 11. Cache write failure is non-fatal

**Choice**: Wrap `writeCache` in a try/catch so permission errors (EACCES) writing to `.booktracker/cache/` don't crash the lookup.

**Rationale**: In Docker, the mounted data directory had root ownership while the container ran as a non-root user, causing EACCES on cache writes. The exception propagated up through `lookupISBN` to the route handler, which returned HTTP 500 "Lookup failed" — despite successfully retrieving data from the API. Cache writes are a convenience, not a requirement.

### 12. User-Agent header on external API requests

**Choice**: Send a `User-Agent: book-tracker/1.0` header on all `fetch` calls to Google Books and Open Library.

**Rationale**: Google Books returned HTTP 503 for server-to-server requests without a User-Agent header, while the same URL worked in a browser (which adds a User-Agent automatically). Adding the header resolved the 503s.

## Risks / Trade-offs

- **API lookup failures**: If both Google Books and Open Library fail, the user sees an error message and returns to idle. The ISBN is preserved in the error message for manual retry. [Mitigation: offer manual entry as fallback]
- **Dedup false positives**: Title+author fuzzy matching may flag genuinely different books with similar titles. [Mitigation: the preview screen shows full metadata; user can always choose "create new" to bypass the match]
- **API rate limiting**: Scanning many books rapidly could hit API rate limits. [Mitigation: cached results make repeated scans instant; `nocache` flag available for testing]
- **attachToWorkSlug to nonexistent work**: If the client sends a stale slug (e.g., the Work was deleted between dedup check and submission), the endpoint returns 400. [Mitigation: standard error handling, user retries]
- **Data directory permissions in Docker**: Bind-mounted `./data/` can have ownership mismatches between host and container. [Mitigation: container runs as root to match host ownership created by prior Docker runs; `writeCache` is now non-fatal]
