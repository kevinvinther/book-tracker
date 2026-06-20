## ADDED Requirements

### Requirement: Index provides global cross-entity search

The Index SHALL provide a `searchAll(query)` method that searches across all entity types — Works, Authors, Series, Editions, Copies, Notes, and Loans — and returns results grouped by entity type.

#### Scenario: Search across all types

- **WHEN** `index.searchAll("dune")` is called on an index containing a Work with title "Dune", an Author named "Frank Herbert", and a Copy whose acquisition_source contains "dune convention"
- **THEN** the method returns an object with `work`, `author`, and `copy` arrays each containing the matching results

#### Scenario: Empty query returns empty groups

- **WHEN** `index.searchAll("")` is called with an empty string
- **THEN** the method returns an object with empty arrays for all type groups

#### Scenario: No matches

- **WHEN** `index.searchAll("zzzxxx")` is called with a query matching nothing
- **THEN** the method returns an object with empty arrays for all type groups

### Requirement: SearchAll searches appropriate fields per type

The `searchAll` method SHALL search the following fields case-insensitively by substring:

#### Scenario: Work search

- **WHEN** a query matches a Work's title, linked author names, linked author aliases, genres, description, or aliases
- **THEN** the Work is included in search results

#### Scenario: Author search

- **WHEN** a query matches an Author's name or aliases
- **THEN** the Author is included in search results

#### Scenario: Series search

- **WHEN** a query matches a Series's name or aliases
- **THEN** the Series is included in search results

#### Scenario: Edition search

- **WHEN** a query matches an Edition's ISBN or publisher
- **THEN** the Edition is included in search results

#### Scenario: Copy search

- **WHEN** a query matches a Copy's acquisition_source or location
- **THEN** the Copy is included in search results

#### Scenario: Note search

- **WHEN** a query matches a Note's body text
- **THEN** the Note is included in search results

#### Scenario: Loan search

- **WHEN** a query matches a Loan's borrower_name
- **THEN** the Loan (with parent copy reference) is included in search results

### Requirement: SearchAll result shape

Each result from `searchAll` SHALL include `type`, `slug`, `title`, and `subtitle` fields. Note results SHALL also include a `snippet` that excerpts the matching body text.

#### Scenario: Work result shape

- **WHEN** a Work matches
- **THEN** the result includes `type: "work"`, `slug`, `title` (work title), `subtitle` (primary author name), and `link` (`/works/<slug>`)

#### Scenario: Note result shape

- **WHEN** a Note matches by body text
- **THEN** the result includes `type: "note"`, `slug` (note filename), `title` (formatted date), `subtitle` (parent copy label), a `snippet` of up to 120 characters around the match, and `link` resolving to copy → edition → work in priority order

#### Scenario: Loan result shape

- **WHEN** a Loan matches by borrower_name
- **THEN** the result includes `type: "loan"`, `slug` (parent copy slug), `title` (borrower name), `subtitle` (parent copy label), and `link` (`/copies/<slug>`)

### Requirement: SearchAll relevance ordering within groups

Within each type group, results SHALL be ordered by relevance: exact match on the primary field, then prefix match, then substring match. Within the same tier, alphabetical order SHALL be used.

#### Scenario: Exact match ranks first

- **WHEN** searching for "dune" and two Works exist: "Dune" (exact match) and "Dune Messiah" (prefix match)
- **THEN** "Dune" appears before "Dune Messiah"

#### Scenario: Alphabetical tie-breaking

- **WHEN** two Works match with the same relevance tier
- **THEN** results are ordered alphabetically by title

### Requirement: SearchAll caps results per type

Each type group in the `searchAll` result SHALL contain at most 5 items.

#### Scenario: Cap at 5

- **WHEN** 10 Works match search criteria
- **THEN** the work results array contains at most 5 items
