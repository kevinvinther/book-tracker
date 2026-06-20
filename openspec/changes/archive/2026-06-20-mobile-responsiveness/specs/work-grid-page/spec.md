## MODIFIED Requirements

### Requirement: The system SHALL render a responsive grid of Work cover thumbnails at the route `/`, fetched from `GET /api/works`.
The system SHALL render a responsive grid of Work cover thumbnails at the route `/`, fetched from `GET /api/works`.

#### Scenario: Grid fetches and renders
- **WHEN** the user navigates to `/`
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

### Requirement: The grid SHALL support filtering by genre, computed client-side from the genres present on the currently loaded works.
The grid SHALL support filtering by genre. On viewports 768px and above, genre chips SHALL be displayed inline below the toolbar. On viewports below 768px, genre chips SHALL be accessible via a "Filters" button that opens a bottom sheet dialog.

#### Scenario: Genre chip inline on desktop
- **WHEN** the user selects a genre chip on a desktop viewport
- **THEN** only works whose `genres` array includes that genre are shown

#### Scenario: Genre filter via bottom sheet on mobile
- **WHEN** the user taps the "Filters" button on a mobile viewport
- **THEN** a bottom sheet opens with genre chips; selecting a chip filters the grid and closes the sheet
