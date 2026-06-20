## ADDED Requirements

### Requirement: ISBN lookup from Open Library

The system SHALL query the Open Library ISBN endpoint (`https://openlibrary.org/isbn/{isbn}.json`) to retrieve book metadata. The request SHALL have a 20-second timeout. On success, the response SHALL be parsed into the normalized lookup result format. When the response contains `authors` as key objects, the system SHALL resolve each author key to a name via the author endpoint. When the response contains `author` as plain name strings, the system SHALL use those names directly.

#### Scenario: Successful Open Library lookup
- **WHEN** a valid ISBN is provided and Open Library returns a successful response
- **THEN** the system returns normalized metadata with `source: "openlibrary"`, including title and at least one author

#### Scenario: Open Library returns plain author strings
- **WHEN** Open Library returns `author` as an array of plain name strings (e.g., "Orwell, George, 1903-1950.") instead of `authors` with key objects
- **THEN** the system extracts author names directly, reversing "Last, First, dates" format to "First Last"

#### Scenario: Open Library returns no data
- **WHEN** Open Library returns a 404 or empty response for the ISBN
- **THEN** the system falls back to Google Books (if configured) or returns a 404 error

#### Scenario: Open Library network error
- **WHEN** the Open Library request times out or encounters a network error
- **THEN** the system falls back to Google Books (if configured) or returns a 404 error

### Requirement: ISBN lookup from Google Books (fallback)

The system SHALL query the Google Books API (`https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}`) as a fallback when Open Library fails. The request SHALL include the API key from `GOOGLE_BOOKS_API_KEY` environment variable. If the environment variable is not set, the Google Books fallback SHALL be skipped. The request SHALL have a 20-second timeout.

#### Scenario: Successful Google Books fallback
- **WHEN** Open Library fails and Google Books returns a successful response
- **THEN** the system returns normalized metadata with `source: "google"`, including title and at least one author

#### Scenario: Google Books key not configured
- **WHEN** Open Library fails and `GOOGLE_BOOKS_API_KEY` is not set
- **THEN** the system returns a 404 error with message "Couldn't find this ISBN"

#### Scenario: Both APIs fail
- **WHEN** both Open Library and Google Books (if configured) fail to return data
- **THEN** the system returns a 404 error with message "Couldn't find this ISBN"

### Requirement: Response normalization

The system SHALL normalize responses from both APIs into a consistent format. Fields that are missing from the API response SHALL be omitted from the result (not set to empty strings or null). Author names SHALL be extracted as an array of strings. Genres SHALL be extracted as an array of lowercase, trimmed strings.

#### Scenario: Open Library response normalization
- **WHEN** Open Library returns a response with `title`, `authors`, `publishers`, `publish_date`, `number_of_pages`, `subjects`, and `description`
- **THEN** the system maps these to `title`, `authors`, `publisher`, `publish_date`, `page_count`, `genres`, and `description` in the normalized result

#### Scenario: Google Books response normalization
- **WHEN** Google Books returns a response with `volumeInfo.title`, `volumeInfo.authors`, `volumeInfo.publisher`, `volumeInfo.publishedDate`, `volumeInfo.pageCount`, `volumeInfo.categories`, and `volumeInfo.description`
- **THEN** the system maps these to `title`, `authors`, `publisher`, `publish_date`, `page_count`, `genres`, and `description` in the normalized result

#### Scenario: Missing optional fields
- **WHEN** an API response omits a field such as subtitle, publisher, or description
- **THEN** the corresponding field is omitted from the normalized result

### Requirement: Cover image extraction and download

The system SHALL extract a cover URL from the API response when available. For Open Library, it SHALL construct the cover URL from `covers[0]` as `https://covers.openlibrary.org/b/id/{cover_id}-M.jpg`. For Google Books, it SHALL use `volumeInfo.imageLinks.thumbnail` if present. The system SHALL download the cover image to `attachments/{cover_filename}` using a unique filename generated via `crypto.randomUUID()` with the original file's extension preserved, and return the filename. A failed cover download SHALL NOT prevent the metadata from being returned.

#### Scenario: Cover URL available from Open Library
- **WHEN** Open Library returns a `covers` array with at least one entry
- **THEN** the system downloads the cover image and returns `cover_image` as a unique filename and `cover_url` as the raw URL

#### Scenario: Cover URL available from Google Books
- **WHEN** Google Books returns `volumeInfo.imageLinks.thumbnail`
- **THEN** the system downloads the cover image and returns `cover_image` as a unique filename and `cover_url` as the raw URL

#### Scenario: No cover available
- **WHEN** neither API returns a cover image URL
- **THEN** the system omits `cover_image` and `cover_url` from the result

#### Scenario: Cover download fails
- **WHEN** a cover URL is available but the download fails (network error, timeout)
- **THEN** the system omits `cover_image` from the result but still returns `cover_url` and all other metadata

#### Scenario: Successive lookups produce different filenames
- **WHEN** two different ISBNs are looked up via Google Books and both have cover URLs
- **THEN** each lookup returns a different `cover_image` filename, so the two covers are stored as separate files

### Requirement: Cache lookup results

The system SHALL cache successful lookup results as JSON files in `.booktracker/cache/{isbn}.json`. Before querying any external API, the system SHALL check if a cache file exists for the given ISBN. If a cache file exists, the cached result SHALL be returned immediately without querying any API.

#### Scenario: Cache hit
- **WHEN** a lookup is requested for an ISBN that already has a cache file
- **THEN** the system returns the cached result without making any external API calls

#### Scenario: Cache miss
- **WHEN** a lookup is requested for an ISBN that has no cache file
- **THEN** the system queries external APIs and writes the successful result to cache

#### Scenario: Cache file is corrupted
- **WHEN** a cache file exists but cannot be parsed as valid JSON
- **THEN** the system treats it as a cache miss, queries external APIs, and overwrites the corrupted file

### Requirement: ISBN lookup API endpoint

The system SHALL expose a `GET /api/lookup` endpoint that accepts an `isbn` query parameter. On success, it SHALL return a 200 response with the normalized lookup result. On failure, it SHALL return a 404 response with `{ error: "Couldn't find this ISBN" }`. The endpoint SHALL be registered in the Express app following the existing router factory pattern.

#### Scenario: Valid ISBN lookup
- **WHEN** `GET /api/lookup?isbn=9780141036144` is called and the ISBN is found
- **THEN** the system returns a 200 response with normalized book metadata

#### Scenario: ISBN not found
- **WHEN** `GET /api/lookup?isbn=0000000000000` is called and no API returns data
- **THEN** the system returns a 404 response with `{ error: "Couldn't find this ISBN" }`

#### Scenario: Missing ISBN parameter
- **WHEN** `GET /api/lookup` is called without an `isbn` query parameter
- **THEN** the system returns a 400 response with `{ error: "ISBN parameter is required" }`
