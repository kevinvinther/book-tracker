# work-api Specification

## Purpose
TBD - created by archiving change work-api. Update Purpose after archive.
## Requirements
### Requirement: Work file format
A Work entity SHALL be stored as a markdown file at `works/{slug}.md` with YAML frontmatter and an auto-generated markdown body. The frontmatter SHALL include `type: work`, `slug`, `title` (required), and optional fields: `subtitle`, `authors[]` (wikilinks), `original_language`, `original_publish_year`, `genres[]`, `description`, `series` (wikilink), `series_position`, `primary_cover`, `aliases[]`, `created_at`, and `_schema`.

#### Scenario: Example work file on disk
- **WHEN** a work with title "The Brothers Karamazov", slug "the-brothers-karamazov", author "[[authors/fyodor-dostoevsky]]", and genres ["fiction", "classic"] is created
- **THEN** the file `works/the-brothers-karamazov.md` exists on disk with frontmatter similar to:
  ```yaml
  ---
  type: work
  slug: the-brothers-karamazov
  title: "The Brothers Karamazov"
  authors:
    - "[[authors/fyodor-dostoevsky]]"
  genres:
    - "fiction"
    - "classic"
  created_at: 2024-01-10T12:00:00.000Z
  _schema: 1
  ---
  ```
  followed by an auto-generated markdown body (placeholder for now)

### Requirement: Create a work
The system SHALL expose `POST /api/works` that accepts a JSON body with at least a `title` field, generates a slug via `generateSlug`, creates a Work markdown file in `works/{slug}.md`, inserts it into the in-memory index, and returns the created work with HTTP 201. The `created_at` field SHALL be set to the current ISO 8601 datetime and never modified thereafter. The optional `aliases` field, when provided as an array of strings, SHALL be written to the work's frontmatter. When `genres` is provided, each genre SHALL be normalized via `normalizeGenre` (lowercase, ASCII-folded, kebab-case via `limax`) before being written to the frontmatter.

#### Scenario: Successful creation with title only
- **WHEN** a POST request is made to `/api/works` with `{ "title": "The Brothers Karamazov" }`
- **THEN** the response has status 201 and a JSON body containing the work with a generated slug, `title: "The Brothers Karamazov"`, `authors: []`, and `created_at` set to the current time

#### Scenario: Creation with aliases
- **WHEN** a POST request is made to `/api/works` with `{ "title": "Dune", "aliases": ["Dune Book 1", "Dune 1965"] }`
- **THEN** the response has status 201 and the work file on disk contains the aliases array

#### Scenario: Creation with all fields
- **WHEN** a POST request is made to `/api/works` with `{ "title": "Dune", "subtitle": "Book One", "authors": ["[[authors/frank-herbert]]"], "genres": ["fiction", "science-fiction"], "description": "A sci-fi classic", "original_language": "en", "original_publish_year": 1965, "aliases": ["Dune 1965"] }`
- **THEN** the response has status 201 and the work file on disk contains all provided fields plus the generated slug, type, created_at, and _schema

#### Scenario: Creation with unnormalized genres
- **WHEN** a POST request is made to `/api/works` with `{ "title": "Dune", "genres": ["Science Fiction", "  FANTASY  "] }`
- **THEN** the work file on disk contains `genres: ["fantasy", "science-fiction"]` (normalized)
- **AND** the response returns the normalized genre values

#### Scenario: Creation with missing title
- **WHEN** a POST request is made to `/api/works` with `{}` or `{ "subtitle": "no title" }`
- **THEN** the response has status 400 with an error message indicating title is required

### Requirement: List all works with search, sort, and resolved copy count and authors
The system SHALL expose `GET /api/works` that returns all works as a JSON array, each with a resolved `copy_count` and `authors_meta` (an array of `{ slug, name }` for each author wikilink) computed from the in-memory index. The endpoint SHALL accept optional query parameters: `?q=` for search (filters by title, author name, genre, or alias), `?sort=` accepting `title`, `author`, or `created_at`, and `?order=` accepting `asc` or `desc`.

#### Scenario: List all works
- **WHEN** a GET request is made to `/api/works`
- **THEN** the response has status 200 and a JSON array of all works, each including a `copy_count` and `authors_meta`

#### Scenario: Search works by query
- **WHEN** a GET request is made to `/api/works?q=dune`
- **THEN** the response has status 200 and a JSON array containing only works whose title, author name, or genre matches "dune" (case-insensitive)

#### Scenario: Sort by title ascending
- **WHEN** a GET request is made to `/api/works?sort=title&order=asc`
- **THEN** the response has status 200 and the works are sorted alphabetically by title (A to Z)

#### Scenario: Sort by created_at descending (default)
- **WHEN** a GET request is made to `/api/works?sort=created_at`
- **THEN** the response has status 200 and the works are sorted newest-first by `created_at`

