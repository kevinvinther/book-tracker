## ADDED Requirements

### Requirement: Dedup check endpoint
The system SHALL expose a `GET /api/quick-add/check-dedup` endpoint that accepts `isbn`, `title`, and `author` query parameters. The endpoint SHALL check for an Edition with an exact ISBN match. If found, it SHALL return the Edition slug, the linked Work slug and title, and the number of copies. The endpoint SHALL also check for Works whose title contains the given title string (case-insensitive substring match) and that share at least one author. Matching Works SHALL be returned with their slug, title, and author names. All parameters are optional; if none are provided, the response SHALL return empty matches.

#### Scenario: ISBN exact match found
- **WHEN** `GET /api/quick-add/check-dedup?isbn=9780141036144` is called and an Edition with that ISBN exists
- **THEN** the response has status 200 with `editionMatch` containing the edition slug, work slug, work title, and copy count

#### Scenario: Title+author fuzzy match found
- **WHEN** `GET /api/quick-add/check-dedup?title=Dune&author=Frank+Herbert` is called and a Work "Dune" by "Frank Herbert" exists
- **THEN** the response has status 200 with `workMatches` containing that Work's slug, title, and author names

#### Scenario: No duplicates found
- **WHEN** `GET /api/quick-add/check-dedup?isbn=0000000000&title=Unknown+Book` is called
- **THEN** the response has status 200 with `editionMatch: null` and `workMatches: []`

#### Scenario: Multiple work matches
- **WHEN** the title query matches more than one Work
- **THEN** all matching Works are returned in `workMatches`, up to a maximum of 5 results

#### Scenario: No parameters provided
- **WHEN** `GET /api/quick-add/check-dedup` is called without any query parameters
- **THEN** the response has status 200 with `editionMatch: null` and `workMatches: []`

### Requirement: ISBN lookup tries Google Books first
The ISBN lookup SHALL query Google Books first when `GOOGLE_BOOKS_API_KEY` is configured, falling back to Open Library if Google returns no data. Without an API key, the system SHALL skip Google and query Open Library directly. All external API requests SHALL include a `User-Agent` header.

#### Scenario: Google Books succeeds
- **WHEN** `GOOGLE_BOOKS_API_KEY` is set and Google Books returns volume data
- **THEN** the system returns the result with `source: "google"`

#### Scenario: Google Books fails, Open Library fallback
- **WHEN** `GOOGLE_BOOKS_API_KEY` is set but Google Books returns no data or an error
- **THEN** the system queries Open Library and returns the result with `source: "openlibrary"` if found

#### Scenario: No API key configured
- **WHEN** `GOOGLE_BOOKS_API_KEY` is not set
- **THEN** the system skips Google Books and queries Open Library directly

### Requirement: Publisher filtering against author names
When Open Library returns a `publishers` array, the system SHALL skip any publisher whose name matches a resolved author name (case-insensitive). The first non-author publisher SHALL be used. This prevents author names incorrectly appearing as the publisher.

#### Scenario: Author name in publishers list
- **WHEN** Open Library returns `publishers: ["Brandon Sanderson", "Tor Fantasy"]` and the resolved author is "Brandon Sanderson"
- **THEN** the system sets `publisher` to "Tor Fantasy"

#### Scenario: All publishers are authors
- **WHEN** all entries in the publishers list match resolved author names
- **THEN** the `publisher` field is omitted

### Requirement: Cache bypass flag
The `GET /api/lookup` endpoint SHALL accept an optional `nocache` query parameter. When set to `"1"` or `"true"`, the system SHALL skip the local cache and query the external APIs directly. The result SHALL still be written to cache for future use.

#### Scenario: Cache bypass requested
- **WHEN** `GET /api/lookup?isbn=9780141036144&nocache=1` is called and a cache file exists
- **THEN** the cache file is ignored and the APIs are queried
- **AND** the result is written to cache

### Requirement: Cache write failure is non-fatal
The system SHALL NOT propagate cache write failures to the caller. If the cache file cannot be written (e.g., due to permissions), the lookup result SHALL still be returned successfully.

#### Scenario: Cache directory is not writable
- **WHEN** the API returns data but the cache directory has insufficient permissions
- **THEN** the lookup result is returned with HTTP 200 and no error is raised

## MODIFIED Requirements

### Requirement: Quick-add endpoint creates entities in one request
The system SHALL expose `POST /api/quick-add` that accepts a JSON body with work, author, edition, and copy fields. It SHALL resolve or create authors, then create the Work, Edition, and Copy sequentially. When `attachToWorkSlug` is provided, the system SHALL skip Work creation and create only the Edition and Copy, linked to the existing Work. The existing Work's metadata SHALL NOT be modified. It SHALL return the created Work's slug with HTTP 201.

#### Scenario: Quick-add with existing author
- **WHEN** a POST is made to `/api/quick-add` with title "Dune", authorNames ["Frank Herbert"] (who already exists), publisher "Chilton Books", publish_date "1965-08-01"
- **THEN** the response has status 201, includes `workSlug`, and the existing "Frank Herbert" author is linked

#### Scenario: Quick-add with new author
- **WHEN** a POST is made to `/api/quick-add` with title "New Book", authorNames ["Brand New Author"], and required fields
- **THEN** the response has status 201 and a new Author "Brand New Author" is created

#### Scenario: Quick-add with multiple authors
- **WHEN** a POST is made with authorNames ["Frank Herbert", "Brian Herbert"]
- **THEN** both authors are linked (existing or created)

#### Scenario: Missing required field title
- **WHEN** a POST is made to `/api/quick-add` without a `title`
- **THEN** the response has status 400 with an error indicating title is required

#### Scenario: Missing authors
- **WHEN** a POST is made to `/api/quick-add` with title "Book" but an empty or missing `authorNames`
- **THEN** the response has status 400 with an error indicating at least one author is required

#### Scenario: Attach to existing Work
- **WHEN** a POST is made to `/api/quick-add` with `attachToWorkSlug` set to a valid existing Work slug, authorNames, and optional edition/copy fields
- **THEN** the system does not create a new Work
- **AND** the system creates an Edition linked to the existing Work
- **AND** the system creates a Copy linked to the Edition and existing Work
- **AND** the response includes `workSlug` matching the existing Work

#### Scenario: attachToWorkSlug references nonexistent Work
- **WHEN** a POST is made to `/api/quick-add` with `attachToWorkSlug` set to a slug that does not exist
- **THEN** the response has status 400 with an error indicating the Work was not found

#### Scenario: Neither title nor attachToWorkSlug provided
- **WHEN** a POST is made to `/api/quick-add` with authorNames but without `title` and without `attachToWorkSlug`
- **THEN** the response has status 400 with an error indicating either title or attachToWorkSlug is required
