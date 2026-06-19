## ADDED Requirements

### Requirement: Note type is defined on the client
The client SHALL define a `Note` interface matching the server-side data model: `slug`, `date`, `modified`, optional `work`, `edition`, `copy` (wikilinks), optional `read_through`, `context_page`, `tags`, `body`, plus resolved metadata types for `copy_meta`, `edition_meta`, `work_meta`, and `read_through_meta`.

#### Scenario: Note type includes all fields
- **WHEN** a component imports the `Note` type
- **THEN** it has access to all frontmatter fields and resolved metadata fields

### Requirement: useNotes hook fetches filtered note lists
The client SHALL provide a `useNotes` hook that accepts optional `work`, `edition`, `copy`, and `q` parameters and fetches `GET /api/notes` with the corresponding query string. The hook SHALL expose `notes`, `loading`, `error`, and `refetch` state.

#### Scenario: Fetch notes for a copy
- **WHEN** `useNotes({ copy: "dune-hc" })` is called
- **THEN** it fetches `GET /api/notes?copy=dune-hc` and returns the filtered notes

#### Scenario: Fetch notes with search
- **WHEN** `useNotes({ q: "Herbert" })` is called
- **THEN** it fetches `GET /api/notes?q=Herbert` and returns matching notes

#### Scenario: Empty notes list
- **WHEN** the API returns `[]` (no notes)
- **THEN** `notes` is `[]` and `loading` resolves to `false`

### Requirement: Note editor modal
The client SHALL provide a `NoteEditorModal` component for creating and editing notes. The modal SHALL contain a textarea for the markdown body, a preview toggle that renders the body via `react-markdown`, and optional fields for `read_through` (dropdown), `context_page` (number input), and `tags` (text input). In edit mode, all fields SHALL be pre-populated from the existing note. In create mode on Copy Detail, the active read-through (status: "reading") SHALL be auto-selected if one exists. On save, the modal SHALL send `POST /api/notes` (create) or `PATCH /api/notes/:slug` (edit) and call `onSaved`. On delete, the modal SHALL show a confirmation dialog and send `DELETE /api/notes/:slug`.

#### Scenario: Create note from Copy Detail with active read-through
- **WHEN** the user opens the note editor on a copy with an active read-through (started_date "2024-03-15")
- **THEN** the read_through dropdown pre-selects the active read-through and context_page pre-fills with the last logged page

#### Scenario: Create note without active read-through
- **WHEN** the user opens the note editor on a copy with no active read-through
- **THEN** the read_through dropdown shows "(none)" as the default selection

#### Scenario: Edit existing note
- **WHEN** the user opens the note editor on an existing note with body "Old text" and tags ["thoughts"]
- **THEN** all fields are pre-populated with the current values

#### Scenario: Markdown preview toggle
- **WHEN** the user types `**bold** text` in the textarea and clicks "Preview"
- **THEN** the preview pane renders the markdown as HTML with bold formatting

#### Scenario: Save new note
- **WHEN** the user fills in the body and clicks "Save"
- **THEN** the modal sends `POST /api/notes`, closes on success, and triggers `onSaved`

#### Scenario: Update existing note
- **WHEN** the user edits the body of an existing note and clicks "Save"
- **THEN** the modal sends `PATCH /api/notes/:slug`, closes on success, and triggers `onSaved`

#### Scenario: Delete note from editor
- **WHEN** the user clicks "Delete" in the editor modal and confirms
- **THEN** the modal sends `DELETE /api/notes/:slug`, closes on success, and triggers `onSaved`

### Requirement: Note timeline component
The client SHALL provide a `NoteTimeline` component that renders a list of `NoteCard` entries in reverse-chronological order (newest first). The component SHALL display an "Add Note" button that opens the `NoteEditorModal` in create mode. Each `NoteCard` SHALL display the note's date, read-through context (if any), tags, and an excerpt of the body (first 200 characters). Clicking a card SHALL open the `NoteEditorModal` in edit mode. When no notes exist, the timeline SHALL display "No notes yet."

#### Scenario: Timeline with notes
- **WHEN** a copy has three notes dated Jan 10, Jan 15, and Jan 20
- **THEN** the timeline shows Jan 20 first, then Jan 15, then Jan 10

#### Scenario: Note card with read-through context
- **WHEN** a note has `read_through_meta: { started_date: "2024-06-19", status: "reading" }` and `context_page: 104`
- **THEN** the card displays "Reading · pg 104" alongside the date

#### Scenario: Note card body excerpt
- **WHEN** a note body is 500 characters long
- **THEN** the card displays the first 200 characters followed by "…"

#### Scenario: Empty timeline
- **WHEN** no notes exist for the entity
- **THEN** the timeline displays "No notes yet." with an "Add Note" button

#### Scenario: Click note card to edit
- **WHEN** the user clicks a note card
- **THEN** the `NoteEditorModal` opens in edit mode for that note

### Requirement: Copy Detail notes integration
The Copy Detail page SHALL replace the static "No notes yet." placeholder with the `NoteTimeline` component, passing `copy` as the filter. The "Add Note" button in the timeline SHALL auto-target the current copy.

#### Scenario: Copy Detail with notes
- **WHEN** the user visits `/copies/dune-hc` and the copy has notes
- **THEN** the Notes section renders the `NoteTimeline` with notes filtered by `?copy=dune-hc`

### Requirement: Work Detail recent notes
The Work Detail page SHALL display a "Recent Notes" section using the `NoteTimeline` component, passing `work` as the filter. This aggregates notes that target the work directly plus notes on any copies of the work.

#### Scenario: Work Detail with notes across copies
- **WHEN** the user visits `/works/dune` and multiple copies have notes
- **THEN** the Recent Notes section renders the `NoteTimeline` with all notes filtered by `?work=dune`

### Requirement: Edition Detail notes
The Edition Detail page SHALL display a "Notes" section using the `NoteTimeline` component, passing `edition` as the filter.

#### Scenario: Edition Detail with notes
- **WHEN** the user visits `/editions/dune-chronicles-hardcover` and the edition has notes
- **THEN** the Notes section renders the `NoteTimeline` with notes filtered by `?edition=dune-chronicles-hardcover`
