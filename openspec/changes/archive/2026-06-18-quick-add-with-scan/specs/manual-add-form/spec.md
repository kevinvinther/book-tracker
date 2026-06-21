## ADDED Requirements

### Requirement: Scan Barcode button on Add Book page
The Add Book page at `/add` SHALL display a "Scan Barcode" button in the page header, alongside the existing cancel button. When clicked, the system SHALL render the barcode scanner component using the lazy-loading wrapper, hiding the manual form. The page SHALL display a manual ISBN text input with a "Lookup" button next to the scan button for users without a camera or who prefer typing an ISBN.

#### Scenario: Scan Barcode button visible
- **WHEN** a user navigates to `/add`
- **THEN** the page displays a "Scan Barcode" button in the header area
- **AND** a manual ISBN text input and "Lookup" button are displayed near the scan button

#### Scenario: Clicking Scan Barcode opens scanner
- **WHEN** the user clicks "Scan Barcode"
- **THEN** the barcode scanner viewfinder is displayed
- **AND** the manual form fields are hidden
- **AND** the scan and manual ISBN controls remain visible or a cancel button is shown

### Requirement: Preview screen replaces manual form after scan
After a successful scan and lookup, the manual form SHALL be replaced by a preview screen showing all fetched metadata in editable fields. The preview screen SHALL include a cover image (if available), editable title/subtitle/authors/publisher/date/pages/format/language/genres/description fields, optional copy fields, and dedup warnings if applicable. A "Confirm & Create" button SHALL submit the preview data to `POST /api/quick-add`. A "Cancel" button SHALL return the user to the manual form.

#### Scenario: Preview screen displays after successful lookup
- **WHEN** ISBN lookup succeeds and returns metadata
- **THEN** the preview screen is shown with all fetched fields filled in and editable
- **AND** the manual form is replaced by the preview

#### Scenario: Cancel from preview returns to manual form
- **WHEN** the user clicks "Cancel" on the preview screen
- **THEN** the preview is dismissed and the manual form is shown

### Requirement: Author correction in preview
Each author displayed in the preview SHALL be shown in a dropdown input that defaults to the author resolved by the lookup (either an existing match or a new author). The dropdown SHALL show all existing authors as alternatives, allowing the user to correct a wrong match. The "Create new" option SHALL also be available in the dropdown.

#### Scenario: Author dropdown shows resolved match as default
- **WHEN** the lookup matched "Frank Herbert" to an existing Author and "Brian Herbert" to a new Author
- **THEN** the preview shows "Frank Herbert" as the selected author in the first dropdown
- **AND** "Brian Herbert" as the selected author in the second dropdown (with "new" indicator)

#### Scenario: User corrects an author match via dropdown
- **WHEN** the user opens an author dropdown and selects a different existing author
- **THEN** the corrected author is used as the selected author for submission

### Requirement: Add Book button on Work Grid
The Work Grid page SHALL display an "Add Book" button in the header area that navigates to the `/add` page.

#### Scenario: Clicking Add Book
- **WHEN** the user clicks "+ Add Book" on the Work Grid
- **THEN** the browser navigates to `/add`
