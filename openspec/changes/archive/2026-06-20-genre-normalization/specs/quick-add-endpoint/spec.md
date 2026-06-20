## MODIFIED Requirements

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
