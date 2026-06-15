## ADDED Requirements

### Requirement: Edition file format
An Edition entity SHALL be stored as a markdown file at `editions/{slug}.md` with YAML frontmatter containing `type: edition`, `slug`, `work` (required, wikilink to `works/{slug}`), optional fields `isbn`, `publisher`, `publish_date`, `page_count`, `format`, `language`, `contributors[]`, `created_at`, and `_schema`.

#### Scenario: Example edition file on disk
- **WHEN** an edition of "Dune" (work slug `dune`) is created with ISBN `978-0441013593`, publisher `Ace Books`, and format `paperback`
- **THEN** the file `editions/dune-ace-books-1990.md` exists on disk with:
  ```yaml
  ---
  type: edition
  slug: dune-ace-books-1990
  work: "[[works/dune]]"
  isbn: "978-0441013593"
  publisher: "Ace Books"
  publish_date: "1990-09-01"
  page_count: 604
  format: paperback
  language: en
  contributors: []
  created_at: 2024-01-10T12:00:00.000Z
  _schema: 1
  ---
  ```

### Requirement: Create an edition
The system SHALL expose `POST /api/editions` that accepts a JSON body with at least a `work` field (the work slug), validates the work exists in the index, generates a slug from `work + publisher + publish_date`, creates an Edition file in `editions/{slug}.md`, inserts it into the index, and returns the created edition with HTTP 201.

#### Scenario: Successful creation with required fields
- **WHEN** a POST request is made to `/api/editions` with `{ "work": "dune", "publisher": "Ace Books", "publish_date": "1990-09-01", "format": "paperback" }`
- **THEN** the response has status 201 and includes the edition with a generated slug and `work: "[[works/dune]]"`

#### Scenario: Creation with missing work
- **WHEN** a POST request is made to `/api/editions` with `{}` or without a `work` field
- **THEN** the response has status 400 with an error indicating `work` is required

#### Scenario: Creation with non-existent work
- **WHEN** a POST request is made to `/api/editions` with `{ "work": "nonexistent-slug" }`
- **THEN** the response has status 400 with an error indicating the work does not exist

#### Scenario: Creation with all optional fields
- **WHEN** a POST request is made with all fields including `isbn`, `page_count`, `language`, and `contributors`
- **THEN** the response has status 201 and the edition file on disk contains all provided fields

### Requirement: List all editions
The system SHALL expose `GET /api/editions` that returns all editions as a JSON array. The endpoint SHALL accept an optional `?work=` query parameter to filter editions by work slug.

#### Scenario: List all editions
- **WHEN** a GET request is made to `/api/editions`
- **THEN** the response has status 200 and a JSON array of all editions

#### Scenario: Filter editions by work
- **WHEN** a GET request is made to `/api/editions?work=dune` and the index has 2 editions for "dune"
- **THEN** the response has status 200 and a JSON array containing only editions linked to the "dune" work

### Requirement: Get a single edition with resolved copy count
The system SHALL expose `GET /api/editions/:slug` that returns the full edition entity with a resolved `copy_count` computed from `index.getCopiesByEdition(slug)`.

#### Scenario: Edition exists
- **WHEN** a GET request is made to `/api/editions/dune-ace-books-1990` and the edition has 2 copies
- **THEN** the response has status 200 and the JSON body includes all edition fields plus `copy_count: 2`

#### Scenario: Edition does not exist
- **WHEN** a GET request is made to `/api/editions/nonexistent`
- **THEN** the response has status 404 with an error message

### Requirement: Update an edition
The system SHALL expose `PATCH /api/editions/:slug` that accepts a JSON body with any subset of mutable edition fields (`isbn`, `publisher`, `publish_date`, `page_count`, `format`, `language`, `contributors`). The handler SHALL re-read the file from disk, merge incoming fields, write atomically, and update the index. The `slug`, `type`, `work`, `created_at`, and `_schema` fields SHALL never be modified.

#### Scenario: Update publisher
- **WHEN** a PATCH request is made to `/api/editions/dune-ace-books-1990` with `{ "publisher": "Ace Science Fiction" }`
- **THEN** the response has status 200 and the edition's publisher is updated
- **AND** all other fields including `work` and `slug` remain unchanged

#### Scenario: Attempt to change work
- **WHEN** a PATCH request is made with `{ "work": "other-work" }`
- **THEN** the `work` field in the request is ignored — the edition's work link does not change

#### Scenario: Update non-existent edition
- **WHEN** a PATCH request is made to `/api/editions/nonexistent` with `{ "publisher": "Test" }`
- **THEN** the response has status 404 with an error message

### Requirement: Delete an edition with orphan protection
The system SHALL expose `DELETE /api/editions/:slug` that deletes the edition. If copies reference this edition, the system SHALL refuse with HTTP 409. Two override modes are available:
- `?force=true`: deletes the edition file and index entry only; copies remain on disk with dangling `[[editions/...]]` wikilinks.
- `?cascade=true`: deletes the edition file and all linked copy files from disk and index.

If both parameters are provided, `?cascade=true` takes precedence.

#### Scenario: Delete edition with no copies
- **WHEN** a DELETE request is made to `/api/editions/dune-ace-books-1990` and the edition has zero copies
- **THEN** the response has status 200 and the edition file is removed from disk
- **AND** `index.getEditionsByWork("dune")` no longer includes this edition

#### Scenario: Delete edition with copies (orphan protected)
- **WHEN** a DELETE request is made to `/api/editions/dune-ace-books-1990` and 2 copies reference it
- **THEN** the response has status 409 with an error indicating 2 copies exist and suggesting `?force=true` or `?cascade=true`

#### Scenario: Force delete edition with copies
- **WHEN** a DELETE request is made to `/api/editions/dune-ace-books-1990?force=true` and 2 copies reference it
- **THEN** the response has status 200
- **AND** the edition file and its index entry are removed
- **AND** the 2 copy files remain on disk unchanged — their `edition` wikilinks become dangling references

#### Scenario: Cascade delete edition with copies
- **WHEN** a DELETE request is made to `/api/editions/dune-ace-books-1990?cascade=true` and 2 copies reference it
- **THEN** the response has status 200
- **AND** the edition file and both copy files are removed from disk
- **AND** all corresponding index entries are removed

#### Scenario: Delete non-existent edition
- **WHEN** a DELETE request is made to `/api/editions/nonexistent`
- **THEN** the response has status 404 with an error message
