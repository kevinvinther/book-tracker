# work-grid-page Specification

## Purpose
Client home page that displays a responsive grid of all Works as cover thumbnails, with live search, sort, and genre filtering.

## Requirements

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

### Requirement: Work card content
Each card in the grid SHALL display the work's cover thumbnail (or a placeholder if `primary_cover` is unset), title, first author's name (resolved via `authors_meta`), and `copy_count`.

#### Scenario: Work with a cover and author
- **WHEN** a work has `primary_cover` set and at least one author
- **THEN** its card shows the cover image, title, the first author's name, and the copy count

#### Scenario: Work with no cover
- **WHEN** a work has no `primary_cover`
- **THEN** its card shows a placeholder thumbnail instead of a broken image

#### Scenario: Clicking a card navigates to Work Detail
- **WHEN** the user clicks a work card
- **THEN** the app navigates to `/works/:slug` for that work

### Requirement: Live search
The grid SHALL support live, debounced search by title, author name, or genre, implemented via `GET /api/works?q=`.

#### Scenario: Typing a search query filters the grid
- **WHEN** the user types "dune" into the search bar
- **THEN** after a short debounce the grid re-fetches with `?q=dune` and shows only matching works

#### Scenario: Clearing the search shows all works
- **WHEN** the user clears the search input
- **THEN** the grid re-fetches with no `q` param and shows all works

### Requirement: Sort control
The grid SHALL support sorting by title, author, or date added, implemented via `GET /api/works?sort=&order=`.

#### Scenario: Sorting by title
- **WHEN** the user selects "Title" as the sort option
- **THEN** the grid re-fetches with `?sort=title` and displays works in that order

### Requirement: The grid SHALL support filtering by genre, computed client-side from the genres present on the currently loaded works.
The grid SHALL support filtering by genre. On viewports 768px and above, genre chips SHALL be displayed inline below the toolbar. On viewports below 768px, genre chips SHALL be accessible via a "Filters" button that opens a bottom sheet dialog.

#### Scenario: Genre chip inline on desktop
- **WHEN** the user selects a genre chip on a desktop viewport
- **THEN** only works whose `genres` array includes that genre are shown

#### Scenario: Genre filter via bottom sheet on mobile
- **WHEN** the user taps the "Filters" button on a mobile viewport
- **THEN** a bottom sheet opens with genre chips; selecting a chip filters the grid and closes the sheet

### Requirement: Empty state
When no works exist in the library, the grid SHALL show an empty-state message with a prompt to add the first book.

#### Scenario: Empty library
- **WHEN** `GET /api/works` returns an empty array and no search/filter is active
- **THEN** the grid shows "No books yet. Add your first book." instead of an empty grid

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
- **WHEN** the user navigates to `/library` and data has not yet loaded
- **THEN** a grid of animated skeleton cards is displayed in place of work cards

#### Scenario: Skeleton replaced on data arrival
- **WHEN** the skeleton grid is displayed and data arrives
- **THEN** the skeletons are replaced by actual work cards with the standard card-reveal animation

### Requirement: Unknown author fallback
When a work has zero authors in its `authors_meta` array, the card SHALL display "Unknown author" in place of the missing author name.

#### Scenario: Work with empty author list
- **WHEN** a work has `authors_meta` as an empty array or `null`
- **THEN** the card displays "Unknown author" in the author position with `text-muted-foreground` styling
