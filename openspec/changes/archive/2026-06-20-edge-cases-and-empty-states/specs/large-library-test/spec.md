## ADDED Requirements

### Requirement: Performance test generates large library on disk
The server test suite SHALL include a vitest test that programmatically creates 1000+ markdown entity files in a temporary directory, with realistic entity types and relationships.

#### Scenario: File generation creates all entity types
- **WHEN** the test setup runs
- **THEN** at least 100 authors, 500 works, 200 editions, and 200 copies are written as `.md` files with YAML frontmatter to a temp directory

#### Scenario: Generated files have correct wikilinks
- **WHEN** the test generates works and editions
- **THEN** each work's `authors` field contains valid `[[authors/slug]]` wikilinks, each edition's `work` field contains a valid `[[works/slug]]` wikilink, and each copy's `edition` and `work` fields contain valid wikilinks

### Requirement: Index load time under 2 seconds at scale
The in-memory index SHALL load 1000+ entity files in under 2 seconds.

#### Scenario: Index loads 1200 entities within time budget
- **WHEN** an `Index` is created pointing to the generated temp directory and `load()` is called
- **THEN** the load completes in under 2000 milliseconds

### Requirement: Filtered lookup time under 100 milliseconds
Filtered queries against the loaded index SHALL complete in under 100 milliseconds.

#### Scenario: Genre-filtered work lookup at scale
- **WHEN** the index is loaded with 500+ works and `getWorksByGenre("science-fiction")` or equivalent filtered lookup is called
- **THEN** the operation completes in under 100 milliseconds
