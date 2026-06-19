## ADDED Requirements

### Requirement: Endpoint returns categorized library, reading, and note statistics

The system SHALL provide `GET /api/stats` that computes statistics from the in-memory index and returns them in a `{ library, reading, notes }` categorized JSON response. No disk reads SHALL occur during computation.

#### Scenario: Empty library returns zero counts

- **WHEN** a request is made with an empty index
- **THEN** the response contains `library.total_works: 0`, empty breakdown maps (`{}`), `reading.finished_count: 0`, `notes.total_notes: 0`, and empty result lists (`[]`)

#### Scenario: Response includes effective date range

- **WHEN** a request specifies a year or custom date range
- **THEN** the response includes a `range` object with `from` and `to` date strings

### Requirement: Time range scoping via query parameters

The system SHALL accept three mutually-exclusive scoping patterns: `?year=2025` scopes to that calendar year (Jan 1 – Dec 31 UTC), `?from=2025-01-01&to=2025-03-31` scopes to a custom inclusive range, and `?year=all` (or no params) applies no date filter.

#### Scenario: Year parameter scopes to calendar year

- **WHEN** `?year=2025` is provided
- **THEN** the effective range is `2025-01-01` to `2025-12-31` and only entities or events within that range are counted

#### Scenario: Custom from/to range

- **WHEN** `?from=2025-01-01&to=2025-03-31` is provided
- **THEN** the effective range is the given inclusive dates

#### Scenario: Year=all applies no filter

- **WHEN** `?year=all` is provided or no date parameters are given
- **THEN** all entities and events across all time are counted

#### Scenario: Conflicting parameters return 400

- **WHEN** both `?year=2025` and `?from=...` are provided
- **THEN** the response is `400` with an error message

#### Scenario: Invalid date format returns 400

- **WHEN** `?from=not-a-date` is provided
- **THEN** the response is `400` with an error message

#### Scenario: from after to returns 400

- **WHEN** `?from=2025-12-31&to=2025-01-01` is provided
- **THEN** the response is `400` with an error message

### Requirement: Library snapshot statistics

The system SHALL compute and return library-level counts: total works, total editions, total copies, copies broken down by format, copies broken down by status, copies broken down by condition, works broken down by genre, works broken down by original language, and works broken down by series.

#### Scenario: Total counts reflect all entities

- **WHEN** the index has 5 works, 3 editions, and 4 copies
- **THEN** the response contains `library.total_works: 5`, `library.total_editions: 3`, `library.total_copies: 4`

#### Scenario: Copies by format breakdown

- **WHEN** copies have formats `paperback`, `hardcover`, `hardcover`
- **THEN** then `library.copies_by_format` is `{ "paperback": 1, "hardcover": 2 }`

#### Scenario: Copies with missing optional fields are handled

- **WHEN** a copy has no `format` field set
- **THEN** that copy is not counted in `copies_by_format` but is included in `total_copies`

#### Scenario: Works by genre counts work under each genre

- **WHEN** a work has genres `["fiction", "classic"]`
- **THEN** that work contributes 1 to both `fiction` and `classic` in `works_by_genre`

#### Scenario: Works by series only counts works with a series link

- **WHEN** 3 works exist, 2 link to series "the-dark-tower", 1 has no series
- **THEN** `works_by_series` is `{ "the-dark-tower": 2 }`

### Requirement: Reading statistics

The system SHALL compute and return reading stats: number of read-throughs finished in the range (status `finished` only), number of read-throughs currently in progress (`status: reading`), total pages read (sum of page deltas whose log date falls in the range), average pages per day (total pages / sum of active days per qualifying read-through in the range), average rating per work, average rating per author, and number of copies acquired in the range.

#### Scenario: Finished count only includes status=fixed with finished_date in range

- **WHEN** a copy has one read-through with `status: finished` and `finished_date: 2025-03-15`, and `?year=2025` is requested
- **THEN** `reading.finished_count` is 1

#### Scenario: DNF does not count as finished

- **WHEN** a copy has one read-through with `status: dnf` and `finished_date: 2025-03-15`, and `?year=2025` is requested
- **THEN** `reading.finished_count` is 0

#### Scenario: Finished_date outside range is excluded

- **WHEN** a read-through has `status: finished` and `finished_date: 2024-12-01`, and `?year=2025` is requested
- **THEN** `reading.finished_count` is 0

