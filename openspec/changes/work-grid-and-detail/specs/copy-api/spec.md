## ADDED Requirements

### Requirement: List copies with optional work/edition filter
The system SHALL expose `GET /api/copies` that returns all copies as a JSON array, accepting optional query parameters `?work=` (filters to copies of that work, via `index.getCopiesByWork`) and `?edition=` (filters to copies of that edition, via `index.getCopiesByEdition`). If both are provided, `?work=` takes precedence.

#### Scenario: List all copies
- **WHEN** a GET request is made to `/api/copies`
- **THEN** the response has status 200 and a JSON array of all copies

#### Scenario: Filter by work
- **WHEN** a GET request is made to `/api/copies?work=dune` and the work has 3 copies across two editions
- **THEN** the response has status 200 and a JSON array of exactly those 3 copies

#### Scenario: Filter by edition
- **WHEN** a GET request is made to `/api/copies?edition=dune-ace-1990` and that edition has 2 copies
- **THEN** the response has status 200 and a JSON array of exactly those 2 copies

#### Scenario: Filter matching nothing
- **WHEN** a GET request is made to `/api/copies?work=nonexistent`
- **THEN** the response has status 200 and an empty JSON array
