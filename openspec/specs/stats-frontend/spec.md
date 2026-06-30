## Purpose

Define the read-only statistics dashboard UI at `/stats` that visualizes library composition, reading activity, and note statistics from the stats API.
## Requirements
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

The system SHALL provide a time range selector on the stats page with nine options, ordered shortest to longest: Today, This week, Last week, This month, Last month, This year, Last year, All time, and Custom. The default selection SHALL be This month. Today/This week/Last week/This month/Last month SHALL be computed from the browser's local clock with weeks starting Monday (ISO 8601) and sent as `from`/`to` parameters; This year/Last year SHALL be sent as `?year=`; All time SHALL be sent as `?year=all`; Custom SHALL reveal date inputs. Changing the selection SHALL refetch stats with the corresponding parameters.

#### Scenario: Default selection is This month

- **WHEN** the stats page first loads
- **THEN** "This month" is selected and stats are fetched for the first of the current month through now

#### Scenario: Today scopes to the current local day

- **WHEN** "Today" is selected
- **THEN** stats are fetched for a `from`/`to` range covering the user's current local day from 00:00 through the end of the day

#### Scenario: This week starts on Monday

- **WHEN** "This week" is selected
- **THEN** stats are fetched from the most recent Monday 00:00 (local) through now

#### Scenario: Last week is the previous Monday–Sunday

- **WHEN** "Last week" is selected
- **THEN** stats are fetched for the full previous Monday-through-Sunday week in local time

#### Scenario: This month and Last month

- **WHEN** "This month" is selected
- **THEN** stats are fetched from the 1st of the current month through now; and when "Last month" is selected, for the full previous calendar month

#### Scenario: This year and Last year use the year parameter

- **WHEN** "This year" is selected and the current year is 2026
- **THEN** stats are fetched with `?year=2026`; and "Last year" fetches `?year=2025`

#### Scenario: All time fetches unbounded stats

- **WHEN** "All time" is selected
- **THEN** stats are fetched with `?year=all`

#### Scenario: Custom reveals date inputs

- **WHEN** "Custom" is selected
- **THEN** two native date input fields appear and stats are refetched whenever both dates are filled and valid

### Requirement: Library snapshot section

The system SHALL display always-current library stats within the "Library & all-time" zone: metric cards for total works, editions, copies, an unread/TBR count, and percent of library read; and bar charts for breakdowns by format, status, condition, edition language, original language, genre, and series. The Works by Genre and Works by Series charts SHALL show at most the top 8 entries by count, with a "Show more"/"Show less" toggle revealing the remainder.

#### Scenario: Snapshot metric cards include unread and percent read

- **WHEN** the library has 12 works, 8 editions, 15 copies, `unread_count` 4, and `percent_read` 60
- **THEN** the zone shows cards for Works=12, Editions=8, Copies=15, Unread=4, and "60% read"

#### Scenario: Works by genre is capped at the top 8

- **WHEN** the library has 20 distinct genres
- **THEN** the Works by Genre chart initially shows the 8 highest-count genres and a "Show more" toggle; activating it reveals the rest and switches to "Show less"

#### Scenario: Works by series is capped at the top 8

- **WHEN** the library has more than 8 series
- **THEN** the Works by Series chart initially shows the top 8 with the same Show more/Show less toggle

#### Scenario: Few genres show no toggle

- **WHEN** the library has 5 genres
- **THEN** all 5 are shown and no Show more toggle appears

### Requirement: Reading stats section

The system SHALL display the range-scoped reading stats within the "This period" zone: metric cards for finished count, total pages read, and average pages per day; a copies-acquired figure; range-scoped horizontal bar charts for average rating by work and by author; and a reading-velocity bar chart of pages read over time within the range. The currently-reading count SHALL be presented as an always-current figure marked accordingly, not as a range-scoped period metric.

#### Scenario: Period metric cards show range-scoped values

- **WHEN** reading stats for the selected range include finished_count=5, total_pages_read=3200, avg_pages_per_day=23.5, copies_acquired=3
- **THEN** the "This period" zone shows these values with appropriate labels

