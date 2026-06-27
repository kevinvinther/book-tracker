## MODIFIED Requirements

### Requirement: Edit Work
The page SHALL provide an "Edit Work" action that navigates to the dedicated work edit page at `/works/:slug/edit` (replacing the former edit modal), where the work's mutable fields are edited and submitted via `PATCH /api/works/:slug`.

#### Scenario: Editing a work's title
- **WHEN** the user clicks "Edit Work", changes the title on `/works/:slug/edit`, and saves
- **THEN** the work is updated via `PATCH /api/works/:slug` and the user is returned to the work detail page showing the new title
