# file-watcher Specification

## Purpose
Detect external changes to markdown files in the library directory (add, modify, delete) and update the in-memory index in real time, keeping the index current without requiring a server restart.

## Requirements
### Requirement: Watch library directory for markdown file changes
The system SHALL watch the library path recursively for changes to `.md` files. The watcher SHALL start after the initial index load completes and SHALL NOT re-process files from the initial scan.

#### Scenario: Watcher starts after index load
- **WHEN** the server starts
- **THEN** the in-memory index loads all existing files first
- **AND** the file watcher begins watching only after the initial load completes

#### Scenario: Ignore initial scan events
- **WHEN** the watcher starts on a directory that already contains files
- **THEN** the watcher does not fire events for pre-existing files (ignoreInitial is true)

#### Scenario: Watch only markdown files
- **WHEN** a non-`.md` file is created or modified in the library directory
- **THEN** the watcher does not trigger any index update

### Requirement: Ignore temporary files from atomic writes
The system SHALL ignore `.tmp` files to avoid false events from the app's own atomic write pattern (write to `.tmp`, rename to `.md`).

#### Scenario: Temporary file created during atomic write
- **WHEN** a `.tmp` file is created in the library directory
- **THEN** the watcher does not fire an event or update the index

#### Scenario: Temporary file renamed to .md
- **WHEN** a `.tmp` file is renamed to `.md`
- **THEN** the watcher fires a change event for the `.md` file (this is redundant but harmless — the index is already up to date from the app's own write)

### Requirement: Handle file add events
The system SHALL detect when a new `.md` file is created in any library subdirectory, re-parse its frontmatter from disk, determine the entity type from the directory name, and upsert the entity into the in-memory index.

#### Scenario: New work file created externally
- **WHEN** a new file `works/new-novel.md` is created in the library directory with valid frontmatter
- **THEN** the watcher re-reads the file from disk
- **AND** the frontmatter is parsed and upserted into the index as a Work entity
- **AND** the entity is available via `index.getWork("new-novel")`

#### Scenario: New note file created externally
- **WHEN** a new file `notes/2025-06-20-143000.md` is created with valid frontmatter and body
- **THEN** the watcher re-reads the file from disk
- **AND** the frontmatter and body are upserted into the index as a Note entity

### Requirement: Handle file change events
The system SHALL detect when an existing `.md` file is modified, re-parse its frontmatter from disk, and upsert the updated entity into the in-memory index, replacing the previous in-memory state with the canonical on-disk state.

#### Scenario: Work frontmatter edited in Obsidian
- **WHEN** an existing file `works/dune.md` is modified externally with an updated `title` field
- **THEN** the watcher re-reads the file from disk
- **AND** the updated frontmatter is upserted into the index, replacing the previous in-memory version
- **AND** the body text is not regenerated (external edits are intentional)

#### Scenario: Copy frontmatter edited externally
- **WHEN** an existing file `copies/dune-ace-pb.md` is modified externally with a changed `condition` field
- **THEN** the index reflects the new condition value

### Requirement: Handle file unlink events
The system SHALL detect when a `.md` file is deleted from the library directory, determine the entity type and slug from the file path, and remove the entity from the in-memory index.

#### Scenario: Work file deleted externally
- **WHEN** the file `works/dune.md` is deleted from disk
- **THEN** the entity is removed from the index
- **AND** `index.getWork("dune")` returns `undefined`

#### Scenario: Note file deleted externally
- **WHEN** the file `notes/2025-06-20-143000.md` is deleted from disk
- **THEN** the entity is removed from the index

### Requirement: Debounce rapid file events
The system SHALL debounce file change events by slug, waiting 300ms after the last event for a given file before re-parsing and updating the index.

#### Scenario: Multiple change events for the same file
- **WHEN** an editor triggers three change events for `works/dune.md` within 50ms
- **THEN** the file is re-parsed and the index updated only once, after 300ms of silence

#### Scenario: Different files events are not debounced together
- **WHEN** `works/dune.md` and `works/foundation.md` are both changed within the same 100ms window
- **THEN** each file is debounced independently and the index is updated once per file

### Requirement: Index convenience method for file change handling
The system SHALL provide a `handleFileChange(type, slug)` method on the Index class that re-reads a file from disk, parses its frontmatter, and upserts the entity. If the file does not exist on disk, the method SHALL call `remove(type, slug)` instead.

#### Scenario: File exists on disk and has changed
- **WHEN** `index.handleFileChange("work", "dune")` is called and the file exists
- **THEN** the file is re-read from disk, its frontmatter parsed, and the entity upserted into the index

#### Scenario: File was deleted between event and handling
- **WHEN** `index.handleFileChange("work", "dune")` is called and the file no longer exists on disk
- **THEN** the entity is removed from the index via `remove("work", "dune")`
