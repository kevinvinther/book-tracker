# work-detail-page Specification

## MODIFIED Requirements

### Requirement: Copy card content
Each copy card SHALL display the copy's format (from its edition), condition, ownership status badge, location, and acquisition source — all currently available fields. Additionally, each copy card SHALL display the most recent read-through's status and page progress when the copy has read-throughs. When the copy has outstanding loans (any loan with no `returned_date`), the card SHALL display "Lent to [comma-joined borrower names]" below the status badge.

#### Scenario: Copy with read-through status
- **WHEN** a copy has a most recent read-through with `status: "reading"` and last page 104 on an edition with 604 pages
- **THEN** the copy card shows "Reading · pg 104/604" alongside the existing fields

#### Scenario: Copy with outstanding loan
- **WHEN** a copy has an outstanding loan to "Sarah"
- **THEN** the copy card displays "Lent to Sarah" below the status badge

#### Scenario: Copy with multiple outstanding loans
- **WHEN** a copy has outstanding loans to "Sarah" and "Mike"
- **THEN** the copy card displays "Lent to Sarah, Mike"

#### Scenario: Copy without read-throughs or outstanding loans
- **WHEN** a copy has no read-throughs and no outstanding loans (or all loans are returned)
- **THEN** the copy card shows the existing fields without any read-through or loan information

#### Scenario: Copy with condition and location set
- **WHEN** a copy has `condition: "good"` and `location: "living room shelf"`
- **THEN** the copy card shows both values alongside its status badge
