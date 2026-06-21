# manual-add-form Specification

## Purpose
TBD - created by syncing change manual-add-flow. Update Purpose after archive.
## Requirements
### Requirement: Add Manually button on Work Grid
The Work Grid page SHALL display an "Add Manually" button in the header area that navigates to the `/add` page.

#### Scenario: Clicking Add Manually
- **WHEN** the user clicks "Add Manually" on the Work Grid
- **THEN** the browser navigates to `/add`

### Requirement: Cover image file upload with preview
The Copy section SHALL include a file input that accepts image files. When a file is selected, it SHALL be uploaded to `POST /api/attachments/upload` and a local preview SHALL be displayed immediately. The returned filename SHALL be included in the quick-add submission. The user SHALL be able to remove a selected image.

#### Scenario: Selecting a cover image
- **WHEN** the user selects an image file via the file input
- **THEN** a local preview of the image is displayed and the file is uploaded to the server

#### Scenario: Removing a selected cover
- **WHEN** the user clicks the remove button on the cover preview
- **THEN** the preview is cleared and no cover image is included in the submission

#### Scenario: Upload failure
- **WHEN** the cover upload fails
- **THEN** the preview is cleared and the cover image field remains empty

### Requirement: Multi-section form layout
The Add Book page at `/add` SHALL display a form with three visual sections: Work (title, subtitle), Authors (autocomplete input), and Edition & Copy (publisher, ISBN, publish_date, page_count, format, language, condition, acquisition_date, acquisition_source, price_amount, price_currency, location). Title and at least one author SHALL be required.

#### Scenario: Form renders with all sections
- **WHEN** a user navigates to `/add`
- **THEN** the page displays sections for Work, Authors, and Edition & Copy with all fields

#### Scenario: Submitting with empty title
- **WHEN** the user submits the form without a title
- **THEN** an error is shown indicating title is required

#### Scenario: Submitting without any authors
- **WHEN** the user submits the form without selecting or creating any author
- **THEN** an error is shown indicating at least one author is required

### Requirement: Author autocomplete input
The Authors section SHALL include a text input that searches existing authors by name as the user types, showing matching results in a dropdown. Matching SHALL be case-insensitive on both `name` and `aliases`. Selected authors SHALL appear as removable chips below the input.

#### Scenario: Typing matches existing author
- **WHEN** the user types "Frank" in the author input
- **THEN** authors whose name or aliases contain "frank" are shown in a dropdown

#### Scenario: No match — create new option
- **WHEN** the user types a name that doesn't match any existing author
- **THEN** a "Create '{typed name}'" option appears at the bottom of the dropdown

#### Scenario: Selecting an existing author
- **WHEN** the user clicks an existing author from the dropdown
- **THEN** the author appears as a chip below the input and the input is cleared

#### Scenario: Removing a selected author
- **WHEN** the user clicks the remove button on an author chip
- **THEN** the author is removed from the selection

### Requirement: Successful submission creates entities and redirects
When the form is submitted with valid data, the browser SHALL send `POST /api/quick-add` with all fields. On success, the browser SHALL redirect to `/works/{workSlug}`.

#### Scenario: Successful submission
- **WHEN** the user fills in title "Dune", selects author "Frank Herbert", adds publisher "Chilton" and ISBN, and submits
- **THEN** a POST is sent to `/api/quick-add` and the browser redirects to the new work's detail page

#### Scenario: Submission failure
- **WHEN** the POST to `/api/quick-add` fails
- **THEN** an error message is displayed on the form

### Requirement: Cancel returns to Work Grid
The form SHALL have a cancel button or back link that returns to the Work Grid.

#### Scenario: Clicking cancel
- **WHEN** the user clicks "Cancel" on the Add Book form
- **THEN** the browser navigates to `/`

