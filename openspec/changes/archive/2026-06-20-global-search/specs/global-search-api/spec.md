## ADDED Requirements

### Requirement: Global search endpoint

The system SHALL provide a `GET /api/search?q=<query>` endpoint that searches across all entity types simultaneously and returns results grouped by entity type.

#### Scenario: Search across all types

- **WHEN** `GET /api/search?q=dune` is called and the library contains a Work titled "Dune", an Edition with publisher containing "dune", and a Copy with acquisition_source containing "dune"
- **THEN** the response contains `results.work`, `results.edition`, and `results.copy` arrays, each with matching results

#### Scenario: Empty query

- **WHEN** `GET /api/search?q=` is called with an empty query
- **THEN** the response contains empty arrays for all type groups

#### Scenario: No matches

- **WHEN** `GET /api/search?q=zzzxxx` is called with a query matching nothing
- **THEN** the response contains empty arrays for all type groups

#### Scenario: Missing query parameter

- **WHEN** `GET /api/search` is called without a `q` parameter
- **THEN** the endpoint returns `400 Bad Request` with an error message

### Requirement: Search result shape

Each search result SHALL include `type`, `slug`, `title`, `subtitle`, and `link` fields. The endpoint response SHALL group results under type keys.

#### Scenario: Work result

- **WHEN** a Work matches the search query
- **THEN** the result includes `type: "work"`, the work's `slug`, `title`, a `subtitle` with the primary author name, and a `link` of `/works/<slug>`

#### Scenario: Author result

- **WHEN** an Author matches the search query
- **THEN** the result includes `type: "author"`, the author's `slug`, `title` set to the author's name, and a `link` of `/authors/<slug>`

#### Scenario: Series result

- **WHEN** a Series matches the search query
- **THEN** the result includes `type: "series"`, the series's `slug`, `title` set to the series name, and a `link` of `/series/<slug>`

#### Scenario: Edition result

- **WHEN** an Edition matches the search query
- **THEN** the result includes `type: "edition"`, the edition's `slug`, `title` set to a human-readable label, `subtitle` with ISBN or publisher, and a `link` of `/editions/<slug>`

#### Scenario: Copy result

- **WHEN** a Copy matches the search query
- **THEN** the result includes `type: "copy"`, the copy's `slug`, `title` set to a human-readable label, `subtitle` with location or acquisition_source, and a `link` of `/copies/<slug>`

#### Scenario: Note result

- **WHEN** a Note matches the search query by body text
- **THEN** the result includes `type: "note"`, the note's `filename` as slug, `title` set to the note's date, a `snippet` excerpting the body around the match (max 120 characters), and a `link` pointing to the most specific parent entity (`/copies/<slug>`, `/editions/<slug>`, or `/works/<slug>`) with the copy favoured over edition, and edition favoured over work

#### Scenario: Loan result

- **WHEN** a Loan matches the search query by borrower_name
- **THEN** the result includes `type: "loan"`, `slug` referring to the parent copy, `title` set to the borrower name, `subtitle` with "Lent from [copy title]", and a `link` of `/copies/<copySlug>`

#### Scenario: Result group ordering

- **WHEN** search results are returned
- **THEN** the type groups appear in the response in this order: work, author, series, edition, copy, note, loan

### Requirement: Per-type result cap

Each entity type group in the search results SHALL contain at most 5 results.

#### Scenario: Many matches of one type

- **WHEN** 20 Works match the query
- **THEN** the `work` results array contains at most 5 entries

#### Scenario: Fewer than cap

- **WHEN** only 2 Authors match the query
- **THEN** the `author` results array contains exactly 2 entries

### Requirement: Search scope

The search SHALL match against the following fields per entity type, case-insensitively and by substring:

#### Scenario: Work search fields

- **WHEN** a search query partially matches a Work's title, any linked author's name or aliases, the Work's genres, the Work's description, or the Work's own aliases
- **THEN** that Work is included in the results

#### Scenario: Author search fields

- **WHEN** a search query partially matches an Author's name or aliases
- **THEN** that Author is included in the results

#### Scenario: Series search fields

- **WHEN** a search query partially matches a Series's name or aliases
- **THEN** that Series is included in the results

#### Scenario: Edition search fields

- **WHEN** a search query partially matches an Edition's ISBN or publisher
- **THEN** that Edition is included in the results

#### Scenario: Copy search fields

- **WHEN** a search query partially matches a Copy's acquisition_source or location
- **THEN** that Copy is included in the results

#### Scenario: Note search fields

- **WHEN** a search query partially matches a Note's body text
- **THEN** that Note is included in the results

#### Scenario: Loan search fields

- **WHEN** a search query partially matches a Loan's borrower_name
- **THEN** that Loan (with its parent copy) is included in the results

### Requirement: Within-group relevance ordering

Search results within each type group SHALL be ordered by relevance: exact match on the primary field, then prefix match, then substring match. Within the same relevance tier, alphabetical order SHALL be used.

#### Scenario: Exact match ranks first

- **WHEN** the query is "dune" and a Work exists with the exact title "Dune"
- **THEN** that Work appears first in the work results, before any Work whose title merely contains "dune"

#### Scenario: Prefix match ranks above substring

- **WHEN** the query is "bro" and two Works exist: "The Brothers Karamazov" and "Ambrose Bierce: A Biography"
- **THEN** "The Brothers Karamazov" appears before "Ambrose Bierce: A Biography"

### Requirement: Search uses in-memory index

The search endpoint SHALL read all data from the in-memory `Index`, not from disk. The search SHALL complete without filing system I/O beyond what was done during index load at startup.

#### Scenario: No disk reads during search

- **WHEN** a search query is processed
- **THEN** no files are read from disk; all entity data comes from the Index instance
