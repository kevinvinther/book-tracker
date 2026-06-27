# multi-source-lookup Specification

## Purpose
TBD - created by archiving change enrich-edit-pages. Update Purpose after archive.
## Requirements
### Requirement: Multi-source lookup API endpoint

The system SHALL expose a `GET /api/lookup/all` endpoint that accepts an `isbn` query parameter, an optional `sources` query parameter (a comma-separated list of source identifiers, e.g. `google,openlibrary,goodreads,amazon`), and optional `title` and `author` query parameters used by sources that search by text rather than ISBN (the cover-only image sources). The endpoint SHALL recognize the source identifiers `google`, `openlibrary`, `goodreads`, `amazon`, `googleimages`, and `kindlecovers`; unrecognized identifiers SHALL be ignored. When `sources` is omitted, the endpoint SHALL query the default source set (`google`, `openlibrary`, `goodreads`, `amazon`) — the two cover-only image sources are opt-in and queried only when named explicitly. The endpoint SHALL query the selected sources in parallel and return a 200 response with `{ results: [...], errors: [...] }`, where each element of `results` is a normalized lookup result tagged with its `source`. The existing `GET /api/lookup` endpoint and its behavior SHALL remain unchanged.

#### Scenario: Default source set when sources omitted
- **WHEN** `GET /api/lookup/all?isbn=9780141036144` is called with no `sources` parameter
- **THEN** the system queries `google`, `openlibrary`, `goodreads`, and `amazon` (not the cover-only image sources) and returns a 200 response with `results` and `errors`

#### Scenario: Cover-only sources are opt-in
- **WHEN** `GET /api/lookup/all?isbn=9780141036144&sources=googleimages,kindlecovers&title=...&author=...` is called
- **THEN** the system queries only the two named cover-only image sources, using the supplied title and author

#### Scenario: Source selection limits the query
- **WHEN** `GET /api/lookup/all?isbn=9780141036144&sources=openlibrary` is called
- **THEN** the system queries only Open Library and returns a `results` array containing at most the Open Library entry, making no other source request

#### Scenario: Missing ISBN parameter
- **WHEN** `GET /api/lookup/all` is called without an `isbn` query parameter
- **THEN** the system returns a 400 response with `{ error: "ISBN parameter is required" }`

### Requirement: Partial failure tolerance

The endpoint SHALL return a 200 response as long as the request itself is well-formed, regardless of how many sources succeed. A source that connects but finds no matching book (a clean no-result) SHALL be omitted from both `results` and `errors`. A source that is blocked, errors, times out, or fails to parse SHALL be omitted from `results` and instead listed in `errors` as `{ source, reason }`, where `reason` is a short machine-readable label (e.g. `blocked`, `timeout`, `parse_error`, `http_error`). When every selected source yields nothing and none errored, both arrays SHALL be empty.

#### Scenario: One source errors, another succeeds
- **WHEN** Open Library returns data but Amazon is blocked with a CAPTCHA
- **THEN** the system returns a 200 response with `results` containing the Open Library entry and `errors` containing `{ source: "amazon", reason: ... }`

#### Scenario: Clean no-match is silently omitted
- **WHEN** Goodreads connects normally but has no book matching the ISBN
- **THEN** Goodreads appears in neither `results` nor `errors`

#### Scenario: All sources yield nothing
- **WHEN** no selected source returns usable metadata and none errored
- **THEN** the system returns a 200 response with `{ results: [], errors: [] }`

### Requirement: Per-source cache

The system SHALL cache each source's normalized result independently as JSON in `.booktracker/cache/{isbn}.{source}.json`, separate from the single-result `{isbn}.json` cache used by `GET /api/lookup`. Before querying a source, the system SHALL return that source's cache file if present, unless cache-skipping is requested. The endpoint SHALL accept a `nocache` query parameter (`1` or `true`) that forces a fresh fetch and overwrites the per-source cache.

#### Scenario: Per-source cache hit
- **WHEN** `GET /api/lookup/all?isbn=9780141036144&sources=google` is called and `.booktracker/cache/9780141036144.google.json` exists
- **THEN** the system returns the cached Google result without calling the Google Books API

#### Scenario: Cache skip forces refetch
- **WHEN** `GET /api/lookup/all?isbn=9780141036144&sources=google&nocache=1` is called and a per-source cache file exists
- **THEN** the system queries Google Books again and overwrites `.booktracker/cache/9780141036144.google.json`

#### Scenario: Per-source cache does not collide with single-result cache
- **WHEN** an ISBN has been looked up via both `GET /api/lookup` and `GET /api/lookup/all`
- **THEN** the single-result `{isbn}.json` and the per-source `{isbn}.{source}.json` files coexist without overwriting each other

### Requirement: Cover URLs returned without download

For the multi-source endpoint, each source result SHALL include the raw `cover_url` when available so the client can preview it remotely, but the endpoint SHALL NOT download cover images. Downloading a chosen cover happens later, when the edit page saves.

#### Scenario: Cover preview without download
- **WHEN** a source result has a cover available
- **THEN** the result includes `cover_url` (the raw URL) and does not trigger a download into `attachments/`

