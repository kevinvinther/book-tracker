## ADDED Requirements

### Requirement: Copy file format
A Copy entity SHALL be stored as a markdown file at `copies/{slug}.md` with YAML frontmatter containing `type: copy`, `slug`, `edition` (required, wikilink to `editions/{slug}`), `work` (required, wikilink to `works/{slug}`), `status` (required, one of `owned`, `lent`, `lost`, `given-away`, `sold`), optional fields `cover_image`, `release_date`, `condition`, `acquisition_date`, `acquisition_source`, `price_amount`, `price_currency`, `location`, `created_at`, and `_schema`.

#### Scenario: Example copy file on disk
- **WHEN** a copy of edition `dune-ace-books-1990` (work `dune`) is created with condition `good` and status `owned`
- **THEN** the file `copies/dune-ace-books-1990.md` exists on disk with:
  ```yaml
  ---
  type: copy
  slug: dune-ace-books-1990
  edition: "[[editions/dune-ace-books-1990]]"
  work: "[[works/dune]]"
  status: owned
  condition: good
  created_at: 2024-01-10T12:00:00.000Z
  _schema: 1
  ---
  ```

### Requirement: Create a copy
The system SHALL expose `POST /api/copies` that accepts a JSON body with at least `edition` (edition slug) and `work` (work slug), validates both exist in the index, generates a slug from the edition slug via `generateSlug`, creates a Copy file in `copies/{slug}.md`, inserts it into the index, and returns the created copy with HTTP 201. The `status` field SHALL default to `owned` if not provided.

#### Scenario: Successful creation with required fields
- **WHEN** a POST request is made to `/api/copies` with `{ "edition": "dune-ace-books-1990", "work": "dune" }`
- **THEN** the response has status 201 and the copy has `edition: "[[editions/dune-ace-books-1990]]"`, `work: "[[works/dune]]"`, and `status: "owned"`

#### Scenario: Creation with all optional fields
- **WHEN** a POST request is made with `edition`, `work`, `condition`, `acquisition_date`, `acquisition_source`, `price_amount`, `price_currency`, `location`, and `status`
- **THEN** the response has status 201 and all provided fields appear in the response and on disk

#### Scenario: Creation with missing edition
- **WHEN** a POST request is made to `/api/copies` without an `edition` field
- **THEN** the response has status 400 with an error indicating `edition` is required

#### Scenario: Creation with missing work
- **WHEN** a POST request is made to `/api/copies` without a `work` field
- **THEN** the response has status 400 with an error indicating `work` is required

#### Scenario: Creation with non-existent edition
- **WHEN** a POST request is made with `{ "edition": "nonexistent", "work": "dune" }`
- **THEN** the response has status 400 with an error indicating the edition does not exist

#### Scenario: Creation with non-existent work
- **WHEN** a POST request is made with `{ "edition": "dune-ace-books-1990", "work": "nonexistent" }`
- **THEN** the response has status 400 with an error indicating the work does not exist

### Requirement: Get a single copy with resolved metadata
The system SHALL expose `GET /api/copies/:slug` that returns the full copy entity with an inline `edition_meta` object (key fields from the linked Edition) and `work_meta` object (key fields from the linked Work), resolved from the in-memory index.

#### Scenario: Copy exists with resolvable edition and work
- **WHEN** a GET request is made to `/api/copies/dune-ace-books-1990`
- **THEN** the response has status 200 and includes all copy fields plus `edition_meta` (with at minimum `slug`, `publisher`, `format`, `page_count`) and `work_meta` (with at minimum `slug`, `title`, `authors`)

#### Scenario: Copy does not exist
- **WHEN** a GET request is made to `/api/copies/nonexistent`
- **THEN** the response has status 404 with an error message

### Requirement: Update a copy
The system SHALL expose `PATCH /api/copies/:slug` that accepts a JSON body with any subset of mutable copy fields (`condition`, `location`, `cover_image`, `release_date`, `acquisition_date`, `acquisition_source`, `price_amount`, `price_currency`, `status`). The handler SHALL re-read the file from disk, merge incoming fields, write atomically, and update the index. The `slug`, `type`, `edition`, `work`, `created_at`, and `_schema` fields SHALL never be modified.

#### Scenario: Update condition and location
- **WHEN** a PATCH request is made to `/api/copies/dune-ace-books-1990` with `{ "condition": "worn", "location": "bedroom shelf" }`
- **THEN** the response has status 200 and both fields are updated
- **AND** all other fields including `edition` and `work` remain unchanged

#### Scenario: Update status
- **WHEN** a PATCH request is made with `{ "status": "lent" }`
- **THEN** the response has status 200 and `status` is updated to `lent`

#### Scenario: Attempt to change edition or work
- **WHEN** a PATCH request is made with `{ "edition": "other-edition", "work": "other-work" }`
- **THEN** the `edition` and `work` fields in the request are ignored

#### Scenario: Update non-existent copy
- **WHEN** a PATCH request is made to `/api/copies/nonexistent` with `{ "condition": "good" }`
- **THEN** the response has status 404 with an error message

### Requirement: Delete a copy
The system SHALL expose `DELETE /api/copies/:slug` that performs a hard delete of the copy file and removes it from the index. No orphan protection is applied since no other entity links to copies by slug.

#### Scenario: Delete existing copy
- **WHEN** a DELETE request is made to `/api/copies/dune-ace-books-1990`
- **THEN** the response has status 200
- **AND** the copy file is removed from disk
- **AND** the copy is no longer returned by `index.getCopiesByEdition` or `index.getCopiesByWork`

#### Scenario: Delete non-existent copy
- **WHEN** a DELETE request is made to `/api/copies/nonexistent`
- **THEN** the response has status 404 with an error message
