## MODIFIED Requirements

### Requirement: Create an edition
The system SHALL expose `POST /api/editions` that accepts a JSON body with at least a `work` field (the work slug), validates the work exists in the index, and generates a self-describing slug composed of the work slug followed by the publisher and the publish year. The slug SHALL be built from `<work>-<publisher>-<year>` where `<year>` is the first `-`-separated segment of `publish_date`, slugified as a single value. When only one of publisher/year is present, only the available part SHALL be appended (`<work>-<publisher>` or `<work>-<year>`). When **both** publisher and `publish_date` are absent, the slug SHALL fall back to `<work>-edition`. The literal word `edition` SHALL appear only in this both-absent fallback case. If the resulting slug already exists in the global slug namespace, a numeric counter SHALL be appended (`<base>-2`, `<base>-3`, …). The handler then creates an Edition file in `editions/{slug}.md`, inserts it into the index, and returns the created edition with HTTP 201. The optional `aliases` field, when provided as an array of strings, SHALL be written to the edition's frontmatter.

#### Scenario: Successful creation with required fields
- **WHEN** a POST request is made to `/api/editions` with `{ "work": "dune", "publisher": "Ace Books", "publish_date": "1990-09-01", "format": "paperback" }`
- **THEN** the response has status 201 and includes the edition with slug `dune-ace-books-1990` and `work: "[[works/dune]]"`

#### Scenario: Creation with no publisher or publish date falls back to type suffix
- **WHEN** a POST request is made to `/api/editions` with `{ "work": "dune" }` and no `publisher` and no `publish_date`
- **THEN** the response has status 201 and the edition slug is `dune-edition`

#### Scenario: Creation with only a publisher
- **WHEN** a POST request is made to `/api/editions` with `{ "work": "dune", "publisher": "Ace Books" }` and no `publish_date`
- **THEN** the response has status 201 and the edition slug is `dune-ace-books`

#### Scenario: Creation with only a publish date
- **WHEN** a POST request is made to `/api/editions` with `{ "work": "dune", "publish_date": "1990-09-01" }` and no `publisher`
- **THEN** the response has status 201 and the edition slug is `dune-1990`

#### Scenario: Collision appends a numeric counter
- **WHEN** a second edition is created with `{ "work": "dune", "publisher": "Ace Books", "publish_date": "1990-09-01" }` while `dune-ace-books-1990` already exists
- **THEN** the response has status 201 and the new edition slug is `dune-ace-books-1990-2`

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
