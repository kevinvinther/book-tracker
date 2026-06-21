## MODIFIED Requirements

### Requirement: The system SHALL render a responsive grid of Work cover thumbnails at the route `/`, fetched from `GET /api/works`.
The system SHALL render a responsive grid of Work cover thumbnails at the route `/library`, fetched from `GET /api/works`. The route `/` no longer renders this grid (it renders the reading dashboard); the grid is reached via the "Library" navigation entry.

#### Scenario: Grid fetches and renders
- **WHEN** the user navigates to `/library`
- **THEN** the app fetches `GET /api/works` and renders one card per work

#### Scenario: Grid columns by viewport width
- **WHEN** the viewport is below 640px
- **THEN** the grid renders 2 columns
- **AND WHEN** the viewport is between 640px and 1024px
- **THEN** the grid renders 3 columns
- **AND WHEN** the viewport is 1024px or above
- **THEN** the grid renders 4 columns
- **AND WHEN** the viewport is 1280px or above
- **THEN** the grid renders 5 columns

### Requirement: Skeleton loading state
While works are loading, the grid SHALL display skeleton card placeholders instead of no content.

#### Scenario: Initial load shows skeleton grid
- **WHEN** the user navigates to `/library` and data has not yet loaded
- **THEN** a grid of animated skeleton cards is displayed in place of work cards

#### Scenario: Skeleton replaced on data arrival
- **WHEN** the skeleton grid is displayed and data arrives
- **THEN** the skeletons are replaced by actual work cards with the standard card-reveal animation