#### Scenario: Currently reading count

- **WHEN** 2 copies have a read-through with `status: reading`
- **THEN** `reading.currently_reading_count` is 2

#### Scenario: Currently reading is unfiltered by date range

- **WHEN** a copy has a read-through with `status: reading` and `started_date: 2024-06-01`, and `?year=2025` is requested
- **THEN** `reading.currently_reading_count` is 1 (the active read-through is always "current" regardless of when it started)

#### Scenario: Total pages read sums deltas in range

- **WHEN** a read-through spanning 2024–2025 has page_log entries with dates in both years and `?year=2025` is requested
- **THEN** only page deltas from entries whose dates fall in 2025 are counted

#### Scenario: Pages per day uses active days in range

- **WHEN** a read-through started 2025-01-10 and finished 2025-01-20 (10 active days) with 200 total pages read, and `?year=2025` is requested
- **THEN** `reading.avg_pages_per_day` is approximately `20.0`

#### Scenario: Pages per day handles zero active days

- **WHEN** no read-throughs have activity in the requested range
- **THEN** `reading.avg_pages_per_day` is `0`

#### Scenario: Average rating per work

- **WHEN** work "dune" has two finished read-throughs across its copies with ratings 8.0 and 10.0
- **THEN** `reading.avg_rating_by_work` includes `{ "slug": "dune", "title": "Dune", "avg_rating": 9.0, "read_through_count": 2 }`

#### Scenario: Average rating excludes unrated read-throughs

- **WHEN** a work has one read-through with rating 8.0 and one with no rating
- **THEN** the average rating is computed from only the rated read-through (8.0), and `read_through_count` reflects only rated read-throughs

#### Scenario: Copies acquired in range

- **WHEN** copy has `acquisition_date: 2025-03-15` and `?year=2025` is requested
- **THEN** `reading.copies_acquired` includes that copy

#### Scenario: Copies without acquisition_date are excluded

- **WHEN** a copy has no `acquisition_date` field
- **THEN** it is not counted in `copies_acquired`

### Requirement: Note statistics

The system SHALL compute and return note stats: total notes written in the range, notes grouped by month, and most-annotated works sorted by note count descending, capped by the `?limit=` parameter.

#### Scenario: Total notes in range

- **WHEN** 3 notes have `date` in 2025 and 2 have `date` in 2024, and `?year=2025` is requested
- **THEN** `notes.total_notes` is 3

#### Scenario: Notes per month grouped by YYYY-MM

- **WHEN** 2 notes have dates in January 2025 and 3 in February 2025, and `?year=2025` is requested
- **THEN** `notes.notes_per_month` is `{ "2025-01": 2, "2025-02": 3 }`

#### Scenario: Most annotated works sorted by count

- **WHEN** work "dune" has 5 notes and work "foundation" has 3 notes
- **THEN** `notes.most_annotated_works` has `dune` before `foundation`

#### Scenario: Most annotated works respects limit parameter

- **WHEN** 15 works have notes and `?limit=5` is provided
- **THEN** `notes.most_annotated_works` contains at most 5 entries

#### Scenario: Default limit is 10

- **WHEN** no `?limit=` parameter is provided and 15 works have notes
- **THEN** `notes.most_annotated_works` contains at most 10 entries

### Requirement: Read-through date range scoping

A read-through SHALL be considered within a date range if its activity window overlaps the range: `started_date ≤ rangeEnd` AND (`finished_date` is absent OR `finished_date ≥ rangeStart`).

#### Scenario: Read-through spanning before range

- **WHEN** a read-through started 2024-06-01, has no finished_date, and `?year=2025` is requested
- **THEN** the read-through is included (it overlaps the range)

#### Scenario: Read-through entirely before range

- **WHEN** a read-through started 2024-01-01, finished 2024-06-01, and `?year=2025` is requested
- **THEN** the read-through is excluded (activity window ends before range starts)

#### Scenario: Read-through entirely after range

- **WHEN** a read-through started 2026-01-01, and `?year=2025` is requested
- **THEN** the read-through is excluded (starts after range ends)

#### Scenario: Read-through entirely within range

- **WHEN** a read-through started 2025-03-01, finished 2025-06-01, and `?year=2025` is requested
- **THEN** the read-through is included
