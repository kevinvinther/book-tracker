## ADDED Requirements

### Requirement: Missing ISBN display
When an edition has no ISBN, the metadata section SHALL display the ISBN label with an em-dash placeholder instead of hiding the ISBN row entirely.

#### Scenario: Edition without ISBN shows placeholder
- **WHEN** an edition has no `isbn` field (or `isbn` is null)
- **THEN** the ISBN row is displayed with the label "ISBN" and the value "—"

#### Scenario: Edition with ISBN shows value
- **WHEN** an edition has an `isbn` value set
- **THEN** the ISBN row is displayed with the actual ISBN value (existing behavior, unchanged)
