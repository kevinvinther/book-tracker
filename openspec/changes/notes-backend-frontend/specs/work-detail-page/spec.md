## ADDED Requirements

### Requirement: Work Detail recent notes
The Work Detail page SHALL display a "Recent Notes" section using the `NoteTimeline` component. The section SHALL fetch and display all notes referencing the current work (both notes targeting the work directly and notes on any copies of the work). Notes SHALL appear in reverse-chronological order with an "Add Note" button. The "Add Note" button SHALL open the `NoteEditorModal` in create mode, pre-targeting the current work. When no notes exist, the section SHALL display "No notes yet."

#### Scenario: Work with notes across copies
- **WHEN** the user visits `/works/dune` and notes exist targeting the work and its copies
- **THEN** the "Recent Notes" section displays all matching notes via `NoteTimeline`

#### Scenario: Add note from work detail
- **WHEN** the user clicks "Add Note" in the Recent Notes section
- **THEN** the `NoteEditorModal` opens in create mode with the work pre-targeted

#### Scenario: Work with no notes
- **WHEN** the work has no notes
- **THEN** the "Recent Notes" section displays "No notes yet." with an "Add Note" button
