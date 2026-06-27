# work-merge-ui Specification

## Purpose
Client-side UI capability that lets a user merge two Works via a modal workflow launched from the Work Detail page: pick the loser, preview what will move and change, confirm, and see the outcome.

## Requirements
### Requirement: Merge modal entry point on Work Detail
The Work Detail page SHALL provide a "Merge with another work…" action that opens the `MergeWorksModal`. The action SHALL be accessible from the Work Detail page's header area, distinct from the "Edit Work" action.

#### Scenario: Opening the merge modal
- **WHEN** the user clicks "Merge with another work…" on the Work Detail page for `/works/the-hobbit`
- **THEN** a modal opens with the current work pre-identified as the winner

### Requirement: Loser work search within merge modal
The `MergeWorksModal` SHALL provide a search input that queries the existing `GET /api/works?q=<query>` (or `searchWorks`) endpoint and displays matching Works other than the current winner. The user SHALL select exactly one Work as the loser before the preview step is enabled.

#### Scenario: Search excludes the winner
- **WHEN** the modal is open with winner "the-hobbit" and the user types "hobbit" in the loser search
- **THEN** the results list excludes "the-hobbit" itself

#### Scenario: Loser selection required before preview
- **WHEN** the modal is open and no loser has been selected
- **THEN** the preview and confirm controls are disabled

### Requirement: Merge preview before confirmation
After a loser is selected, the modal SHALL display a preview of what will happen on merge:
- The number of editions, copies, and notes that will be re-parented onto the winner
- The genres that will be added to the winner (union minus winner's existing genres)
- The aliases that will be added to the winner (including the loser's title)
- Any scalar fields the winner will adopt from the loser (subtitle, description, primary_cover, series, series_position, original_language, original_publish_year — only those the winner lacks)

The preview SHALL fetch its counts via `GET /api/editions?work=<loser>`, `GET /api/copies?work=<loser>`, and `GET /api/notes?work=<loser>` (or a single dedicated preview endpoint if one exists).

#### Scenario: Preview shows re-parent counts
- **WHEN** the loser has 2 editions, 3 copies, and 5 notes
- **THEN** the preview displays "2 editions, 3 copies, 5 notes will move to <winner title>"

#### Scenario: Preview shows genres to be added
- **WHEN** the winner has genres `[sci-fi]` and the loser has genres `[sci-fi, fantasy]`
- **THEN** the preview shows "Genres to add: fantasy"

#### Scenario: Preview shows aliases to be added
- **WHEN** the loser's title is "The Hobbit: An Unexpected Journey" and the winner has no such alias
- **THEN** the preview shows "Aliases to add: The Hobbit: An Unexpected Journey"

#### Scenario: Preview shows scalar fields to be adopted
- **WHEN** the winner has no `description` and the loser has a description
- **THEN** the preview shows "Description will be adopted from the loser"

### Requirement: Merge confirmation and outcome
The modal SHALL provide a "Confirm Merge" button that issues `POST /api/works/merge` with `{ winner, loser }`. While the request is in flight, the button SHALL show a loading state and be disabled. On success the modal SHALL close, the Work Detail page SHALL refetch its data, and a success indication SHALL be shown. On failure the modal SHALL remain open with the error message displayed and the confirm button re-enabled.

#### Scenario: Successful merge closes modal and refetches
- **WHEN** the user clicks "Confirm Merge" and the server returns 200
- **THEN** the modal closes, the Work Detail page refetches the winner (now showing the absorbed editions and metadata), and a success toast is displayed

#### Scenario: Failed merge keeps modal open with error
- **WHEN** the user clicks "Confirm Merge" and the server returns 500
- **THEN** the modal remains open, the error message is displayed inline, and the "Confirm Merge" button is re-enabled

#### Scenario: Cancel before merge
- **WHEN** the user closes the modal without confirming
- **THEN** no merge request is sent and the Work Detail page is unchanged

### Requirement: Merge modal loading and error states
While the preview data is loading (counts, metadata diff), the modal SHALL display a skeleton or spinner in place of the preview section. If the preview fetch fails, the modal SHALL display an error with a retry affordance and disable the confirm button until the preview loads successfully.

#### Scenario: Preview loading shows skeleton
- **WHEN** the loser is selected and the preview fetches are in flight
- **THEN** the preview section displays a loading skeleton

#### Scenario: Preview fetch failure blocks confirmation
- **WHEN** the preview fetch for edition counts fails
- **THEN** the preview section displays an error with a retry button and the "Confirm Merge" button is disabled
