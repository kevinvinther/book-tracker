## ADDED Requirements

### Requirement: Stats dashboard page at /stats

The system SHALL provide a read-only dashboard page at `/stats` that displays library composition, reading activity, and note statistics sourced from the existing `GET /api/stats` endpoint.

#### Scenario: Page is accessible from header navigation

- **WHEN** the user clicks the "Stats" link in the header
- **THEN** the browser navigates to `/stats` and the stats dashboard renders

#### Scenario: Page shows loading state while fetching

- **WHEN** the stats data is being fetched from the API
- **THEN** a loading indicator is displayed and no partial data is shown

#### Scenario: Page shows error state on fetch failure

- **WHEN** the stats API request fails
- **THEN** an error message is displayed explaining the failure

#### Scenario: Page shows empty state for empty library

- **WHEN** the library has no works, editions, or copies
- **THEN** all metric cards show zero and breakdown charts are empty

### Requirement: Stats data fetching hook

The system SHALL provide a `useStats` hook that fetches stats data from `GET /api/stats` with optional time range query parameters, and series data from `GET /api/series` for display name resolution.

#### Scenario: Hook fetches stats with year parameter

- **WHEN** `useStats({ year: 2025 })` is called
- **THEN** it fetches `/api/stats?year=2025` and returns the parsed response

#### Scenario: Hook fetches stats with custom date range

- **WHEN** `useStats({ from: "2025-01-01", to: "2025-03-31" })` is called
- **THEN** it fetches `/api/stats?from=2025-01-01&to=2025-03-31` and returns the parsed response

#### Scenario: Hook fetches all-time stats with no params

- **WHEN** `useStats()` is called with no range parameters
- **THEN** it fetches `/api/stats?year=all` and returns the parsed response

#### Scenario: Hook resolves series slugs to display names

- **WHEN** stats data contains `works_by_series: { "the-dark-tower": 2 }` and the series list includes `{ slug: "the-dark-tower", name: "The Dark Tower" }`
- **THEN** the hook resolves the series breakdown to show "The Dark Tower" instead of the slug

#### Scenario: Hook handles missing series gracefully

- **WHEN** stats data references a series slug that does not exist in the series list
- **THEN** the slug itself is shown as the display name

### Requirement: Time range selector

The system SHALL provide a time range selector on the stats page with four options: This Year, Last Year, All Time, and Custom. Changing the selection SHALL refetch stats data with the corresponding query parameters.

#### Scenario: Default selection is This Year

- **WHEN** the stats page first loads
- **THEN** "This Year" is selected and stats are fetched for the current calendar year

#### Scenario: This Year scopes to current calendar year

- **WHEN** "This Year" is selected and the current year is 2026
- **THEN** stats are fetched with `?year=2026`

#### Scenario: Last Year scopes to previous calendar year

- **WHEN** "Last Year" is selected and the current year is 2026
- **THEN** stats are fetched with `?year=2025`

#### Scenario: All Time fetches unbounded stats

- **WHEN** "All Time" is selected
- **THEN** stats are fetched with `?year=all`

#### Scenario: Custom reveals date input fields

- **WHEN** "Custom" is selected
- **THEN** two native date input fields (from and to) appear, and stats are refetched whenever both dates are filled and valid

#### Scenario: Custom date range passes from and to parameters

- **WHEN** "Custom" is selected with from=2025-03-01 and to=2025-06-30
- **THEN** stats are fetched with `?from=2025-03-01&to=2025-06-30`

### Requirement: Library snapshot section

The system SHALL display a library snapshot section containing metric cards for total works, editions, and copies, followed by bar charts for breakdowns by format, status, condition, edition language, original language, genre, and series.

#### Scenario: Metric cards show total counts

- **WHEN** the library has 12 works, 8 editions, and 15 copies
- **THEN** three metric cards display "12" labeled "Works", "8" labeled "Editions", and "15" labeled "Copies"

