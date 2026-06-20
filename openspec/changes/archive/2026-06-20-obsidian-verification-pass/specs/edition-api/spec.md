## MODIFIED Requirements

### Requirement: Edition file format
An Edition entity SHALL be stored as a markdown file at `editions/{slug}.md` with YAML frontmatter containing `type: edition`, `slug`, `work` (required, wikilink to `works/{slug}`), optional fields `isbn`, `publisher`, `publish_date`, `page_count`, `format`, `language`, `contributors[]`, `aliases[]`, `created_at`, and `_schema`.

#### Scenario: Example edition file on disk
- **WHEN** an edition of "Dune" (work slug `dune`) is created with ISBN `978-0441013593`, publisher `Ace Books`, format `paperback`, and aliases `["Ace Dune"]`
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
  aliases:
    - "Ace Dune"
  contributors: []
  created_at: 2024-01-10T12:00:00.000Z
  _schema: 1
  ---
  ```

### Requirement: Create an edition
The system SHALL expose `POST /api/editions` that accepts a JSON body with at least a `work` field (the work slug), validates the work exists in the index, generates a slug from `work + publisher + publish_date`, creates an Edition file in `editions/{slug}.md`, inserts it into the index, and returns the created edition with HTTP 201. The optional `aliases` field, when provided as an array of strings, SHALL be written to the edition's frontmatter.

#### Scenario: Successful creation with required fields
- **WHEN** a POST request is made to `/api/editions` with `{ "work": "dune", "publisher": "Ace Books", "publish_date": "1990-09-01", "format": "paperback" }`
- **THEN** the response has status 201 and includes the edition with a generated slug and `work: "[[works/dune]]"`

#### Scenario: Creation with aliases
- **WHEN** a POST request is made to `/api/editions` with `{ "work": "dune", "aliases": ["Ace Dune", "Dune 1990"] }`
- **THEN** the response has status 201 and the edition file on disk contains the aliases array

#### Scenario: Creation with missing work
- **WHEN** a POST request is made to `/api/editions` with `{}` or without a `work` field
- **THEN** the response has status 400 with an error indicating `work` is required

#### Scenario: Creation with non-existent work
- **WHEN** a POST request is made to `/api/editions` with `{ "work": "nonexistent-slug" }`
- **THEN** the response has status 400 with an error indicating the work does not exist

#### Scenario: Creation with all optional fields
- **WHEN** a POST request is made with all fields including `isbn`, `page_count`, `language`, `contributors`, and `aliases`
- **THEN** the response has status 201 and the edition file on disk contains all provided fields

### Requirement: Update an edition
The system SHALL expose `PATCH /api/editions/:slug` that accepts a JSON body with any subset of mutable edition fields (`isbn`, `publisher`, `publish_date`, `page_count`, `format`, `language`, `contributors`, `aliases`). The handler SHALL re-read the file from disk, merge incoming fields, write atomically, and update the index. The `slug`, `type`, `work`, `created_at`, and `_schema` fields SHALL never be modified.

#### Scenario: Update publisher
- **WHEN** a PATCH request is made to `/api/editions/dune-ace-books-1990` with `{ "publisher": "Ace Science Fiction" }`
- **THEN** the response has status 200 and the edition's publisher is updated
- **AND** all other fields including `work` and `slug` remain unchanged

#### Scenario: Update aliases
- **WHEN** a PATCH request is made to `/api/editions/dune-ace-books-1990` with `{ "aliases": ["Ace Dune"] }`
- **THEN** the response has status 200 and the edition's aliases are updated to `["Ace Dune"]`

#### Scenario: Omit aliases in PATCH
- **WHEN** a PATCH request is made without an `aliases` field
- **THEN** existing aliases on disk are preserved (not cleared)

#### Scenario: Attempt to change work
- **WHEN** a PATCH request is made with `{ "work": "other-work" }`
- **THEN** the `work` field in the request is ignored — the edition's work link does not change

#### Scenario: Update non-existent edition
- **WHEN** a PATCH request is made to `/api/editions/nonexistent` with `{ "publisher": "Test" }`
- **THEN** the response has status 404 with an error message
