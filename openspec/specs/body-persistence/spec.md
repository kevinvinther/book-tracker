## Purpose

Ensure every entity create and update operation writes a fully rendered markdown body to disk, so library files remain human-readable and navigable in Obsidian.

## Requirements

### Requirement: Entity save writes rendered body to disk

The system SHALL call `renderBody(entity, index)` during every POST and PATCH operation on Work, Edition, Copy, Author, and Series entities, and SHALL pass the resulting markdown string as the `body` argument to `writeFile()`. The body SHALL be written atomically alongside the frontmatter, replacing the existing placeholder (empty string or trivial heading) with a full rendered markdown body.

#### Scenario: Work POST writes rendered body
- **WHEN** a Work is created via `POST /api/works`
- **THEN** the written `.md` file body contains the Work heading, author line, and any present optional sections
- **AND** the body is written atomically via temp file + rename

#### Scenario: Work PATCH writes rendered body
- **WHEN** a Work is updated via `PATCH /api/works/:slug`
- **THEN** the written `.md` file body reflects the updated frontmatter
- **AND** unchanged fields from the re-read disk copy are preserved in the body

#### Scenario: Edition POST writes rendered body
- **WHEN** an Edition is created via `POST /api/editions`
- **THEN** the written `.md` file body contains the edition heading and metadata block

#### Scenario: Edition PATCH writes rendered body
- **WHEN** an Edition is updated via `PATCH /api/editions/:slug`
- **THEN** the written `.md` file body reflects the updated frontmatter

#### Scenario: Author POST writes rendered body
- **WHEN** an Author is created via `POST /api/authors`
- **THEN** the written `.md` file body contains the author heading and work list

#### Scenario: Author PATCH writes rendered body
- **WHEN** an Author is updated via `PATCH /api/authors/:slug`
- **THEN** the written `.md` file body reflects the updated name and work list

#### Scenario: Series POST writes rendered body
- **WHEN** a Series is created via `POST /api/series`
- **THEN** the written `.md` file body contains the series heading and ordered work list

#### Scenario: Series PATCH writes rendered body
- **WHEN** a Series is updated via `PATCH /api/series/:slug`
- **THEN** the written `.md` file body reflects the updated name and work list

#### Scenario: Copy PATCH writes rendered body
- **WHEN** a Copy is updated via `PATCH /api/copies/:slug`
- **THEN** the written `.md` file body reflects the updated metadata (condition, location, status, etc.)
- **AND** read-through and loan sections reflect the current state

### Requirement: Read-through mutations regenerate Copy body

The system SHALL regenerate and write the Copy body to disk on every read-through mutation: starting a new read-through, logging a page entry, transitioning read-through status, and editing or deleting a page log entry. The Copy body SHALL reflect the read-through state after the mutation is applied.

#### Scenario: Starting a read-through regenerates Copy body
- **WHEN** a new read-through is started via `POST /api/copies/:slug/read-throughs`
- **THEN** the Copy file's body includes a `## Reading History` section with the new read-through

#### Scenario: Logging a page regenerates Copy body
- **WHEN** a page entry is logged via `POST /api/copies/:slug/read-throughs/:startedDate/log`
- **THEN** the Copy file's body includes the updated page log table with the new entry

#### Scenario: Finishing a read-through regenerates Copy body
- **WHEN** a read-through is marked finished via `PATCH /api/copies/:slug/read-throughs/:startedDate`
- **THEN** the Copy file's body shows the read-through as "Finished" with rating if provided

#### Scenario: DNFing a read-through regenerates Copy body
- **WHEN** a read-through is marked DNF via `PATCH /api/copies/:slug/read-throughs/:startedDate`
- **THEN** the Copy file's body shows the read-through as "DNF" with finished date

#### Scenario: Editing a page log entry regenerates Copy body
- **WHEN** a page log entry is edited via `PATCH /api/copies/:slug/read-throughs/:startedDate/entries/:date`
- **THEN** the Copy file's body reflects the corrected page log table

#### Scenario: Deleting a page log entry regenerates Copy body
- **WHEN** a page log entry is deleted via `DELETE /api/copies/:slug/read-throughs/:startedDate/entries/:date`
- **THEN** the Copy file's body reflects the updated page log table without the deleted entry

### Requirement: Loan mutations regenerate Copy body

The system SHALL regenerate and write the Copy body to disk on every loan mutation: creating a loan, updating or returning a loan. The Copy body SHALL include a `## Loan History` section with the current loan state.

#### Scenario: Lending a copy regenerates Copy body
- **WHEN** a loan is created via `POST /api/copies/:slug/loans`
- **THEN** the Copy file's body includes a `## Loan History` section with the new loan

#### Scenario: Returning a loan regenerates Copy body
- **WHEN** a loan is returned via `PATCH /api/copies/:slug/loans/:lentDate`
- **THEN** the Copy file's body shows the returned loan with its `returned_date`

#### Scenario: Deleting a loan regenerates Copy body
- **WHEN** a loan is deleted via `DELETE /api/copies/:slug/loans/:lentDate`
- **THEN** the Copy file's body no longer includes that loan

### Requirement: Note mutations regenerate linked Copy body

The system SHALL regenerate and write the enclosing Copy's body to disk when a Note is created or updated, if and only if the Note has a `copy` wikilink. The system SHALL extract the copy slug from the wikilink, re-read the Copy file from disk to preserve its canonical frontmatter, render the body using the in-memory index (which contains the new or updated Note), and atomically write the Copy file with the original frontmatter and the new rendered body.

#### Scenario: Creating a note with a copy link regenerates that copy's body
- **WHEN** a Note is created via `POST /api/notes` with a `copy` field referencing an existing copy
- **THEN** the referenced Copy file's body updates its `## Notes` section to include a wikilink to the new note

#### Scenario: Updating a note with a copy link regenerates that copy's body
- **WHEN** a Note is updated via `PATCH /api/notes/:slug` and the note has a `copy` wikilink
- **THEN** the referenced Copy file's body reflects any changes to the note list

#### Scenario: Creating a note without a copy link does not regenerate any Copy body
- **WHEN** a Note is created via `POST /api/notes` with only `work` and `edition` fields (no `copy`)
- **THEN** no Copy body is regenerated or written to disk

#### Scenario: Updating a note without a copy link does not regenerate any Copy body
- **WHEN** a Note is updated via `PATCH /api/notes/:slug` and the note has no `copy` wikilink
- **THEN** no Copy body is regenerated or written to disk

### Requirement: Quick-add regenerates all three entity bodies

The system SHALL write rendered bodies for all three entities created in a quick-add operation: Work, Edition, and Copy. Each body SHALL be rendered from the entity's frontmatter and the current in-memory index at the time of its individual write.

#### Scenario: Quick-add writes rendered bodies for all three entities
- **WHEN** a book is created via `POST /api/quick-add`
- **THEN** the Work file's body contains the Work heading and metadata
- **AND** the Edition file's body contains the Edition heading and metadata
- **AND** the Copy file's body contains the Copy heading and metadata

### Requirement: Rendered body is never parsed as data

The system SHALL never parse or extract data from the rendered markdown body. The YAML frontmatter SHALL remain the sole canonical data source. The body SHALL be treated as write-only output from the render engine.

#### Scenario: PATCH reads only frontmatter, never body
- **WHEN** any entity is updated via PATCH
- **THEN** the handler re-reads the file and merges mutable fields from the request body into the frontmatter only
- **AND** the existing markdown body is discarded and fully regenerated