#### Scenario: Reading velocity chart renders the time series

- **WHEN** `reading.pages_per_period` is `[{ period: "2025-03-01", pages: 40 }, { period: "2025-03-02", pages: 0 }, { period: "2025-03-03", pages: 55 }]`
- **THEN** a bar chart in the period zone shows pages per period along the range, in chronological order

#### Scenario: Currently reading is shown as always-current

- **WHEN** `currently_reading_count` is 2
- **THEN** it is displayed as an always-current figure with a "now" marker, visually distinct from the range-scoped period metrics

#### Scenario: Average rating charts reflect the range

- **WHEN** `avg_rating_by_work` returns range-scoped entries
- **THEN** horizontal bar charts show titles/authors with bars proportional to their average rating, sorted descending

#### Scenario: Reading section handles zero ratings gracefully

- **WHEN** no read-throughs are rated in the range
- **THEN** the average rating charts are empty with a note that no ratings exist yet

### Requirement: Notes stats section

The system SHALL display total notes and notes-per-month as range-scoped figures in the "This period" zone, and the most-annotated-works ranked list as an always-current figure in the "Library & all-time" zone.

#### Scenario: Range-scoped note figures appear in the period zone

- **WHEN** `notes.total_notes` is 42 and `notes.notes_per_month` has monthly counts for the range
- **THEN** the period zone shows a "Total Notes" card and a notes-per-month bar chart sorted chronologically

#### Scenario: Most-annotated works appear in the all-time zone

- **WHEN** `notes.most_annotated_works` returns ranked works
- **THEN** the "Library & all-time" zone shows a ranked list sorted by note count descending

#### Scenario: Most-annotated works empty state

- **WHEN** no notes exist in the library
- **THEN** the most-annotated works section shows a message indicating no notes have been written yet

### Requirement: Two-zone layout separating range-scoped and always-current stats

The system SHALL organize the stats page into two zones: a "This period" zone, placed directly below the time-range selector, containing every stat scoped to the selected range; and a "Library & all-time" zone below it containing always-current snapshot stats. Always-current cards SHALL carry a visible "now" marker (or equivalent visual treatment) distinguishing them from range-scoped stats.

#### Scenario: Period zone is above the snapshot zone

- **WHEN** the stats page renders with data
- **THEN** the range-scoped stats (finished, pages read, pages/day, acquired, ratings, velocity, notes in period) appear above the always-current stats (library totals, breakdowns, currently reading, unread/TBR, percent read, most-annotated)

#### Scenario: Always-current stats are visually distinguished

- **WHEN** an always-current stat (e.g. Currently Reading or Unread) is shown
- **THEN** it carries a "now" marker or distinct styling so the user can tell it is not affected by the selected time range

### Requirement: Chart and list click-through navigation

The system SHALL make eligible stats clickable, navigating to the relevant page: a genre bar SHALL link to `/library?genre=<normalized-genre>`, a series bar SHALL link to `/series/<slug>`, an average-rating-by-work bar and a most-annotated-works entry SHALL link to `/works/<slug>`, and an average-rating-by-author bar SHALL link to `/authors/<slug>`. Copy-attribute charts (format, status, condition, language) SHALL NOT be clickable in this change.

#### Scenario: Clicking a genre filters the library

- **WHEN** the user clicks the "science-fiction" bar in Works by Genre
- **THEN** the app navigates to `/library?genre=science-fiction` with the library filtered to works in that genre

#### Scenario: Clicking a series opens the series page

- **WHEN** the user clicks a series bar
- **THEN** the app navigates to that series' detail page at `/series/<slug>`

#### Scenario: Clicking a work or author opens its detail page

- **WHEN** the user clicks an average-rating-by-work bar or a most-annotated work
- **THEN** the app navigates to `/works/<slug>`; clicking an average-rating-by-author bar navigates to `/authors/<slug>`

#### Scenario: Copy-attribute charts are not clickable

- **WHEN** the user clicks a bar in Copies by Format, Status, Condition, or Language
- **THEN** no navigation occurs