#### Scenario: Copies by format bar chart (from edition)

- **WHEN** copies link to editions with formats `paperback` (5), `hardcover` (3), and no format (2)
- **THEN** format is resolved from each copy's edition; a bar chart shows two bars: paperback=5, hardcover=3 (no-format editions are not rendered)

#### Scenario: Copies by status bar chart

- **WHEN** copies have statuses `owned` (10), `lent` (3), `lost` (1), `given-away` (1)
- **THEN** a bar chart shows bars for each status with their respective counts

#### Scenario: Copies by language bar chart (from edition)

- **WHEN** copies link to editions with `language: "en"` (6) and `language: "de"` (2)
- **THEN** language is resolved from each copy's edition; a bar chart labeled "Copies by Language" shows "English"=6 and "German"=2

#### Scenario: Works by genre bar chart

- **WHEN** works have genres including `fiction` (5) and `classic` (3)
- **THEN** a bar chart shows genre counts; a work with multiple genres contributes to each

#### Scenario: Works by original language bar chart resolves ISO codes

- **WHEN** works have `original_language: "en"` (8) and `original_language: "fr"` (3)
- **THEN** a bar chart labeled "Works by Original Language" shows "English"=8 and "French"=3

#### Scenario: Works by series bar chart resolves slugs

- **WHEN** works reference series "the-dark-tower" (4) and "lotr" (3)
- **THEN** a bar chart shows "The Dark Tower"=4 and "The Lord of the Rings"=3 (using resolved names)

### Requirement: Reading stats section

The system SHALL display a reading stats section containing metric cards for finished count, currently reading count, total pages read, average pages per day, and copies acquired, followed by horizontal bar charts for average rating by work and by author.

#### Scenario: Reading metric cards show computed values

- **WHEN** reading stats include finished_count=5, currently_reading_count=2, total_pages_read=3200, avg_pages_per_day=23.5, copies_acquired=3
- **THEN** five metric cards display these values with appropriate labels

#### Scenario: Average rating by work horizontal bar chart

- **WHEN** `avg_rating_by_work` returns [{ slug: "dune", title: "Dune", avg_rating: 9.0 }, { slug: "foundation", title: "Foundation", avg_rating: 7.5 }]
- **THEN** a horizontal bar chart shows "Dune" with bar at 9.0 and "Foundation" at 7.5, sorted by rating descending

#### Scenario: Average rating by author horizontal bar chart

- **WHEN** `avg_rating_by_author` returns [{ slug: "herbert", name: "Frank Herbert", avg_rating: 9.0 }]
- **THEN** a horizontal bar chart shows author names with bars proportional to their average rating

#### Scenario: Reading section handles zero ratings gracefully

- **WHEN** no read-throughs have ratings
- **THEN** the average rating charts are empty with a note that no ratings exist yet

### Requirement: Notes stats section

The system SHALL display a notes section containing a metric card for total notes, a bar chart for notes per month, and a ranked list of most-annotated works.

#### Scenario: Total notes metric card

- **WHEN** `notes.total_notes` is 42
- **THEN** a metric card displays "42" labeled "Total Notes"

#### Scenario: Notes per month bar chart

- **WHEN** `notes.notes_per_month` is { "2025-01": 5, "2025-02": 8, "2025-03": 3 }
- **THEN** a bar chart shows month labels on X axis and note counts on Y axis, sorted chronologically

#### Scenario: Most-annotated works ranked list

- **WHEN** `notes.most_annotated_works` returns [{ title: "Dune", note_count: 7 }, { title: "Foundation", note_count: 4 }]
- **THEN** a ranked list shows "#1 Dune — 7 notes", "#2 Foundation — 4 notes", sorted by note count descending

#### Scenario: Most-annotated works empty state

- **WHEN** no notes exist in the library
- **THEN** the most-annotated works section shows a message indicating no notes have been written yet
