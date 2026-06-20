# genre-normalization Specification

## Purpose
TBD - created by syncing change genre-normalization. Update Purpose after archive.
## Requirements
### Requirement: Genre normalization utility
The system SHALL provide a `normalizeGenre` function that accepts a raw genre string and returns its normalized form. Normalization SHALL use `limax` to produce lowercase, ASCII-folded, kebab-case output. The function SHALL trim leading and trailing whitespace before normalization.

#### Scenario: Normalize simple genre
- **WHEN** `normalizeGenre("Science Fiction")` is called
- **THEN** it returns `"science-fiction"`

#### Scenario: Normalize already-normalized genre
- **WHEN** `normalizeGenre("science-fiction")` is called
- **THEN** it returns `"science-fiction"` (idempotent)

#### Scenario: Normalize genre with Unicode characters
- **WHEN** `normalizeGenre("Déjà Vu")` is called
- **THEN** it returns a normalized form where accented characters are folded to ASCII equivalents

#### Scenario: Normalize genre with leading/trailing whitespace
- **WHEN** `normalizeGenre("  fiction  ")` is called
- **THEN** it returns `"fiction"`

#### Scenario: Normalize genre with mixed case and special characters
- **WHEN** `normalizeGenre("Sci-Fi & Fantasy")` is called
- **THEN** it returns a normalized kebab-case form with special characters stripped or folded

### Requirement: genres.yaml file format
The system SHALL maintain a `genres.yaml` file at `.booktracker/genres.yaml` relative to the library root. The file SHALL contain a flat YAML list of normalized genre strings. The file SHALL be readable and writable via utility functions in the `server/src/lib/genres.ts` module.

#### Scenario: genres.yaml on disk
- **WHEN** the file `.booktracker/genres.yaml` exists with genres `["fiction", "science-fiction", "classic"]`
- **THEN** `readGenresYaml()` returns `["fiction", "science-fiction", "classic"]`

#### Scenario: genres.yaml does not exist
- **WHEN** `readGenresYaml()` is called and the file does not exist
- **THEN** it returns an empty array `[]`

#### Scenario: Write genres.yaml atomically
- **WHEN** `writeGenresYaml(["fiction", "science-fiction"])` is called
- **THEN** the file is written atomically (temp file + rename) to `.booktracker/genres.yaml`

### Requirement: Seed genres.yaml from existing works on startup
When the server starts and `genres.yaml` does not exist, the system SHALL collect all genre strings from all existing Works in the in-memory index, normalize each one, deduplicate them, sort alphabetically, and write the result to `genres.yaml`.

#### Scenario: First startup with existing works
- **WHEN** the server starts with no `genres.yaml` and 3 works have genres `["Science Fiction"]`, `["Fantasy", "science fiction"]`, and `["Fiction"]`
- **THEN** `genres.yaml` is created with `["fantasy", "fiction", "science-fiction"]`

#### Scenario: Startup with empty library
- **WHEN** the server starts with no `genres.yaml` and no works exist
- **THEN** `genres.yaml` is created with an empty list `[]`

#### Scenario: Startup with existing genres.yaml
- **WHEN** the server starts and `genres.yaml` already exists
- **THEN** the existing file is left untouched (no re-seeding)

### Requirement: GET /api/genres endpoint
The system SHALL expose `GET /api/genres` that returns all known genres as a deduplicated, sorted array of strings. The response SHALL merge the curated list from `genres.yaml` with any additional genres found in existing Works (normalized on read), deduplicating by normalized form.

#### Scenario: Curated list only
- **WHEN** `genres.yaml` contains `["fiction", "science-fiction"]` and no works exist
- **THEN** the response is `["fiction", "science-fiction"]`

#### Scenario: Merged with discovered genres
- **WHEN** `genres.yaml` contains `["fiction"]` and a work has genres `["science-fiction", "mystery"]`
- **THEN** the response is `["fiction", "mystery", "science-fiction"]` (merged, deduplicated, sorted)

