## MODIFIED Requirements

### Requirement: Library snapshot statistics

The system SHALL compute and return library-level counts: total works, total editions, total copies, copies broken down by format, copies broken down by status, copies broken down by condition, works broken down by genre, works broken down by original language, and works broken down by series. When computing `works_by_genre`, each genre from every Work SHALL be normalized via `normalizeGenre` before being counted, so that pre-existing non-normalized genres (e.g., "Science Fiction") are merged with their normalized form (e.g., "science-fiction").

#### Scenario: Total counts reflect all entities

- **WHEN** the index has 5 works, 3 editions, and 4 copies
- **THEN** the response contains `library.total_works: 5`, `library.total_editions: 3`, `library.total_copies: 4`

#### Scenario: Copies by format breakdown

- **WHEN** copies have formats `paperback`, `hardcover`, `hardcover`
- **THEN** then `library.copies_by_format` is `{ "paperback": 1, "hardcover": 2 }`

#### Scenario: Copies with missing optional fields are handled

- **WHEN** a copy has no `format` field set
- **THEN** that copy is not counted in `copies_by_format` but is included in `total_copies`

#### Scenario: Works by genre counts work under each genre

- **WHEN** a work has genres `["fiction", "classic"]`
- **THEN** that work contributes 1 to both `fiction` and `classic` in `works_by_genre`

#### Scenario: Works by genre normalizes on read

- **WHEN** one work has genres `["Science Fiction"]` and another has `["science-fiction"]`
- **THEN** `works_by_genre` contains `"science-fiction": 2` (not two separate entries)

#### Scenario: Works by genre handles mixed formats

- **WHEN** one work has genres `["Fiction"]`, another has `["fiction"]`, and a third has `["  science fiction  "]`
- **THEN** `works_by_genre` contains `"fiction": 2` and `"science-fiction": 1` after normalization

#### Scenario: Works by series only counts works with a series link

- **WHEN** 3 works exist, 2 link to series "the-dark-tower", 1 has no series
- **THEN** `works_by_series` is `{ "the-dark-tower": 2 }`
