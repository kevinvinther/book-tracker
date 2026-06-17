## MODIFIED Requirements

### Requirement: List all works with search, sort, and resolved copy count and authors
The system SHALL expose `GET /api/works` that returns all works as a JSON array, each with a resolved `copy_count` and `authors_meta` (an array of `{ slug, name }` for each author wikilink) computed from the in-memory index. The endpoint SHALL accept optional query parameters: `?q=` for search (filters by title, author name, genre, or alias), `?sort=` accepting `title`, `author`, or `created_at`, and `?order=` accepting `asc` or `desc`.

#### Scenario: List all works
- **WHEN** a GET request is made to `/api/works`
- **THEN** the response has status 200 and a JSON array of all works, each including a `copy_count` and `authors_meta`

#### Scenario: Search works by query
- **WHEN** a GET request is made to `/api/works?q=dune`
- **THEN** the response has status 200 and a JSON array containing only works whose title, author name, or genre matches "dune" (case-insensitive)

#### Scenario: Sort by title ascending
- **WHEN** a GET request is made to `/api/works?sort=title&order=asc`
- **THEN** the response has status 200 and the works are sorted alphabetically by title (A to Z)

#### Scenario: Sort by created_at descending (default)
- **WHEN** a GET request is made to `/api/works?sort=created_at`
- **THEN** the response has status 200 and the works are sorted newest-first by `created_at`

### Requirement: Get a single work with resolved counts and relations
The system SHALL expose `GET /api/works/:slug` that returns the full work entity with resolved `edition_count` and `copy_count` computed from the in-memory index, plus resolved `authors_meta` (an array of `{ slug, name }` for each author wikilink) and `series_meta` (`{ slug, name }` if the work has a linked series, otherwise `null`).

#### Scenario: Work exists with editions and copies
- **WHEN** a GET request is made to `/api/works/the-brothers-karamazov` and the work has 2 editions and 3 copies
- **THEN** the response has status 200 and the JSON body includes all work fields plus `edition_count: 2` and `copy_count: 3`

#### Scenario: Work has resolved author names
- **WHEN** a GET request is made to a work with two linked authors
- **THEN** the response includes `authors_meta` as an array of `{ slug, name }` objects, one per author, in the same order as the `authors` wikilink array

#### Scenario: Work belongs to a series
- **WHEN** a GET request is made to a work whose `series` field links to an existing series
- **THEN** the response includes `series_meta: { slug, name }` for that series

#### Scenario: Work has no series
- **WHEN** a GET request is made to a work with no `series` field
- **THEN** the response includes `series_meta: null`

#### Scenario: Work does not exist
- **WHEN** a GET request is made to `/api/works/nonexistent`
- **THEN** the response has status 404 with an error message
