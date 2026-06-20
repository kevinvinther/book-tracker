## MODIFIED Requirements

### Requirement: Quick-add creates all linked entities
The endpoint SHALL create a Work file linked to the resolved authors, an Edition file linked to the Work, and a Copy file linked to both the Edition and Work. The Edition slug SHALL be generated with the same self-describing scheme as `POST /api/editions` — `<work>-<publisher>-<year>` (year derived from the first segment of `publish_date`), with single-part composition when only one is present, and a `<work>-edition` fallback when both publisher and `publish_date` are absent. The Copy slug SHALL be generated with the same scheme as `POST /api/copies` — `<edition-slug>-copy`. Quick-add SHALL NOT seed the edition slug from the work slug alone. Optional fields that are not provided SHALL be omitted from the created entities. When `genres` is provided as an array of strings, each genre SHALL be normalized via `normalizeGenre` and written to the Work's frontmatter.

#### Scenario: Full entity creation
- **WHEN** a POST is made with all fields provided, including `publisher: "Ace Books"` and `publish_date: "1990-09-01"` for the work "Dune"
- **THEN** the Work, Edition, and Copy files exist on disk with the specified fields, the edition slug is `dune-ace-books-1990`, and the copy slug is `dune-ace-books-1990-copy`

#### Scenario: Minimal entity creation
- **WHEN** a POST is made with only title and authorNames (no publisher and no publish date) for the work "Dune"
- **THEN** the Work is created with slug `dune`, an Edition is created with slug `dune-edition`, and a Copy is created with slug `dune-edition-copy` and default status "owned"

#### Scenario: Quick-add with genres
- **WHEN** a POST is made with `{ "title": "Dune", "authorNames": ["Frank Herbert"], "genres": ["Science Fiction", "Adventure"] }`
- **THEN** the created Work file contains `genres: ["adventure", "science-fiction"]`

#### Scenario: Quick-add without genres
- **WHEN** a POST is made without a `genres` field
- **THEN** the created Work file has no `genres` field
