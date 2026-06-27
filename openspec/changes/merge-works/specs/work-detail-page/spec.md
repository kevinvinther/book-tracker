## MODIFIED Requirements

### Requirement: Edit Work
The page SHALL provide an "Edit Work" action that navigates to the dedicated work edit page at `/works/:slug/edit` (replacing the former edit modal), where the work's mutable fields are edited and submitted via `PATCH /api/works/:slug`. The page SHALL additionally provide a "Merge with another work…" action that opens the `MergeWorksModal` with the current work pre-identified as the winner, allowing the user to combine the current work with another existing work.

#### Scenario: Editing a work's title
- **WHEN** the user clicks "Edit Work", changes the title on `/works/:slug/edit`, and saves
- **THEN** the work is updated via `PATCH /api/works/:slug` and the user is returned to the work detail page showing the new title

#### Scenario: Opening the merge modal from Work Detail
- **WHEN** the user clicks "Merge with another work…" on the Work Detail page for `/works/the-hobbit`
- **THEN** the `MergeWorksModal` opens with "the-hobbit" pre-set as the winner
