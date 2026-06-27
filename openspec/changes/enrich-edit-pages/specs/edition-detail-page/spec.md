## MODIFIED Requirements

### Requirement: Edition Detail page has Add Copy and Edit Edition buttons
The Edition Detail page SHALL display an "Add Copy" button that opens a modal with fields for condition, location, status, and acquisition_source, submitting `POST /api/copies`. It SHALL also display an "Edit Edition" button that navigates to the dedicated edition edit page at `/editions/:slug/edit` (replacing the former edit modal).

#### Scenario: Adding a copy
- **WHEN** the user clicks "Add Copy", fills in condition and location, and submits
- **THEN** a new copy is created via `POST /api/copies` and the page refreshes

#### Scenario: Editing edition metadata
- **WHEN** the user clicks "Edit Edition"
- **THEN** the app navigates to `/editions/:slug/edit`, where the edition (and its parent work's shared fields) can be edited and enriched from external sources
