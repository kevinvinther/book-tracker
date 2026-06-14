# file-io Specification

## Purpose
TBD - created by archiving change file-io-in-memory-index. Update Purpose after archive.
## Requirements
### Requirement: Read a markdown file with YAML frontmatter
The system SHALL provide a `readFile` function that reads a `.md` file from the library directory, parses the YAML frontmatter block between `---` delimiters, and returns an object containing both the parsed frontmatter data and the markdown body text.

#### Scenario: File with valid YAML frontmatter and body
- **WHEN** `readFile` is called with the path to a file containing `---\ntitle: "Dune"\nauthor: "Frank Herbert"\n---\n\n# Dune\n\nA science fiction novel.`
- **THEN** the function returns `{ frontmatter: { title: "Dune", author: "Frank Herbert" }, body: "# Dune\n\nA science fiction novel." }`

#### Scenario: File with only frontmatter and no body
- **WHEN** `readFile` is called with a file containing `---\ntitle: "Dune"\n---`
- **THEN** the function returns `{ frontmatter: { title: "Dune" }, body: "" }`

#### Scenario: File does not exist
- **WHEN** `readFile` is called with a path that does not exist on disk
- **THEN** the function throws an error indicating the file was not found

#### Scenario: File with invalid YAML frontmatter
- **WHEN** `readFile` is called with a file containing malformed YAML (e.g., unclosed quotes or bad indentation)
- **THEN** the function throws an error indicating the YAML could not be parsed, including the file path in the error message

#### Scenario: File with no frontmatter block
- **WHEN** `readFile` is called with a file that has no `---` delimiters (plain markdown with no YAML)
- **THEN** the function returns `{ frontmatter: {}, body: "<entire file content>" }`

### Requirement: Write a markdown file with YAML frontmatter atomically
The system SHALL provide a `writeFile` function that serializes frontmatter data to YAML, concatenates it with a markdown body, and writes the file atomically — writing to a temporary file first, then renaming to the target path. If the parent directory does not exist, it SHALL be created.

#### Scenario: Write a new file
- **WHEN** `writeFile` is called with a path, frontmatter `{ title: "Dune" }`, and body `"# Dune\n\nContent"`
- **THEN** a file is created at the target path containing `---\ntitle: Dune\n---\n\n# Dune\n\nContent`
- **AND** no temporary file remains at the target location

#### Scenario: Overwrite an existing file
- **WHEN** `writeFile` is called with a path that already exists
- **THEN** the existing file is replaced atomically with the new content
- **AND** at no point is the file missing or partially written

#### Scenario: Write to a path where parent directory does not exist
- **WHEN** `writeFile` is called with a path whose parent directory does not exist
- **THEN** the parent directories are created recursively before writing

### Requirement: Delete a file
The system SHALL provide a `deleteFile` function that removes a file from disk. If the file does not exist, the call SHALL succeed silently (no error).

#### Scenario: Delete an existing file
- **WHEN** `deleteFile` is called with a path to an existing file
- **THEN** the file is removed from disk

#### Scenario: Delete a non-existent file
- **WHEN** `deleteFile` is called with a path that does not exist
- **THEN** the function does not throw an error

### Requirement: List markdown files in a directory
The system SHALL provide a `listFiles` function that returns an array of filenames (without extensions) for all `.md` files in a given directory. If the directory does not exist, it SHALL return an empty array.

#### Scenario: Directory with markdown files
- **WHEN** `listFiles` is called with a path to a directory containing `dune.md`, `foundation.md`, and `notes.txt`
- **THEN** the function returns `["dune", "foundation"]` (no extensions, non-.md files excluded)

#### Scenario: Empty directory
- **WHEN** `listFiles` is called with a path to an empty directory
- **THEN** the function returns `[]`

#### Scenario: Directory does not exist
- **WHEN** `listFiles` is called with a path that does not exist
- **THEN** the function returns `[]`

### Requirement: Resolve library paths from config
The system SHALL provide a `resolveLibraryPath` function that takes a relative path within the library (e.g., `works/dune.md`) and resolves it to an absolute path using the configured `library_path`. The `library_path` SHALL have `~` expanded to the user's home directory.

#### Scenario: Simple path resolution
- **WHEN** `resolveLibraryPath("works/dune.md")` is called with `library_path` set to `/home/user/book-tracker-data/`
- **THEN** the function returns `/home/user/book-tracker-data/works/dune.md`

#### Scenario: Path with tilde expansion
- **WHEN** `resolveLibraryPath("works/dune.md")` is called with `library_path` set to `~/book-tracker-data/`
- **THEN** the function resolves `~` to the user's home directory before joining the path

