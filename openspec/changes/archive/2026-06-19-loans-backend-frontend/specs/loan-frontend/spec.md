# loan-frontend Specification

## Purpose
Client-side display and interaction layer for loan tracking on copies. Provides the Loan History table on Copy Detail, lending form, return actions, overdue highlighting, and loan badges on copy cards.

## ADDED Requirements

### Requirement: Loan History table on Copy Detail
The Copy Detail page SHALL display a "Loan History" section with a table of all loans. Each row SHALL display: Borrower name, Lent date, Expected return date (if set, otherwise "—"), and Returned date (or "—" if outstanding). Outstanding loans SHALL be listed first, followed by returned loans in reverse chronological order by `lent_date`. If the copy has no loans, the section SHALL display "No loans yet."

#### Scenario: Copy with mixed loans
- **WHEN** a user navigates to a copy with one outstanding loan and two returned loans
- **THEN** the Loan History table displays all three loans
- **AND** the outstanding loan appears first

#### Scenario: Copy with no loans
- **WHEN** a copy has no loans
- **THEN** the Loan History section displays "No loans yet."

### Requirement: Overdue highlighting
Loans with `expected_return_date` set, in the past, and `returned_date` unset SHALL be highlighted. The `expected_return_date` cell SHALL use red/orange text styling to indicate the loan is overdue.

#### Scenario: Overdue loan
- **WHEN** a loan has `expected_return_date: "2025-01-15"`, `returned_date` is unset, and today is 2025-02-01
- **THEN** the expected return date is displayed in red/orange text

#### Scenario: Not yet overdue
- **WHEN** a loan has `expected_return_date: "2026-12-31"` and today is 2025-06-01
- **THEN** the expected return date uses normal text styling

#### Scenario: No expected return date
- **WHEN** a loan has no `expected_return_date` set
- **THEN** the cell displays "—" with normal styling

### Requirement: Lend this copy
The Copy Detail page SHALL provide a "Lend this copy" button that opens a form. The form SHALL have fields for borrower name (required, text input), lent date (optional, date picker, defaults to today), and expected return date (optional, date picker). Submitting SHALL send `POST /api/copies/:slug/loans` and refresh the page. The button SHALL be disabled when the copy has an outstanding loan or is not `owned`.

#### Scenario: Lend a copy
- **WHEN** the user clicks "Lend this copy", fills in "Sarah" and an expected return date, and submits
- **THEN** a POST request is sent and the page refreshes showing the new loan

#### Scenario: Button disabled when already lent
- **WHEN** the copy already has an outstanding loan
- **THEN** the "Lend this copy" button is disabled

#### Scenario: Button disabled for non-owned copy
- **WHEN** the copy has status `lost`, `given-away`, or `sold`
- **THEN** the "Lend this copy" button is disabled

### Requirement: Mark as returned
Each outstanding loan row SHALL display a "Mark as returned" button. Clicking it SHALL send `PATCH /api/copies/:slug/loans/:lentDate` with `returned_date` set to today's date and refresh the page.

#### Scenario: Return a loan
- **WHEN** the user clicks "Mark as returned" on an outstanding loan
- **THEN** a PATCH request is sent with today's date as `returned_date`
- **AND** the page refreshes showing the loan as returned

### Requirement: Edit a loan
Each loan row SHALL provide an edit action. The edit form SHALL allow modifying `borrower_name`, `lent_date`, `expected_return_date`, and `returned_date`. Submitting SHALL send `PATCH /api/copies/:slug/loans/:lentDate`.

#### Scenario: Edit borrower name
- **WHEN** the user edits a loan's borrower name from "Sarah" to "Sarah Connor" and submits
- **THEN** a PATCH request is sent and the page refreshes

### Requirement: Delete a loan
Each loan row SHALL provide a delete action. Clicking SHALL open a confirmation dialog. Confirming SHALL send `DELETE /api/copies/:slug/loans/:lentDate` and refresh the page.

#### Scenario: Delete a returned loan
- **WHEN** the user deletes a returned loan and confirms
- **THEN** a DELETE request is sent and the page refreshes showing the loan removed

### Requirement: Copy card loan display
Copy cards SHALL display loan information when the copy has outstanding loans. The card SHALL show "Lent to [comma-joined borrower names]" below the status badge. If there are no outstanding loans, no loan text is displayed.

#### Scenario: Copy with one outstanding loan
- **WHEN** a copy has one outstanding loan to "Sarah"
- **THEN** the copy card displays "Lent to Sarah"

#### Scenario: Copy with multiple outstanding loans
- **WHEN** a copy has outstanding loans to "Sarah" and "Mike"
- **THEN** the copy card displays "Lent to Sarah, Mike"

#### Scenario: Copy with only returned loans
- **WHEN** a copy has loans but all are returned
- **THEN** no loan text is displayed on the copy card

### Requirement: Edit Copy modal restricts status dropdown
The Edit Copy modal's status dropdown SHALL exclude `lent` (must use loan flow). The `owned` option SHALL be disabled when the copy has outstanding loans, with a tooltip or helper text explaining the restriction. The other statuses (`lost`, `given-away`, `sold`) SHALL remain available.

#### Scenario: Lent removed from dropdown
- **WHEN** a user opens the Edit Copy modal
- **THEN** the status dropdown does not include `lent`

#### Scenario: Owned disabled with outstanding loans
- **WHEN** a user opens the Edit Copy modal on a copy with an outstanding loan
- **THEN** the `owned` option is disabled with an explanatory tooltip

#### Scenario: Owned available when no outstanding loans
- **WHEN** a user opens the Edit Copy modal on a copy with no outstanding loans
- **THEN** the `owned` option is enabled