#### Scenario: Duplicate across curated and discovered
- **WHEN** `genres.yaml` contains `["fiction"]` and a work has genre `"Fiction"` (different case)
- **THEN** the response contains `"fiction"` exactly once (merged by normalized form)

### Requirement: PATCH /api/genres endpoint
The system SHALL expose `PATCH /api/genres` that accepts a JSON body with a `genres` field containing an array of genre strings. It SHALL normalize each string in the array, deduplicate the result, sort alphabetically, and atomically write the result to `genres.yaml`. It SHALL return the updated list with HTTP 200.

#### Scenario: Replace curated list
- **WHEN** a PATCH request is made to `/api/genres` with `{ "genres": ["Fiction", "Science Fiction", "Mystery"] }`
- **THEN** `genres.yaml` is written with `["fiction", "mystery", "science-fiction"]`
- **AND** the response has status 200 with the normalized list

#### Scenario: Empty genres array
- **WHEN** a PATCH request is made to `/api/genres` with `{ "genres": [] }`
- **THEN** `genres.yaml` is written with an empty list `[]`
- **AND** the response has status 200 with `[]`

#### Scenario: Missing genres field
- **WHEN** a PATCH request is made to `/api/genres` with `{}`
- **THEN** the response has status 400 with an error message

#### Scenario: Genres field is not an array
- **WHEN** a PATCH request is made to `/api/genres` with `{ "genres": "not-an-array" }`
- **THEN** the response has status 400 with an error message

### Requirement: Genre normalization on work create and update
The system SHALL normalize all genre values before writing them to a Work file. When a Work is created via `POST /api/works` or updated via `PATCH /api/works/:slug`, any genres in the request body SHALL be run through `normalizeGenre` before being stored in the frontmatter. This SHALL apply only to the `genres` field; all other fields are unchanged.

#### Scenario: Create work with mixed-case genres
- **WHEN** a POST request is made to `/api/works` with `{ "title": "Dune", "genres": ["Science Fiction", "Fiction"] }`
- **THEN** the work file on disk contains `genres: ["science-fiction", "fiction"]`

#### Scenario: Update work genres
- **WHEN** a PATCH request is made to `/api/works/some-book` with `{ "genres": ["  FANTASY  "] }`
- **THEN** the work file on disk contains `genres: ["fantasy"]`

#### Scenario: Clear genres
- **WHEN** a PATCH request is made with `{ "genres": null }`
- **THEN** the `genres` field is removed from the work's frontmatter

#### Scenario: Genres not included in PATCH
- **WHEN** a PATCH request is made without a `genres` field
- **THEN** existing genres on disk are preserved unchanged (even if not yet normalized)

### Requirement: Quick-add accepts and normalizes genres
The system SHALL accept an optional `genres` field in the `POST /api/quick-add` request body. When provided, each genre SHALL be normalized via `normalizeGenre` before being written to the created Work's frontmatter.

#### Scenario: Quick-add with genres
- **WHEN** a POST is made to `/api/quick-add` with `{ "title": "Dune", "authorNames": ["Frank Herbert"], "genres": ["Science Fiction", "Adventure"] }`
- **THEN** the created Work file contains `genres: ["adventure", "science-fiction"]`

#### Scenario: Quick-add without genres
- **WHEN** a POST is made to `/api/quick-add` without a `genres` field
- **THEN** the created Work file has no `genres` field

### Requirement: genres.yaml management lives in a dedicated router
The system SHALL expose `GET /api/genres` and `PATCH /api/genres` via a dedicated Express router created by a `createGenresRouter(libraryPath)` factory function, registered in `server/src/index.ts`. The router SHALL manage the `genres.yaml` file at `{libraryPath}/.booktracker/genres.yaml` and require the in-memory Index for discovery-merging on GET.

#### Scenario: Router registered on startup
- **WHEN** the server starts
- **THEN** `GET /api/genres` and `PATCH /api/genres` are available