### Requirement: Get a single work with resolved counts and relations
The system SHALL expose `GET /api/works/:slug` that returns the full work entity with resolved `edition_count` and `copy_count` computed from the in-memory index, plus resolved `authors_meta` (an array of `{ slug, name }` for each author wikilink), `series_meta` (`{ slug, name }` if the work has a linked series, otherwise `null`), and a `body` field containing the rendered markdown body generated by `renderBody(work, index)`.

#### Scenario: Work exists with body
- **WHEN** a GET request is made to `/api/works/the-brothers-karamazov`
- **THEN** the response includes a `body` field containing a rendered markdown string with the work's title, author metadata, and editions list

#### Scenario: Work exists with editions and copies
- **WHEN** a GET request is made to `/api/works/the-brothers-karamazov` and the work has 2 editions and 3 copies
- **THEN** the response has status 200 and the JSON body includes all work fields plus `edition_count: 2`, `copy_count: 3`, and a `body` string

#### Scenario: Work has resolved author names
- **WHEN** a GET request is made to a work with two linked authors
- **THEN** the response includes `authors_meta` as an array of `{ slug, name }` objects, one per author, in the same order as the `authors` wikilink array

#### Scenario: Work belongs to a series
- **WHEN** a GET request is made to a work whose `series` field links to an existing series
- **THEN** the response includes `series_meta: { slug, name }` for that series

#### Scenario: Work has no series
- **WHEN** a GET request is made to a work with no `series` field
- **THEN** the response includes `series_meta: null`

#### Scenario: Work does not exist
- **WHEN** a GET request is made to `/api/works/nonexistent`
- **THEN** the response has status 404 with an error message

### Requirement: Update a work
The system SHALL expose `PATCH /api/works/:slug` that accepts a JSON body with any subset of mutable work fields (title, subtitle, authors, original_language, original_publish_year, genres, description, series, series_position, primary_cover, aliases). The handler SHALL re-read the file from disk before writing, merge the incoming fields into the existing frontmatter, write atomically, and update the index. When `genres` is provided, each genre SHALL be normalized via `normalizeGenre` before being written. The `slug`, `type`, `created_at`, and `_schema` fields SHALL never be modified.

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

#### Scenario: Update genres with normalization
- **WHEN** a PATCH request is made with `{ "genres": ["Science Fiction", "Adventure"] }`
- **THEN** the work file on disk contains `genres: ["adventure", "science-fiction"]`

#### Scenario: Attempt to change slug
- **WHEN** a PATCH request is made to `/api/works/the-brothers-karamazov` with `{ "slug": "new-slug" }`
- **THEN** the `slug` field in the request is ignored — the slug does not change

#### Scenario: Update non-existent work
- **WHEN** a PATCH request is made to `/api/works/nonexistent` with `{ "title": "Test" }`
- **THEN** the response has status 404 with an error message

### Requirement: Delete a work with orphan protection
The system SHALL expose `DELETE /api/works/:slug` that deletes the work. If the work has editions referencing it, the system SHALL refuse deletion with HTTP 409 and a message listing the edition count. The `?cascade=true` query parameter SHALL override this protection and delete the work, all linked editions, all linked copies, and all notes referencing those copies.

#### Scenario: Delete work with no editions
- **WHEN** a DELETE request is made to `/api/works/dune` and the work has zero editions
- **THEN** the response has status 200 with a confirmation message
- **AND** the work file is removed from disk
- **AND** `index.getWork("dune")` returns `undefined`

#### Scenario: Delete work with editions (orphan protected)
- **WHEN** a DELETE request is made to `/api/works/dune` and the work has 2 editions
- **THEN** the response has status 409 with an error message indicating 2 editions exist and suggesting `?cascade=true`

#### Scenario: Cascade delete work with editions
- **WHEN** a DELETE request is made to `/api/works/dune?cascade=true` and the work has 2 editions with 3 copies total and 5 notes
- **THEN** the response has status 200
- **AND** the work file, all edition files, all copy files, and all note files are removed from disk
- **AND** all corresponding index entries are removed

#### Scenario: Delete non-existent work
- **WHEN** a DELETE request is made to `/api/works/nonexistent`
- **THEN** the response has status 404 with an error message

### Requirement: Manage work aliases
The system SHALL expose `POST /api/works/:slug/aliases` to append an alias and `DELETE /api/works/:slug/aliases` to remove an alias. Aliases SHALL be stored in the work's `aliases[]` frontmatter field.

#### Scenario: Add alias to work
- **WHEN** a POST request is made to `/api/works/dune/aliases` with `{ "alias": "Dune Book 1" }`
- **THEN** the response has status 200 and the work's aliases now include "Dune Book 1"

#### Scenario: Remove alias from work
- **WHEN** a DELETE request is made to `/api/works/dune/aliases` with `{ "alias": "Dune Book 1" }`
- **THEN** the response has status 200 and the alias is removed from the work's aliases list

#### Scenario: Remove non-existent alias
- **WHEN** a DELETE request is made to `/api/works/dune/aliases` with `{ "alias": "not-there" }`
- **THEN** the response has status 404 with an error message

