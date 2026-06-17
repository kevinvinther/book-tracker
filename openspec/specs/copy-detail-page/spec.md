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

### Requirement: Copy Detail page shows read-through history section with empty state
The Copy Detail page SHALL have a "Read-through History" section. Since the read-through backend is not yet built, this section SHALL display "No read-throughs yet."

#### Scenario: Read-through section displayed
- **WHEN** a user navigates to any copy detail page
- **THEN** the "Read-through History" section is present with the empty state message

### Requirement: Copy Detail page shows loan history section with empty state
The Copy Detail page SHALL have a "Loan History" section. Since the loan backend is not yet built, this section SHALL display "No loans yet."

#### Scenario: Loan history section displayed
- **WHEN** a user navigates to any copy detail page
- **THEN** the "Loan History" section is present with the empty state message

### Requirement: Copy Detail page shows notes section with empty state
The Copy Detail page SHALL have a "Notes" section. Since the notes backend is not yet built, this section SHALL display "No notes yet."

#### Scenario: Notes section displayed
- **WHEN** a user navigates to any copy detail page
- **THEN** the "Notes" section is present with the empty state message

### Requirement: Copy Detail page has an Edit Copy button
The Copy Detail page SHALL display an "Edit Copy" button that opens a modal with fields for condition, location, cover_image, status, acquisition_date, acquisition_source, price_amount, and price_currency. Submitting SHALL send `PATCH /api/copies/:slug` and refresh the page.

#### Scenario: Editing copy metadata
- **WHEN** the user clicks "Edit Copy", changes the condition, and submits
- **THEN** the copy is updated via `PATCH /api/copies/:slug` and the page refreshes

### Requirement: Copy does not exist
When a copy slug does not match any existing copy, the page SHALL display a not-found message with a link home.

#### Scenario: Non-existent copy
- **WHEN** a user navigates to `/copies/nonexistent`
- **THEN** the page displays "No such copy" with a link back to the home page
