## ADDED Requirements

### Requirement: Create a note
The system SHALL support creating a new note via `POST /api/notes`. The request body MUST include at least one of `work`, `edition`, or `copy` as a slug (not a wikilink). The server SHALL resolve the denormalized wikilinks for `work`, `edition`, and `copy` from the index based on whichever entity was provided. The server SHALL generate a slug using the current timestamp in `YYYY-MM-DD-HHMMSS` format, with collision suffixes (`-2`, `-3`, etc.) if a note with the same timestamp already exists. The server SHALL set `date` to the current ISO 8601 datetime and `modified` to the same value. The response SHALL return the full note object with resolved metadata (`copy_meta`, `edition_meta`, `work_meta`, `read_through_meta`).

#### Scenario: Create note targeting a copy
- **WHEN** `POST /api/notes` with body `{ "copy": "dune-hc", "content": "Amazing chapter 5.", "context_page": 104, "tags": ["spoilers"] }`
- **THEN** the server resolves `edition` and `work` from the copy, sets `date` and `modified`, generates a timestamp slug, writes the file to `notes/`, updates the index, and returns the full note with resolved metadata

#### Scenario: Create note targeting a work
- **WHEN** `POST /api/notes` with body `{ "work": "dune", "content": "Herbert's prose is dense but rewarding." }`
- **THEN** the server sets `work` wikilink, omits `edition` and `copy`, sets `date` and `modified`, generates a slug, writes the file, and returns the note with `edition_meta` and `copy_meta` as null

#### Scenario: Create note with read_through
- **WHEN** `POST /api/notes` with body `{ "copy": "dune-hc", "content": "Great scene.", "read_through": "2024-03-15" }` and the copy has a read-through with `started_date: "2024-03-15T12:00:00.000Z"`
- **THEN** the server validates the read-through exists on the copy, stores the started_date in the note, and returns the note with `read_through_meta`

#### Scenario: Reject note with no reference
- **WHEN** `POST /api/notes` with body `{ "content": "Some text" }` (no `work`, `edition`, or `copy`)
- **THEN** the server responds 400 with an error indicating at least one reference is required

#### Scenario: Reject note with non-existent reference
- **WHEN** `POST /api/notes` with body `{ "work": "nonexistent", "content": "Text" }`
- **THEN** the server responds 400 with an error indicating the work was not found

#### Scenario: Reject read_through without copy
- **WHEN** `POST /api/notes` with body `{ "work": "dune", "content": "Text", "read_through": "2024-03-15" }`
- **THEN** the server responds 400 because `read_through` requires a `copy`

#### Scenario: Reject invalid read_through on copy
- **WHEN** `POST /api/notes` with body `{ "copy": "dune-hc", "content": "Text", "read_through": "2024-01-01" }` and the copy has no read-through with that started_date
- **THEN** the server responds 400 with an error indicating the read-through was not found on the copy

### Requirement: List notes with filtering
The system SHALL support listing notes via `GET /api/notes`. Optional query parameters `?work=<slug>`, `?edition=<slug>`, and `?copy=<slug>` SHALL filter notes whose corresponding wikilink matches the given slug. The `?q=<text>` parameter SHALL perform a case-insensitive substring search against the note body. Filters and search MAY be combined. The response SHALL include resolved metadata for each note.

#### Scenario: List all notes
- **WHEN** `GET /api/notes`
- **THEN** returns all notes in the index with resolved metadata, ordered by date descending

#### Scenario: List notes for a work
- **WHEN** `GET /api/notes?work=dune`
- **THEN** returns all notes where `work` wikilink matches `[[works/dune]]`

#### Scenario: List notes for a copy
- **WHEN** `GET /api/notes?copy=dune-hc`
- **THEN** returns all notes where `copy` wikilink matches `[[copies/dune-hc]]`

#### Scenario: Search note body text
- **WHEN** `GET /api/notes?q=Herbert`
- **THEN** returns all notes whose body contains "Herbert" (case-insensitive)

