# copy-detail-page Delta Specification

## RENAMED Requirements

### Requirement: Copy Detail page shows read-through history section with empty state
- **FROM:** `### Requirement: Copy Detail page shows read-through history section with empty state`
- **TO:** `### Requirement: Copy Detail page shows read-through history section`

## MODIFIED Requirements

### Requirement: Copy Detail page shows read-through history section
The Copy Detail page SHALL have a "Read-through History" section. When the copy has one or more read-throughs, the section SHALL display each read-through with status badges, dates, ratings, page log tables, and interactive controls for logging pages, changing status, editing entries, and managing read-throughs. When the copy has no read-throughs, the section SHALL display "No read-throughs yet."

#### Scenario: Copy with read-throughs
- **WHEN** a user navigates to a copy detail page and the copy has read-throughs
- **THEN** the "Read-through History" section renders all read-throughs with full interactive controls as specified in `read-through-frontend`

#### Scenario: Copy with no read-throughs
- **WHEN** a user navigates to a copy detail page and the copy has no read-throughs
- **THEN** the "Read-through History" section displays "No read-throughs yet."
