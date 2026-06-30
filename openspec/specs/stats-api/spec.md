## Purpose

Define the REST API that computes categorized library, reading, and note statistics from the in-memory index.
## Requirements
### Requirement: Endpoint returns categorized library, reading, and note statistics

The system SHALL provide `GET /api/stats` that computes statistics from the in-memory index and returns them in a `{ library, reading, notes }` categorized JSON response. No disk reads SHALL occur during computation.

#### Scenario: Empty library returns zero counts

- **WHEN** a request is made with an empty index
- **THEN** the response contains `library.total_works: 0`, empty breakdown maps (`{}`), `reading.finished_count: 0`, `notes.total_notes: 0`, and empty result lists (`[]`)

#### Scenario: Response includes effective date range

- **WHEN** a request specifies a year or custom date range
- **THEN** the response includes a `range` object with `from` and `to` date strings

### Requirement: Time range scoping via query parameters

The system SHALL accept three mutually-exclusive scoping patterns: `?year=2025` scopes to that calendar year (Jan 1 – Dec 31 UTC), `?from=...&to=...` scopes to a custom range, and `?year=all` (or no params) applies no date filter. The `to` bound SHALL be inclusive of the entire end day: a date-only `to` (`YYYY-MM-DD`) resolves to `23:59:59.999Z` of that day, while a date-only `from` resolves to `00:00:00.000Z`. Full ISO-8601 timestamps in `from`/`to` SHALL be honored as given. A range whose resolved `from` equals its resolved `to` SHALL be computed normally (no stats are skipped).

#### Scenario: Year parameter scopes to calendar year

- **WHEN** `?year=2025` is provided
- **THEN** the effective range is `2025-01-01` to `2025-12-31` and only entities or events within that range are counted

#### Scenario: Custom from/to range is inclusive of the end day

- **WHEN** `?from=2025-01-01&to=2025-03-31` is provided
- **THEN** the effective range runs from `2025-01-01T00:00:00.000Z` through `2025-03-31T23:59:59.999Z`, and events on March 31 are counted

#### Scenario: Single-day range counts that day's activity

- **WHEN** `?from=2025-03-15&to=2025-03-15` is provided and a read-through logged pages on 2025-03-15
- **THEN** the resolved range is `2025-03-15T00:00:00.000Z` through `2025-03-15T23:59:59.999Z`, and that day's reading stats are included (not skipped)

#### Scenario: Full ISO timestamps are honored

- **WHEN** `?from=2025-03-01T00:00:00.000Z&to=2025-03-07T23:59:59.999Z` is provided
- **THEN** the effective range is exactly those timestamps

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

The system SHALL compute and return library-level counts: total works, total editions, total copies, copies broken down by format, copies broken down by status, copies broken down by condition, works broken down by genre, works broken down by original language, and works broken down by series. When computing `works_by_genre`, each genre from every Work SHALL be normalized via `normalizeGenre` before being counted, so that pre-existing non-normalized genres (e.g., "Science Fiction") are merged with their normalized form (e.g., "science-fiction").

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

#### Scenario: Works by genre normalizes on read

- **WHEN** one work has genres `["Science Fiction"]` and another has `["science-fiction"]`
- **THEN** `works_by_genre` contains `"science-fiction": 2` (not two separate entries)

#### Scenario: Works by genre handles mixed formats

- **WHEN** one work has genres `["Fiction"]`, another has `["fiction"]`, and a third has `["  science fiction  "]`
- **THEN** `works_by_genre` contains `"fiction": 2` and `"science-fiction": 1` after normalization

#### Scenario: Works by series only counts works with a series link

- **WHEN** 3 works exist, 2 link to series "the-dark-tower", 1 has no series
- **THEN** `works_by_series` is `{ "the-dark-tower": 2 }`

### Requirement: Reading statistics

The system SHALL compute and return reading stats: number of read-throughs finished in the range (status `finished` only), number of read-throughs currently in progress (`status: reading`, always unfiltered by range), total pages read (sum of page deltas whose log date falls in the range), average pages per calendar day, average rating per work, average rating per author, number of copies acquired in the range, and a pages-read time series for the range.

Average pages per day SHALL be `total_pages_read` divided by the number of calendar days in the effective range, where the day count is bounded so it never extends past today: for a range with an explicit `to`, the count runs from `from` to `min(to, end-of-today)`; for `?year=all` (no range), the count runs from the earliest reading activity (earliest `page_log` entry date, falling back to earliest `started_date`) to today. The day count SHALL be at least 1 to avoid division by zero, and the result SHALL be rounded to one decimal place.

Average rating per work and per author SHALL be scoped to the range: only read-throughs whose `finished_date` falls within the effective range contribute. Under `?year=all`, all rated read-throughs contribute.

#### Scenario: Finished count only includes status=finished with finished_date in range

- **WHEN** a copy has one read-through with `status: finished` and `finished_date: 2025-03-15`, and `?year=2025` is requested
- **THEN** `reading.finished_count` is 1

#### Scenario: DNF does not count as finished

- **WHEN** a copy has one read-through with `status: dnf` and `finished_date: 2025-03-15`, and `?year=2025` is requested
- **THEN** `reading.finished_count` is 0

