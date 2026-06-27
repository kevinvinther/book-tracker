# multi-source-lookup Specification

## Purpose
TBD - created by archiving change enrich-edit-pages. Update Purpose after archive.
## Requirements
### Requirement: Multi-source lookup API endpoint

The system SHALL expose a `GET /api/lookup/all` endpoint that accepts an `isbn` query parameter and an optional `sources` query parameter (a comma-separated list of source identifiers, e.g. `google,openlibrary`). When `sources` is omitted, the endpoint SHALL query all known sources. The endpoint SHALL query the selected sources in parallel and return a 200 response with `{ results: [...] }`, where each element is a normalized lookup result tagged with its `source`. The existing `GET /api/lookup` endpoint and its behavior SHALL remain unchanged.

#### Scenario: Both sources return data
- **WHEN** `GET /api/lookup/all?isbn=9780141036144&sources=google,openlibrary` is called and both sources return metadata
- **THEN** the system returns a 200 response with `results` containing one entry per source, each carrying its own `source` field and normalized metadata

#### Scenario: Source selection limits the query
- **WHEN** `GET /api/lookup/all?isbn=9780141036144&sources=openlibrary` is called
- **THEN** the system queries only Open Library and returns a `results` array containing at most the Open Library entry, making no Google Books request

#### Scenario: Missing ISBN parameter
- **WHEN** `GET /api/lookup/all` is called without an `isbn` query parameter
- **THEN** the system returns a 400 response with `{ error: "ISBN parameter is required" }`

### Requirement: Partial failure tolerance

A source that errors, times out, or returns no data SHALL be omitted from the `results` array rather than failing the whole request. The endpoint SHALL return a 200 response as long as the request itself is well-formed, even when every source yields nothing (an empty `results` array).

#### Scenario: One source fails, the other succeeds
- **WHEN** Open Library returns data but Google Books times out
- **THEN** the system returns a 200 response with `results` containing only the Open Library entry

#### Scenario: All sources yield nothing
- **WHEN** no selected source returns usable metadata for the ISBN
- **THEN** the system returns a 200 response with `{ results: [] }`

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

