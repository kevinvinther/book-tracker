# copy-detail-page Specification

## Purpose
Client page that displays a single Copy's full ownership metadata, links to its parent work and edition, and provides placeholder sections for future read-through, loan, and notes features, plus an edit action.
## Requirements
### Requirement: Copy Detail page renders copy metadata
The Copy Detail page at `/copies/:slug` SHALL display all ownership metadata from the copy: cover image (or placeholder), format, condition, status, location, acquisition date, acquisition source, price, and links to the parent work and edition.

#### Scenario: Copy with full metadata
- **WHEN** a user navigates to `/copies/dune-chronicles-hardcover-1` and the copy has condition "fine", location "Living Room", acquisition_date "2024-01-15", acquisition_source "Bookshop", price_amount 25.00, price_currency "USD", and status "owned"
- **THEN** all fields are displayed on the page

#### Scenario: Copy with cover image
- **WHEN** a copy has a `cover_image` field pointing to a file in attachments/
- **THEN** the cover image is rendered via `/api/attachments/{filename}`

#### Scenario: Copy with no cover image
- **WHEN** a copy has no `cover_image`
- **THEN** a placeholder is displayed

#### Scenario: Copy with minimal metadata
- **WHEN** a copy has only status "owned" and no other optional fields
- **THEN** only the available fields are shown; missing fields are not rendered

### Requirement: Copy Detail page links to parent work and edition
The Copy Detail page SHALL display links to the parent work (with title) and parent edition (with publisher/format).

#### Scenario: Navigating to parent work
- **WHEN** the user clicks the work link
- **THEN** the browser navigates to `/works/{slug}`

#### Scenario: Navigating to parent edition
- **WHEN** the user clicks the edition link
- **THEN** the browser navigates to `/editions/{slug}`

### Requirement: Copy Detail page shows read-through history section
The Copy Detail page SHALL have a "Read-through History" section. When the copy has one or more read-throughs, the section SHALL display each read-through with status badges, dates, ratings, page log tables, and interactive controls for logging pages, changing status, editing entries, and managing read-throughs. When the copy has no read-throughs, the section SHALL display "No read-throughs yet."

#### Scenario: Copy with read-throughs
- **WHEN** a user navigates to a copy detail page and the copy has read-throughs
- **THEN** the "Read-through History" section renders all read-throughs with full interactive controls as specified in `read-through-frontend`

#### Scenario: Copy with no read-throughs
- **WHEN** a user navigates to a copy detail page and the copy has no read-throughs
- **THEN** the "Read-through History" section displays "No read-throughs yet."

### Requirement: Copy Detail page shows loan history section
The Copy Detail page SHALL have a "Loan History" section displaying a table of all loans. Each loan row SHALL display Borrower name, Lent date, Expected return date (or "—"), and Returned date (or "—"). Outstanding loans SHALL be listed first, followed by returned loans in reverse chronological order. Overdue loans (expected_return_date in the past, unreturned) SHALL display the expected return date in red/orange text. When the copy has no loans, the section SHALL display "No loans yet." The section SHALL include a "Lend this copy" button (disabled when already lent or status is not `owned`). Outstanding loans SHALL show a "Mark as returned" button. Each loan SHALL have edit and delete actions.

#### Scenario: Copy with loans
- **WHEN** a user navigates to a copy detail page and the copy has loans
- **THEN** the "Loan History" section renders the loan table with all loan data and actions as specified in `loan-frontend`

#### Scenario: Copy with no loans
- **WHEN** a copy has no loans
- **THEN** the "Loan History" section displays "No loans yet." with a "Lend this copy" button

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

### Requirement: Copy Detail page has an Edit Copy button
The Copy Detail page SHALL display an "Edit Copy" button that opens a modal with fields for condition, location, cover_image, status, acquisition_date, acquisition_source, price_amount, and price_currency. The status dropdown SHALL exclude `lent`. The `owned` option SHALL be disabled when the copy has outstanding loans. Submitting SHALL send `PATCH /api/copies/:slug` and refresh the page.

#### Scenario: Editing copy metadata
- **WHEN** the user clicks "Edit Copy", changes the condition, and submits
- **THEN** the copy is updated via `PATCH /api/copies/:slug` and the page refreshes

#### Scenario: Status dropdown restrictions
- **WHEN** the user opens the Edit Copy modal on a copy with an outstanding loan
- **THEN** the `lent` status option is absent from the dropdown
- **AND** the `owned` status option is disabled with an explanatory indication

### Requirement: Copy does not exist
When a copy slug does not match any existing copy, the page SHALL display a not-found message with a link home.

#### Scenario: Non-existent copy
- **WHEN** a user navigates to `/copies/nonexistent`
- **THEN** the page displays "No such copy" with a link back to the home page

