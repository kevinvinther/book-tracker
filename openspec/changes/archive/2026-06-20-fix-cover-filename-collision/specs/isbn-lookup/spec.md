## MODIFIED Requirements

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
