## ADDED Requirements

### Requirement: Retry button on error
When the work grid fetch fails with an error, the error message SHALL be accompanied by a "Retry" button that re-triggers the data fetch.

#### Scenario: Error with retry action
- **WHEN** `GET /api/works` fails and an error message is displayed
- **THEN** a "Retry" button is displayed alongside the error message
- **AND WHEN** the user clicks "Retry"
- **THEN** the data fetch is re-triggered and the error message is cleared

### Requirement: Skeleton loading state
While works are loading, the grid SHALL display skeleton card placeholders instead of no content.

#### Scenario: Initial load shows skeleton grid
- **WHEN** the user navigates to `/` and data has not yet loaded
- **THEN** a grid of animated skeleton cards is displayed in place of work cards

#### Scenario: Skeleton replaced on data arrival
- **WHEN** the skeleton grid is displayed and data arrives
- **THEN** the skeletons are replaced by actual work cards with the standard card-reveal animation

### Requirement: Unknown author fallback
When a work has zero authors in its `authors_meta` array, the card SHALL display "Unknown author" in place of the missing author name.

#### Scenario: Work with empty author list
- **WHEN** a work has `authors_meta` as an empty array or `null`
- **THEN** the card displays "Unknown author" in the author position with `text-muted-foreground` styling
