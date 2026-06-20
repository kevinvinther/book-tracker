## MODIFIED Requirements

### Requirement: Create a work
The system SHALL expose `POST /api/works` that accepts a JSON body with at least a `title` field, generates a slug via `generateSlug`, creates a Work markdown file in `works/{slug}.md`, inserts it into the in-memory index, and returns the created work with HTTP 201. The `created_at` field SHALL be set to the current ISO 8601 datetime and never modified thereafter. The optional `aliases` field, when provided as an array of strings, SHALL be written to the work's frontmatter.

#### Scenario: Successful creation with title only
- **WHEN** a POST request is made to `/api/works` with `{ "title": "The Brothers Karamazov" }`
- **THEN** the response has status 201 and a JSON body containing the work with a generated slug, `title: "The Brothers Karamazov"`, `authors: []`, and `created_at` set to the current time

#### Scenario: Creation with aliases
- **WHEN** a POST request is made to `/api/works` with `{ "title": "Dune", "aliases": ["Dune Book 1", "Dune 1965"] }`
- **THEN** the response has status 201 and the work file on disk contains the aliases array

#### Scenario: Creation with all fields
- **WHEN** a POST request is made to `/api/works` with `{ "title": "Dune", "subtitle": "Book One", "authors": ["[[authors/frank-herbert]]"], "genres": ["fiction", "science-fiction"], "description": "A sci-fi classic", "original_language": "en", "original_publish_year": 1965, "aliases": ["Dune 1965"] }`
- **THEN** the response has status 201 and the work file on disk contains all provided fields plus the generated slug, type, created_at, and _schema

#### Scenario: Creation with missing title
- **WHEN** a POST request is made to `/api/works` with `{}` or `{ "subtitle": "no title" }`
- **THEN** the response has status 400 with an error message indicating title is required

### Requirement: Update a work
The system SHALL expose `PATCH /api/works/:slug` that accepts a JSON body with any subset of mutable work fields (title, subtitle, authors, original_language, original_publish_year, genres, description, series, series_position, primary_cover, aliases). The handler SHALL re-read the file from disk before writing, merge the incoming fields into the existing frontmatter, write atomically, and update the index. The `slug`, `type`, `created_at`, and `_schema` fields SHALL never be modified.

#### Scenario: Update title only
- **WHEN** a PATCH request is made to `/api/works/the-brothers-karamazov` with `{ "title": "The Brothers Karamazov (Revised)" }`
- **THEN** the response has status 200 and the work's title is updated
- **AND** all other fields remain unchanged

#### Scenario: Update aliases
- **WHEN** a PATCH request is made with `{ "aliases": ["Updated Alias"] }`
- **THEN** the response has status 200 and the work's aliases are updated

#### Scenario: Omit aliases in PATCH
- **WHEN** a PATCH request is made without an `aliases` field
- **THEN** existing aliases on disk are preserved (not cleared)

#### Scenario: Attempt to change slug
- **WHEN** a PATCH request is made to `/api/works/the-brothers-karamazov` with `{ "slug": "new-slug" }`
- **THEN** the `slug` field in the request is ignored — the slug does not change

#### Scenario: Update non-existent work
- **WHEN** a PATCH request is made to `/api/works/nonexistent` with `{ "title": "Test" }`
- **THEN** the response has status 404 with an error message
