# work-grid-page Specification

## Purpose
Client home page that displays a responsive grid of all Works as cover thumbnails, with live search, sort, and genre filtering.

## Requirements

### Requirement: Work Grid is the home page
The system SHALL render a responsive grid of Work cover thumbnails at the route `/`, fetched from `GET /api/works`.

#### Scenario: Grid loads on visiting the home route
- **WHEN** the user navigates to `/`
- **THEN** the app fetches `GET /api/works` and renders one card per work

#### Scenario: Responsive column count
- **WHEN** the viewport is mobile-width
- **THEN** the grid renders 2 columns
- **AND WHEN** the viewport is desktop-width
- **THEN** the grid renders 3–4 columns

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

### Requirement: Genre filter
The grid SHALL support filtering by genre, computed client-side from the genres present on the currently loaded works.

#### Scenario: Selecting a genre filter
- **WHEN** the user selects a genre chip
- **THEN** only works whose `genres` array includes that genre are shown

### Requirement: Empty state
When no works exist in the library, the grid SHALL show an empty-state message with a prompt to add the first book.

#### Scenario: Empty library
- **WHEN** `GET /api/works` returns an empty array and no search/filter is active
- **THEN** the grid shows "No books yet. Add your first book." instead of an empty grid
