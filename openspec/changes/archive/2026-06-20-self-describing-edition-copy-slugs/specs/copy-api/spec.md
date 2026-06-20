## MODIFIED Requirements

### Requirement: Create a copy
The system SHALL expose `POST /api/copies` that accepts a JSON body with at least `edition` (edition slug) and `work` (work slug), validates both exist in the index, and generates a self-describing slug composed of the edition slug followed by `-copy` (`<edition-slug>-copy`). If the resulting slug already exists in the global slug namespace, a numeric counter SHALL be appended (`<edition-slug>-copy-2`, `<edition-slug>-copy-3`, …). The handler then creates a Copy file in `copies/{slug}.md`, inserts it into the index, and returns the created copy with HTTP 201. The `status` field SHALL default to `owned` if not provided. The optional `aliases` field, when provided as an array of strings, SHALL be written to the copy's frontmatter.

#### Scenario: Successful creation with required fields
- **WHEN** a POST request is made to `/api/copies` with `{ "edition": "dune-ace-books-1990", "work": "dune" }`
- **THEN** the response has status 201 and the copy has slug `dune-ace-books-1990-copy`, `edition: "[[editions/dune-ace-books-1990]]"`, `work: "[[works/dune]]"`, and `status: "owned"`

#### Scenario: Second copy of the same edition appends a counter
- **WHEN** a second copy is created with `{ "edition": "dune-ace-books-1990", "work": "dune" }` while `dune-ace-books-1990-copy` already exists
- **THEN** the response has status 201 and the new copy slug is `dune-ace-books-1990-copy-2`

#### Scenario: Creation with aliases
- **WHEN** a POST request is made to `/api/copies` with `{ "edition": "dune-ace-books-1990", "work": "dune", "aliases": ["Dune paperback", "My Dune"] }`
- **THEN** the response has status 201 and the copy file on disk contains the aliases array

#### Scenario: Creation with all optional fields
- **WHEN** a POST request is made with `edition`, `work`, `condition`, `acquisition_date`, `acquisition_source`, `price_amount`, `price_currency`, `location`, `status`, and `aliases`
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
