## ADDED Requirements

### Requirement: Series Detail page renders series metadata
The Series Detail page at `/series/:slug` SHALL display the series `name` as the page heading.

#### Scenario: Navigating to a series
- **WHEN** a user navigates to `/series/dune-chronicles`
- **THEN** the page displays "Dune Chronicles" as the heading

#### Scenario: Series does not exist
- **WHEN** a user navigates to `/series/nonexistent-series`
- **THEN** the page displays a "No such series" message with a link back to the home page

### Requirement: Series Detail page lists works ordered by series position
The Series Detail page SHALL display all linked works as a list ordered by `series_position` ascending. Each work entry SHALL show its series position number, cover thumbnail, title, first author name, and copy count. Works with no `series_position` SHALL appear last.

#### Scenario: Series with positioned works
- **WHEN** a user navigates to `/series/dune-chronicles` with 3 works at positions 1, 2, and 3
- **THEN** the page displays works in order #1, #2, #3 with position numbers, titles, and author names

#### Scenario: Series with an unpositioned work
- **WHEN** a series has works at positions 1, 3, and one work with no position
- **THEN** the unpositioned work appears after the positioned works

#### Scenario: Work with no cover image
- **WHEN** a work in the series has no `primary_cover`
- **THEN** the work entry displays a placeholder thumbnail

### Requirement: Series Detail page shows placeholders for unowned books
When `total_works` is set and exceeds the number of linked works, the Series Detail page SHALL render placeholder entries for the missing positions, indicating they are not yet in the library.

#### Scenario: Series with total_works set higher than linked works
- **WHEN** a series has `total_works: 6` but only 4 linked works
- **THEN** the list shows 4 work entries followed by 2 placeholder rows labeled "Upcoming"

#### Scenario: Series with total_works equal to linked works
- **WHEN** a series has `total_works: 4` and 4 linked works
- **THEN** no placeholder rows are displayed

#### Scenario: Series without total_works set
- **WHEN** a series has no `total_works` value
- **THEN** no placeholder rows are displayed regardless of linked work count

### Requirement: Series Detail page has an Edit Series button
The Series Detail page SHALL display an "Edit Series" button that opens a modal dialog with fields for `name` and `total_works`. Submitting the form SHALL send `PATCH /api/series/:slug` and refresh the page data on success.

#### Scenario: Opening the edit modal
- **WHEN** the user clicks "Edit Series"
- **THEN** a modal dialog appears with inputs pre-filled with the series' current `name` and `total_works`

#### Scenario: Saving changes
- **WHEN** the user edits the name and submits the form
- **THEN** the series is updated via `PATCH /api/series/:slug` and the page refreshes with the new data

### Requirement: Work entries on Series Detail link to Work Detail
Each work entry on the Series Detail page SHALL be a link to `/works/:slug`.

#### Scenario: Clicking a work entry
- **WHEN** a user clicks a work entry on the Series Detail page
- **THEN** the browser navigates to `/works/{work.slug}`

### Requirement: Series Detail page shows empty state when no works are linked
When a series has no linked works, the page SHALL display an "No works in this series yet" empty state.

#### Scenario: Series with no linked works and no total_works
- **WHEN** a user navigates to `/series/empty-series` with no linked works and no `total_works`
- **THEN** the page displays "No works in this series yet"

#### Scenario: Series with no linked works but total_works set
- **WHEN** a user navigates to `/series/upcoming-series` with no linked works and `total_works: 5`
- **THEN** the page displays 5 placeholder rows labeled "Upcoming"
