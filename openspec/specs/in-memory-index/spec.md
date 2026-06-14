# in-memory-index Specification

## Purpose
TBD - created by archiving change file-io-in-memory-index. Update Purpose after archive.
## Requirements
### Requirement: Index loads all markdown files at startup
The system SHALL provide an `Index` class that, when constructed, walks the entire library directory tree (all entity type subdirectories), reads and parses every `.md` file, and stores the parsed entities in memory. The Index SHALL log the total load time in milliseconds.

#### Scenario: Library with varied entity types
- **WHEN** the Index loads from a library containing 2 authors, 3 works, 4 editions, 5 copies, and 10 notes
- **THEN** the Index populates internal maps with all 24 entities
- **AND** logs the elapsed load time in milliseconds

#### Scenario: Empty library
- **WHEN** the Index loads from an empty library directory (no `.md` files)
- **THEN** the Index initializes with empty collections and does not throw errors

#### Scenario: Library with malformed files
- **WHEN** the Index encounters a file with invalid YAML during load
- **THEN** the Index skips the problematic file, logs a warning with the file path, and continues loading remaining files
- **AND** the Index still contains all valid files

### Requirement: Index provides lookup by slug
The Index SHALL provide lookup methods to retrieve a single entity by its slug for each entity type: `getWork(slug)`, `getEdition(slug)`, `getCopy(slug)`, `getAuthor(slug)`, `getSeries(slug)`, `getNote(filename)`.

#### Scenario: Lookup existing work
- **WHEN** `index.getWork("dune")` is called and a work with slug `"dune"` exists
- **THEN** the method returns the Work entity object with all its frontmatter fields

#### Scenario: Lookup non-existent work
- **WHEN** `index.getWork("nonexistent")` is called and no work with that slug exists
- **THEN** the method returns `undefined`

### Requirement: Index provides cross-entity navigation
The Index SHALL provide methods for navigating relationships: `getWorksByAuthor(slug)`, `getEditionsByWork(slug)`, `getCopiesByEdition(slug)`, `getCopiesByWork(slug)`, and `getNotesByCopy(slug)`.

#### Scenario: Get works by author
- **WHEN** `index.getWorksByAuthor("fyodor-dostoevsky")` is called
- **THEN** the method returns an array of all Work entities whose `authors[]` field contains `"[[authors/fyodor-dostoevsky]]"`

#### Scenario: Get editions by work
- **WHEN** `index.getEditionsByWork("the-brothers-karamazov")` is called
- **THEN** the method returns an array of all Edition entities whose `work` field equals `"[[works/the-brothers-karamazov]]"`

#### Scenario: Get copies by edition
- **WHEN** `index.getCopiesByEdition("karamazov-katz-translation")` is called
- **THEN** the method returns an array of all Copy entities whose `edition` field equals `"[[editions/karamazov-katz-translation]]"`

#### Scenario: No matching entities
- **WHEN** any cross-entity lookup method is called with a slug that has no related entities
- **THEN** the method returns an empty array `[]`

### Requirement: Index lists all entities of a type
The Index SHALL provide methods to retrieve all entities of each type: `getAllWorks()`, `getAllAuthors()`, `getAllSeries()`, `getAllEditions()`, `getAllCopies()`.

#### Scenario: All works including those with no author
- **WHEN** `index.getAllWorks()` is called
- **THEN** the method returns an array of all Work entities in the index

### Requirement: Index provides work search
The Index SHALL provide a `searchWorks(query)` method that filters works by a query string matching against title, author names, and genres. The search SHALL be case-insensitive and match on partial substrings.

#### Scenario: Search by title substring
- **WHEN** `index.searchWorks("brothers")` is called
- **THEN** the method returns all works whose title contains "brothers" (case-insensitive)

#### Scenario: Search by author name
- **WHEN** `index.searchWorks("dostoevsky")` is called
- **THEN** the method returns all works linked to authors whose name or aliases contain "dostoevsky"

#### Scenario: Search by genre
- **WHEN** `index.searchWorks("classic")` is called
- **THEN** the method returns all works whose `genres[]` includes a genre containing "classic"

#### Scenario: Search with no matches
- **WHEN** `index.searchWorks("xxxxx")` is called with a query matching nothing
- **THEN** the method returns an empty array

#### Scenario: Empty query
- **WHEN** `index.searchWorks("")` is called with an empty string
- **THEN** the method returns all works (unfiltered)

### Requirement: Index updates on entity creation or modification
The Index SHALL provide an `upsert` method that inserts or replaces an entity in the appropriate internal map. After upsert, all lookup methods SHALL reflect the new or updated entity immediately.

#### Scenario: Insert new work
- **WHEN** `index.upsert("work", newWorkEntity)` is called with a work that does not exist in the index
- **THEN** the work appears in `index.getAllWorks()` and `index.getWork(slug)`

#### Scenario: Update existing work
- **WHEN** `index.upsert("work", modifiedWork)` is called with a work whose slug already exists in the index
- **THEN** the work's data is replaced with the new data
- **AND** `index.getWork(slug)` returns the updated entity

### Requirement: Index removes entities on deletion
The Index SHALL provide a `remove` method that removes an entity from its internal map by type and slug. After removal, lookup methods SHALL return `undefined` for that slug.

#### Scenario: Remove existing entity
- **WHEN** `index.remove("work", "dune")` is called and the work exists
- **THEN** `index.getWork("dune")` returns `undefined`
- **AND** the work no longer appears in `index.getAllWorks()`

#### Scenario: Remove non-existent entity
- **WHEN** `index.remove("work", "nonexistent")` is called and no such entity exists
- **THEN** the method does not throw an error

### Requirement: Index loads note body text for search
When loading Note entities, the Index SHALL store the markdown body text alongside the frontmatter data. For all other entity types, only the frontmatter SHALL be stored — the body MAY be omitted.

#### Scenario: Note with body content
- **WHEN** the Index loads a note file with frontmatter `{ type: "note", date: "..." }` and body `"The Grand Inquisitor chapter is..."` 
- **THEN** the stored note entity includes a `body` field containing the full markdown body text

#### Scenario: Work body is not loaded
- **WHEN** the Index loads a work file
- **THEN** the stored work entity does not include a `body` field, or it is an empty string

### Requirement: Index performance target
The Index SHALL load a library of 500 markdown files in under one second (1000ms) on typical hardware. The load time SHALL be measured and logged.

#### Scenario: Performance with 500 files
- **WHEN** the Index loads a library with 500 `.md` files evenly distributed across entity types
- **THEN** the total load time (walking directories + parsing all files) is less than 1000 milliseconds

