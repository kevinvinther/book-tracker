# copy-detail-page Specification

## MODIFIED Requirements

### Requirement: Copy Detail page shows loan history section
The Copy Detail page SHALL have a "Loan History" section displaying a table of all loans. Each loan row SHALL display Borrower name, Lent date, Expected return date (or "—"), and Returned date (or "—"). Outstanding loans SHALL be listed first, followed by returned loans in reverse chronological order. Overdue loans (expected_return_date in the past, unreturned) SHALL display the expected return date in red/orange text. When the copy has no loans, the section SHALL display "No loans yet." The section SHALL include a "Lend this copy" button (disabled when already lent or status is not `owned`). Outstanding loans SHALL show a "Mark as returned" button. Each loan SHALL have edit and delete actions.

#### Scenario: Copy with loans
- **WHEN** a user navigates to a copy detail page and the copy has loans
- **THEN** the "Loan History" section renders the loan table with all loan data and actions as specified in `loan-frontend`

#### Scenario: Copy with no loans
- **WHEN** a copy has no loans
- **THEN** the "Loan History" section displays "No loans yet." with a "Lend this copy" button

### Requirement: Copy Detail page has an Edit Copy button
The Copy Detail page SHALL display an "Edit Copy" button that opens a modal with fields for condition, location, cover_image, status, acquisition_date, acquisition_source, price_amount, and price_currency. The status dropdown SHALL exclude `lent`. The `owned` option SHALL be disabled when the copy has outstanding loans. Submitting SHALL send `PATCH /api/copies/:slug` and refresh the page.

#### Scenario: Editing copy metadata
- **WHEN** the user clicks "Edit Copy", changes the condition, and submits
- **THEN** the copy is updated via `PATCH /api/copies/:slug` and the page refreshes

#### Scenario: Status dropdown restrictions
- **WHEN** the user opens the Edit Copy modal on a copy with an outstanding loan
- **THEN** the `lent` status option is absent from the dropdown
- **AND** the `owned` status option is disabled with an explanatory indication