#### Scenario: Filtered search
- **WHEN** `GET /api/notes?work=dune&q=spice`
- **THEN** returns only notes targeting the Dune work AND containing "spice" in the body

#### Scenario: Empty list
- **WHEN** `GET /api/notes?copy=nonexistent`
- **THEN** returns an empty array (200 OK)

### Requirement: Get a single note
The system SHALL support retrieving a single note via `GET /api/notes/:slug`, where `:slug` is the note's filename without the `.md` extension. The response SHALL include the full note body and resolved metadata.

#### Scenario: Get existing note
- **WHEN** `GET /api/notes/2024-03-15-143000`
- **THEN** returns the note with body, frontmatter fields, and resolved metadata

#### Scenario: Note not found
- **WHEN** `GET /api/notes/nonexistent`
- **THEN** returns 404

### Requirement: Update a note
The system SHALL support updating a note via `PATCH /api/notes/:slug`. Mutable fields are `content` (markdown body), `read_through`, `context_page`, and `tags`. The server SHALL set `modified` to the current ISO 8601 datetime. Immutable fields (`work`, `edition`, `copy`, `date`) SHALL be ignored if present in the request. The server SHALL re-read the file from disk before applying changes, preserving fields not touched by the request.

#### Scenario: Update note body
- **WHEN** `PATCH /api/notes/2024-03-15-143000` with `{ "content": "Revised thoughts." }`
- **THEN** the body is updated, `modified` is set to now, other fields are preserved, and the file is atomically rewritten

#### Scenario: Update note tags and context_page
- **WHEN** `PATCH /api/notes/2024-03-15-143000` with `{ "tags": ["important"], "context_page": 200 }`
- **THEN** `tags` and `context_page` are updated, `modified` changes, body and references are preserved

#### Scenario: Immutable field ignored
- **WHEN** `PATCH /api/notes/2024-03-15-143000` with `{ "copy": "different-copy" }`
- **THEN** the copy field is silently ignored, not changed

#### Scenario: Update non-existent note
- **WHEN** `PATCH /api/notes/nonexistent`
- **THEN** returns 404

### Requirement: Delete a note
The system SHALL support deleting a note via `DELETE /api/notes/:slug`. The note file SHALL be removed from disk and the index entry SHALL be removed. No soft delete or trash — this is a hard delete.

#### Scenario: Delete existing note
- **WHEN** `DELETE /api/notes/2024-03-15-143000`
- **THEN** the file is removed, index entry is removed, and 200 is returned

#### Scenario: Delete non-existent note
- **WHEN** `DELETE /api/notes/nonexistent`
- **THEN** returns 404

### Requirement: Note slug generation
The system SHALL generate note slugs as `YYYY-MM-DD-HHMMSS` with no colons in the filename. If a note with the same slug already exists, the server SHALL append `-2`, `-3`, etc. until a unique slug is found.

#### Scenario: Basic slug generation
- **WHEN** a note is created at 2024-03-15 14:30:00 UTC
- **THEN** the slug is `2024-03-15-143000`

#### Scenario: Collision slug generation
- **WHEN** a note is created and `2024-03-15-143000` already exists
- **THEN** the slug is `2024-03-15-143000-2`

#### Scenario: Multiple collisions
- **WHEN** a note is created and `2024-03-15-143000` through `2024-03-15-143000-3` all exist
- **THEN** the slug is `2024-03-15-143000-4`

### Requirement: Note files follow conventions
Note files SHALL be written using the atomic write pattern (temp file + rename). No empty optional fields SHALL be present in the YAML frontmatter — keys with no value SHALL be omitted entirely. The `_schema` field SHALL be set to 1. The `type` field SHALL be `"note"`.

#### Scenario: Note file with minimal fields
- **WHEN** a note targeting a work is created with `{ "work": "dune", "content": "Hello." }`
- **THEN** the written frontmatter contains `type: note`, `slug`, `date`, `modified`, `work` (wikilink), `_schema: 1`, and the markdown body; no `edition`, `copy`, `read_through`, `context_page`, or `tags` keys appear
