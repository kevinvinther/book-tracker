## ADDED Requirements

### Requirement: Scan barcode from the Add Book page
The `/add` page SHALL display a "Scan Barcode" button in the page header. When clicked, the system SHALL render the `<BarcodeScanner>` component, transitioning the page to the scanning state. The existing manual entry form SHALL not be visible during scanning.

#### Scenario: Scan button triggers barcode scanner
- **WHEN** the user navigates to `/add` and clicks "Scan Barcode"
- **THEN** the barcode scanner component is rendered with viewfinder overlay
- **AND** the manual entry form is hidden

#### Scenario: Cancel scanning returns to manual form
- **WHEN** the user is in the scanning state and clicks cancel
- **THEN** the barcode scanner closes and the manual entry form is shown again

### Requirement: ISBN lookup after successful scan
After a barcode is successfully scanned, the system SHALL call `GET /api/lookup?isbn=<isbn>` to fetch book metadata. During the lookup, the system SHALL display a loading indicator. If the lookup succeeds, the system SHALL transition to the preview state. If the lookup fails (404 or network error), the system SHALL display an error message showing the ISBN that failed and offer manual entry as fallback.

#### Scenario: Successful ISBN lookup
- **WHEN** the user scans ISBN "9780141036144"
- **THEN** the system calls `GET /api/lookup?isbn=9780141036144`
- **AND** displays a loading indicator during the request
- **AND** on success, transitions to the preview screen with the fetched metadata

#### Scenario: ISBN lookup fails
- **WHEN** the user scans an ISBN and the lookup returns a 404 error
- **THEN** the system displays an error message "Couldn't find this ISBN"
- **AND** the user is returned to the manual entry form with the ISBN pre-filled
- **AND** the error message includes the scanned ISBN number

### Requirement: Dedup check before preview
After a successful ISBN lookup, the system SHALL call `GET /api/quick-add/check-dedup?isbn=<isbn>&title=<title>&author=<author>` to check for duplicate Editions (by ISBN) and similar Works (by title and author). The dedup result SHALL be displayed in the preview screen. If the dedup check fails, the system SHALL proceed to preview without dedup results rather than blocking the flow.

#### Scenario: ISBN matches existing Edition
- **WHEN** the scanned ISBN matches an existing Edition in the library
- **THEN** the preview screen displays "This edition already exists" with the existing Work title and copy count
- **AND** the preview offers "Add another copy" as an option

#### Scenario: Title+author matches existing Work
- **WHEN** the scanned title and author are similar to an existing Work in the library
- **THEN** the preview screen displays "This might be [existing title]" with the option to attach to the existing Work or create a new one

#### Scenario: No duplicates found
- **WHEN** the dedup check returns no matches
- **THEN** the preview screen shows the fetched metadata without any dedup warnings

### Requirement: Preview and edit scanned metadata
The preview screen SHALL display all fetched fields (cover image, title, subtitle, authors, publisher, publish_date, page_count, format, language, genres, description) in an editable form. Each author SHALL be shown in a dropdown that defaults to the resolved lookup match but allows the user to select a different existing author or create a new one. Copy-specific fields (condition, acquisition_date, acquisition_source, price_amount, price_currency, location) SHALL be displayed below the edition fields and SHALL be optional.

#### Scenario: Preview displays fetched data
- **WHEN** a lookup succeeds with title "Dune", authors ["Frank Herbert"], publisher "Chilton Books", publish_date "1965"
- **THEN** the preview screen displays all these fields filled in and editable
- **AND** each author is shown in a dropdown defaulted to the matched or newly created author

#### Scenario: User edits a field in preview
- **WHEN** the user changes the publisher from "Chilton Books" to "Ace Books" in the preview
- **THEN** the edited value is used when the user confirms creation

#### Scenario: User corrects an author match
- **WHEN** the lookup matched "Frank Herbert" but the user selects a different existing author from the author dropdown
- **THEN** the corrected author is used when the user confirms creation

#### Scenario: User skips copy fields
- **WHEN** the user views the preview and leaves all copy fields empty, then confirms
- **THEN** the Copy is created with default status "owned" and no optional copy fields

### Requirement: Confirm scan-based creation
When the user clicks "Confirm & Create" on the preview screen, the system SHALL call `POST /api/quick-add` with the (possibly edited) metadata. The request SHALL include all work, edition, and copy fields from the preview. If the user chose to attach to an existing Work from a dedup match, the request SHALL include `attachToWorkSlug`. On success, the system SHALL redirect to the new or existing Work's detail page. On failure, the system SHALL display an error message on the preview screen.

#### Scenario: Confirm creates new Work, Edition, and Copy
- **WHEN** the user confirms preview with no dedup match and all fields as shown
- **THEN** the system POSTs to `/api/quick-add` with the full metadata
- **AND** on 201 response, redirects to `/works/{workSlug}`

#### Scenario: Confirm attaches to existing Work
- **WHEN** the user selected "attach to existing" from a dedup match and confirms
- **THEN** the system POSTs to `/api/quick-add` with `attachToWorkSlug` set to the existing Work's slug
- **AND** on 201 response, redirects to `/works/{existingWorkSlug}`

#### Scenario: Confirm fails due to server error
- **WHEN** the user confirms and the POST to `/api/quick-add` returns a 4xx or 5xx error
- **THEN** the system displays the error message on the preview screen
- **AND** the user remains on the preview screen with their data intact

### Requirement: Manual ISBN input fallback
The `/add` page SHALL display a manual ISBN text input and "Lookup" button alongside the "Scan Barcode" button. When the user enters an ISBN and clicks "Lookup", the system SHALL follow the same flow as a successful scan: call `GET /api/lookup`, check dedup, and show the preview screen.

#### Scenario: Manual ISBN entry triggers lookup
- **WHEN** the user types "9780141036144" into the ISBN input and clicks "Lookup"
- **THEN** the system calls `GET /api/lookup?isbn=9780141036144` and follows the same flow as a scan
