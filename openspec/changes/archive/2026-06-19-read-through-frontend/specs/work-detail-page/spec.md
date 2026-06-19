# work-detail-page Delta Specification

## MODIFIED Requirements

### Requirement: Copy card content
Each copy card SHALL display the copy's format (from its edition), condition, ownership status badge, location, and acquisition source — all currently available fields. Additionally, each copy card SHALL display the most recent read-through's status and page progress when the copy has read-throughs. Loan badges SHALL NOT be displayed (deferred to a future change).

#### Scenario: Copy with read-through status
- **WHEN** a copy has a most recent read-through with `status: "reading"` and last page 104 on an edition with 604 pages
- **THEN** the copy card shows "Reading · pg 104/604" alongside the existing fields

#### Scenario: Copy without read-throughs
- **WHEN** a copy has no read-throughs
- **THEN** the copy card shows the existing fields without any read-through information

#### Scenario: Copy with condition and location set
- **WHEN** a copy has `condition: "good"` and `location: "living room shelf"`
- **THEN** the copy card shows both values alongside its status badge