#### Scenario: Currently reading is unfiltered by date range

- **WHEN** a copy has a read-through with `status: reading` and `started_date: 2024-06-01`, and `?year=2025` is requested
- **THEN** `reading.currently_reading_count` is 1 (the active read-through is always "current" regardless of when it started)

#### Scenario: Total pages read sums deltas in range

- **WHEN** a read-through spanning 2024–2025 has page_log entries with dates in both years and `?year=2025` is requested
- **THEN** only page deltas from entries whose dates fall in 2025 are counted

#### Scenario: Pages per day divides by calendar days elapsed, not active days

- **WHEN** `?from=2025-01-01&to=2025-01-31` is requested (entirely in the past), 310 pages were read in that range, and the month has 31 days
- **THEN** `reading.avg_pages_per_day` is `10.0` (310 ÷ 31), regardless of how many distinct days had log entries

#### Scenario: Pages per day for a partially-elapsed range caps the denominator at today

- **WHEN** the current date is 2026-06-30, `?year=2026` is requested, and 1810 pages were read between Jan 1 and Jun 30
- **THEN** the denominator is the days from 2026-01-01 through 2026-06-30 (181 days), not the full 365-day year, and `reading.avg_pages_per_day` is approximately `10.0`

#### Scenario: Pages per day for all-time uses earliest activity as the baseline

- **WHEN** `?year=all` is requested and the earliest page-log entry across all read-throughs is dated 100 days ago, with 500 total pages read since
- **THEN** the denominator is 100 days and `reading.avg_pages_per_day` is approximately `5.0`

#### Scenario: Pages per day handles zero elapsed days

- **WHEN** the effective range resolves to a single day and pages were read that day
- **THEN** the denominator is at least 1 and no division-by-zero occurs

#### Scenario: Average rating is scoped to read-throughs finished in range

- **WHEN** work "dune" has one finished read-through rated 8.0 with `finished_date: 2024-05-01` and another rated 10.0 with `finished_date: 2025-05-01`, and `?year=2025` is requested
- **THEN** `reading.avg_rating_by_work` for "dune" reflects only the 2025 read-through (`avg_rating: 10.0`, `read_through_count: 1`)

#### Scenario: Average rating under all-time includes every rated read-through

- **WHEN** `?year=all` is requested and a work has two rated read-throughs (8.0 and 10.0)
- **THEN** `reading.avg_rating_by_work` for that work is `9.0` with `read_through_count: 2`

#### Scenario: Copies acquired in range

- **WHEN** copy has `acquisition_date: 2025-03-15` and `?year=2025` is requested
- **THEN** `reading.copies_acquired` includes that copy

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

### Requirement: Reading velocity time series

The system SHALL return `reading.pages_per_period`: an ordered array of `{ period, pages }` buckets summing page-log deltas whose dates fall within the effective range. Bucket granularity SHALL be derived from the range span — daily for spans up to ~62 days, weekly for spans up to ~1 year, and monthly for longer spans and for `?year=all`. Periods with zero pages MAY be included so the series is contiguous over the range.

#### Scenario: Daily buckets for a short range

- **WHEN** `?from=2025-03-01&to=2025-03-07` is requested and pages were logged on several of those days
- **THEN** `reading.pages_per_period` contains one entry per day with the summed page delta for that day

#### Scenario: Monthly buckets for all-time

- **WHEN** `?year=all` is requested spanning multiple years of activity
- **THEN** `reading.pages_per_period` is bucketed by month (`YYYY-MM`)

#### Scenario: Empty range yields an empty or zero-filled series

- **WHEN** no pages were logged in the effective range
- **THEN** `reading.pages_per_period` contains no positive values (either an empty array or zero-valued buckets)

### Requirement: Unread and percent-read snapshot

The system SHALL return `library.unread_count` and `library.percent_read`. `unread_count` SHALL be the number of copies whose status is `owned` or `lent` and that have zero read-throughs. `percent_read` SHALL be the share of works that have at least one `finished` read-through (across any of their copies) out of all works, as a number between 0 and 100; it SHALL be 0 when there are no works. Both figures are always-current snapshots and SHALL NOT be scoped by the date range.

#### Scenario: Unread count counts only in-possession, never-started copies

- **WHEN** a library has a copy with status `owned` and no read-throughs, a copy with status `lent` and no read-throughs, a copy with status `owned` that has a `paused` read-through, and a copy with status `sold` and no read-throughs
- **THEN** `library.unread_count` is 2 (the owned and lent never-started copies; the paused one has been started, the sold one is no longer possessed)

#### Scenario: Percent read reflects finished works

- **WHEN** the library has 4 works and 1 of them has a copy with a `finished` read-through
- **THEN** `library.percent_read` is 25

#### Scenario: Percent read with no works is zero

- **WHEN** the library has no works
- **THEN** `library.percent_read` is 0

#### Scenario: Unread and percent-read ignore the date range

- **WHEN** `?year=2025` is requested
- **THEN** `library.unread_count` and `library.percent_read` are computed over the whole library regardless of the range

