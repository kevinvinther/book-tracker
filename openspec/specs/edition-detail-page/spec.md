# edition-detail-page Specification

## Purpose
Client page that displays a single Edition's full bibliographic metadata, links to its parent work, lists copies of the edition, and provides actions to add copies and edit the edition.
## Requirements
### Requirement: Edition Detail page renders edition metadata
The Edition Detail page at `/editions/:slug` SHALL display all bibliographic metadata from the edition: publisher, publish date, page count, format, language, ISBN, and contributors.

#### Scenario: Edition with full metadata
- **WHEN** a user navigates to `/editions/dune-chronicles-hardcover` and the edition has publisher "Ace", publish_date "1965-06-01", page_count 412, format "hardcover", language "en", and ISBN "978-0-441-17271-9"
- **THEN** all fields are displayed on the page

#### Scenario: Edition with minimal metadata
- **WHEN** an edition has only format "paperback" and no other optional fields
- **THEN** only the available fields are shown; missing fields are not rendered

#### Scenario: Edition does not exist
- **WHEN** a user navigates to `/editions/nonexistent`
- **THEN** the page displays "No such edition" with a link back to the home page

### Requirement: Edition Detail page links to parent work
The Edition Detail page SHALL display a link back to the parent work with the work's title.

#### Scenario: Navigating to parent work
- **WHEN** the edition is linked to work "Dune" and the user clicks the work link
- **THEN** the browser navigates to `/works/dune`

### Requirement: Edition Detail page lists copies
The Edition Detail page SHALL display all copies linked to the edition as a list, using the existing CopyCard component or equivalent. Each copy card SHALL link to `/copies/:slug`.

#### Scenario: Edition with multiple copies
- **WHEN** an edition has 3 copies
- **THEN** 3 copy cards are displayed, each linking to its copy detail page

#### Scenario: Edition with no copies
- **WHEN** an edition has zero copies
- **THEN** the page displays "No copies of this edition yet"

### Requirement: Edition Detail page has Add Copy and Edit Edition buttons
The Edition Detail page SHALL display an "Add Copy" button that opens a modal with fields for condition, location, status, and acquisition_source, submitting `POST /api/copies`. It SHALL also display an "Edit Edition" button that opens a modal for mutable edition fields, submitting `PATCH /api/editions/:slug`.

#### Scenario: Adding a copy
- **WHEN** the user clicks "Add Copy", fills in condition and location, and submits
- **THEN** a new copy is created via `POST /api/copies` and the page refreshes

#### Scenario: Editing edition metadata
- **WHEN** the user clicks "Edit Edition", changes the publisher, and submits
- **THEN** the edition is updated via `PATCH /api/editions/:slug` and the page refreshes

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

