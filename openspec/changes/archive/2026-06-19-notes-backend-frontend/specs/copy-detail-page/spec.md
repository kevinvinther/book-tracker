## MODIFIED Requirements

### Requirement: Copy Detail page shows notes section with empty state
The Copy Detail page SHALL have a "Notes" section using the `NoteTimeline` component. When the copy has one or more notes, the section SHALL display them in reverse-chronological order with an "Add Note" button. When the copy has no notes, the section SHALL display "No notes yet." with an "Add Note" button. The "Add Note" button SHALL open the `NoteEditorModal` in create mode, pre-targeting the current copy. If the copy has an active read-through (status: "reading"), the read-through SHALL be auto-selected in the editor.

#### Scenario: Copy with notes
- **WHEN** a user navigates to a copy detail page and the copy has notes
- **THEN** the "Notes" section renders all notes in reverse-chronological order via the `NoteTimeline` component

#### Scenario: Add note from copy detail
- **WHEN** the user clicks "Add Note" in the notes section
- **THEN** the `NoteEditorModal` opens in create mode with the copy pre-targeted and the active read-through auto-selected (if one exists)

#### Scenario: Copy with no notes
- **WHEN** a copy has no notes
- **THEN** the "Notes" section displays "No notes yet." with an "Add Note" button
