# quick-add-endpoint Specification

## Purpose
TBD - created by syncing change manual-add-flow. Update Purpose after archive.
## Requirements
### Requirement: Quick-add endpoint creates entities in one request
The system SHALL expose `POST /api/quick-add` that accepts a JSON body with work, author, edition, and copy fields. It SHALL resolve or create authors, then create the Work, Edition, and Copy sequentially. It SHALL return the created Work's slug with HTTP 201.

#### Scenario: Quick-add with existing author
- **WHEN** a POST is made to `/api/quick-add` with title "Dune", authorNames ["Frank Herbert"] (who already exists), publisher "Chilton Books", publish_date "1965-08-01"
- **THEN** the response has status 201, includes `workSlug`, and the existing "Frank Herbert" author is linked

#### Scenario: Quick-add with new author
- **WHEN** a POST is made to `/api/quick-add` with title "New Book", authorNames ["Brand New Author"], and required fields
- **THEN** the response has status 201 and a new Author "Brand New Author" is created

#### Scenario: Quick-add with multiple authors
- **WHEN** a POST is made with authorNames ["Frank Herbert", "Brian Herbert"]
- **THEN** both authors are linked (existing or created)

#### Scenario: Missing required field title
- **WHEN** a POST is made to `/api/quick-add` without a `title`
- **THEN** the response has status 400 with an error indicating title is required

#### Scenario: Missing authors
- **WHEN** a POST is made to `/api/quick-add` with title "Book" but an empty or missing `authorNames`
- **THEN** the response has status 400 with an error indicating at least one author is required

### Requirement: Quick-add author resolution
The endpoint SHALL resolve each author name by checking all existing authors for a case-insensitive, whitespace-trimmed exact match on `name` or any entry in `aliases`. If no match is found, a new Author SHALL be created with the given name.

#### Scenario: Case-insensitive match
- **WHEN** authorNames contains "frank herbert" and an author "Frank Herbert" exists
- **THEN** the existing "Frank Herbert" is linked

#### Scenario: Whitespace-normalized match
- **WHEN** authorNames contains "  Frank   Herbert  " and an author "Frank Herbert" exists
- **THEN** the existing "Frank Herbert" is linked

### Requirement: Quick-add creates all linked entities
The endpoint SHALL create a Work file linked to the resolved authors, an Edition file linked to the Work, and a Copy file linked to both the Edition and Work. Optional fields that are not provided SHALL be omitted from the created entities. When `genres` is provided as an array of strings, each genre SHALL be normalized via `normalizeGenre` and written to the Work's frontmatter.

#### Scenario: Full entity creation
- **WHEN** a POST is made with all fields provided
- **THEN** the Work, Edition, and Copy files exist on disk with the specified fields

#### Scenario: Minimal entity creation
- **WHEN** a POST is made with only title and authorNames
- **THEN** the Work is created, an Edition is created with minimal metadata, and a Copy is created with default status "owned"

#### Scenario: Quick-add with genres
- **WHEN** a POST is made with `{ "title": "Dune", "authorNames": ["Frank Herbert"], "genres": ["Science Fiction", "Adventure"] }`
- **THEN** the created Work file contains `genres: ["adventure", "science-fiction"]`

#### Scenario: Quick-add without genres
- **WHEN** a POST is made without a `genres` field
- **THEN** the created Work file has no `genres` field

