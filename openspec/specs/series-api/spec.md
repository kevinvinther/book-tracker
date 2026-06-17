# series-api Specification

## Purpose
Full CRUD REST API for Series entities, including orphan-protected delete with cascade that removes the series link from all linked Works.

## Requirements

### Requirement: Series file format
A Series entity SHALL be stored as a markdown file at `series/{slug}.md` with YAML frontmatter containing `type: series`, `slug`, `name` (required), optional `total_works` (integer), optional `aliases[]`, `created_at`, and `_schema`.

#### Scenario: Example series file on disk
- **WHEN** a series with name "The Stormlight Archive" is created
- **THEN** the file `series/the-stormlight-archive.md` exists on disk with frontmatter:
  ```yaml
  ---
  type: series
  slug: the-stormlight-archive
  name: The Stormlight Archive
  created_at: 2024-01-10T12:00:00.000Z
  _schema: 1
  ---
  ```

### Requirement: Create a series
The system SHALL expose `POST /api/series` that accepts a JSON body with at least a `name` field, validates it is non-empty, generates a slug via `generateSlug`, creates a Series file at `series/{slug}.md`, inserts it into the index, and returns the created series with HTTP 201.

#### Scenario: Successful creation with name only
- **WHEN** a POST request is made to `/api/series` with `{ "name": "Dune Chronicles" }`
- **THEN** the response has status 201 and the series has `type: "series"`, a generated `slug`, `name: "Dune Chronicles"`, and `created_at` set

#### Scenario: Creation with all optional fields
- **WHEN** a POST request is made with `{ "name": "Dune Chronicles", "total_works": 6, "aliases": ["Dune Saga"] }`
- **THEN** the response has status 201 and all provided fields appear in the response and on disk

#### Scenario: Creation with missing name
- **WHEN** a POST request is made to `/api/series` without a `name` field (or with an empty string)
- **THEN** the response has status 400 with an error indicating `name` is required

### Requirement: List all series
The system SHALL expose `GET /api/series` that returns all series as a JSON array.

#### Scenario: List all series
- **WHEN** a GET request is made to `/api/series`
- **THEN** the response has status 200 and a JSON array of all series entities

#### Scenario: Empty library
- **WHEN** no series exist and a GET request is made to `/api/series`
- **THEN** the response has status 200 and an empty JSON array

### Requirement: Get a single series with resolved works
The system SHALL expose `GET /api/series/:slug` that returns the full series entity with a `works` array resolved from the in-memory index. Each element in `works` SHALL include at minimum `slug`, `title`, and `series_position`. Works SHALL be ordered by `series_position` ascending; works with no `series_position` SHALL appear last.

#### Scenario: Series exists with linked works
- **WHEN** a GET request is made to `/api/series/dune-chronicles` and two works link to it — one with `series_position: 1` and one with `series_position: 2`
- **THEN** the response has status 200 and includes all series fields plus `works` sorted by position: first position 1, then position 2

#### Scenario: Works without series_position appear last
- **WHEN** a GET request is made to a series slug and some linked works have no `series_position`
- **THEN** those works appear after all positioned works in the `works` array

#### Scenario: Series exists with no linked works
- **WHEN** a GET request is made to `/api/series/dune-chronicles` and no works link to it
- **THEN** the response has status 200 and `works` is an empty array

#### Scenario: Series does not exist
- **WHEN** a GET request is made to `/api/series/nonexistent`
- **THEN** the response has status 404 with an error message

### Requirement: Update a series
The system SHALL expose `PATCH /api/series/:slug` that accepts a JSON body with any subset of mutable series fields (`name`, `total_works`, `aliases`). The handler SHALL re-read the file from disk, merge incoming fields, write atomically, and update the index. The `slug`, `type`, `created_at`, and `_schema` fields SHALL never be modified. The `name` field SHALL not be set to an empty string.

#### Scenario: Update name
- **WHEN** a PATCH request is made to `/api/series/dune-chronicles` with `{ "name": "The Dune Chronicles" }`
- **THEN** the response has status 200 and `name` is updated

#### Scenario: Update total_works
- **WHEN** a PATCH request is made with `{ "total_works": 7 }`
- **THEN** the response has status 200 and `total_works` is updated

#### Scenario: Attempt to clear name
- **WHEN** a PATCH request is made with `{ "name": "" }`
- **THEN** the response has status 400 with an error indicating name must not be empty

#### Scenario: Ignore attempts to change slug or type
- **WHEN** a PATCH request is made with `{ "slug": "hacked", "type": "other" }`
- **THEN** the response has status 200 and `slug` and `type` remain unchanged

#### Scenario: Update non-existent series
- **WHEN** a PATCH request is made to `/api/series/nonexistent` with `{ "name": "x" }`
- **THEN** the response has status 404 with an error message

### Requirement: Delete a series with orphan protection
The system SHALL expose `DELETE /api/series/:slug` that performs a hard delete of the series file and removes it from the index. If any works in the index have `series: "[[series/{slug}]]"`, the delete SHALL be refused with HTTP 409 unless `?cascade=true` is provided. When `?cascade=true`, the handler SHALL remove the `series` and `series_position` fields from each linked Work's frontmatter file, write the files back atomically, update those works in the index, then delete the series file and remove it from the index.

#### Scenario: Delete series with no linked works
- **WHEN** a DELETE request is made to `/api/series/dune-chronicles` and no works link to it
- **THEN** the response has status 200 and the series file is removed from disk and the index

#### Scenario: Delete series with linked works (no cascade)
- **WHEN** a DELETE request is made to `/api/series/dune-chronicles` and two works link to it, and no query parameter is provided
- **THEN** the response has status 409 with an error indicating the series has linked works and instructing the user to use `?cascade=true`

#### Scenario: Delete series with cascade
- **WHEN** a DELETE request is made to `/api/series/dune-chronicles?cascade=true` and two works link to it
- **THEN** the response has status 200
- **AND** both Work files on disk no longer contain `series` or `series_position` fields
- **AND** the in-memory index no longer returns those works when filtering by that series
- **AND** the series file is removed from disk and the index

#### Scenario: Delete non-existent series
- **WHEN** a DELETE request is made to `/api/series/nonexistent`
- **THEN** the response has status 404 with an error message

### Requirement: Index method for series-linked works
The `Index` class SHALL expose a `getWorksBySeries(seriesSlug: string): Work[]` method that returns all works whose `series` field equals `[[series/{seriesSlug}]]`.

#### Scenario: Works linked to a series
- **WHEN** `getWorksBySeries("dune-chronicles")` is called and two works have `series: "[[series/dune-chronicles]]"`
- **THEN** the method returns both works

#### Scenario: No works linked to a series
- **WHEN** `getWorksBySeries("nonexistent")` is called
- **THEN** the method returns an empty array
