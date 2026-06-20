# rich-test-data Specification

## Purpose
Comprehensive test data in the book-tracker-data vault covering all entity types, relationships, and feature states for verification and development.

## Requirements

### Requirement: Test data covers all entity types
The test data vault at `~/book-tracker-data/` SHALL contain files for every entity type: Authors, Series, Works, Editions, Copies, and Notes. Each entity SHALL have complete, realistic frontmatter and the rendered markdown body shall be written by the body regeneration engine.

#### Scenario: All entity types present
- **WHEN** the server starts and loads the index from `~/book-tracker-data/`
- **THEN** `index.getAllAuthors()`, `index.getAllSeries()`, and similar accessors return non-empty results for all six entity types

### Requirement: Test data exercises aliases on all entity types
At least one Author, one Series, one Work, one Edition, and one Copy SHALL have non-empty `aliases[]` in their frontmatter.

#### Scenario: Aliases on author
- **WHEN** the test data is loaded
- **THEN** at least one author has `aliases` set in the index

#### Scenario: Aliases on work
- **WHEN** the test data is loaded
- **THEN** at least one work has `aliases` set in the index

#### Scenario: Aliases on copy
- **WHEN** the test data is loaded
- **THEN** at least one copy has `aliases` set in the index

### Requirement: Test data exercises series with total_works
At least one Series SHALL have `total_works` set to a number greater than the count of linked works, so that placeholder entries appear in the rendered body and the web app's Series Detail page.

#### Scenario: Series total_works exceeds linked works
- **WHEN** the test data is loaded
- **THEN** a series exists with `total_works` > number of works with that series linked

### Requirement: Test data exercises read-through states
At least one Copy SHALL have multiple read-throughs covering distinct states: one finished (with rating and full page log reaching page_count), one currently reading (with partial page log), and one unread (no read-throughs).

#### Scenario: Finished read-through
- **WHEN** the test data is loaded
- **THEN** at least one copy has a read-through with `status: "finished"`, a `rating`, and `page_log` entries ending at the edition's `page_count`

#### Scenario: Active read-through
- **WHEN** the test data is loaded
- **THEN** at least one copy has a read-through with `status: "reading"` and partial `page_log` entries

#### Scenario: Unread copy
- **WHEN** the test data is loaded
- **THEN** at least one copy has no read-throughs

### Requirement: Test data exercises loans
At least one Copy SHALL have a `loans[]` array containing: one loan that is overdue (expected_return_date in the past, no returned_date) and one loan that is returned (returned_date set).

#### Scenario: Overdue loan
- **WHEN** the test data is loaded
- **THEN** a copy has a loan with `expected_return_date` before today and no `returned_date`

#### Scenario: Returned loan
- **WHEN** the test data is loaded
- **THEN** a copy has a loan with `returned_date` set

### Requirement: Test data exercises notes with tags
At least two Notes SHALL exist, each with: a `copy` wikilink, `tags[]`, and substantial markdown body content. At least one note SHALL link to a specific `read_through` via `started_date`.

#### Scenario: Note linked to read-through
- **WHEN** the test data is loaded
- **THEN** at least one note has a `read_through` field referencing a copy's read-through `started_date`

#### Scenario: Note with tags
- **WHEN** the test data is loaded
- **THEN** at least one note has non-empty `tags[]`
