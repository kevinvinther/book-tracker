## ADDED Requirements

### Requirement: Edition Detail notes
The Edition Detail page SHALL display a "Notes" section using the `NoteTimeline` component. The section SHALL fetch and display all notes referencing the current edition, in reverse-chronological order with an "Add Note" button. The "Add Note" button SHALL open the `NoteEditorModal` in create mode, pre-targeting the current edition. When no notes exist, the section SHALL display "No notes yet."

#### Scenario: Edition with notes
- **WHEN** the user visits `/editions/dune-chronicles-hardcover` and notes target the edition
- **THEN** the "Notes" section displays all matching notes via `NoteTimeline`

#### Scenario: Add note from edition detail
- **WHEN** the user clicks "Add Note" in the Notes section
- **THEN** the `NoteEditorModal` opens in create mode with the edition pre-targeted

#### Scenario: Edition with no notes
- **WHEN** the edition has no notes
- **THEN** the "Notes" section displays "No notes yet." with an "Add Note" button
