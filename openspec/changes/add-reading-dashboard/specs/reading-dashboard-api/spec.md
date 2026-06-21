## ADDED Requirements

### Requirement: Dashboard endpoint
The system SHALL expose `GET /api/dashboard` that returns, in a single response, the data for the reading dashboard: `currently_reading`, `recently_finished`, `recently_added`, and `glance`. The endpoint SHALL assemble this from the in-memory index without requiring additional client requests.

#### Scenario: Successful dashboard fetch
- **WHEN** a client sends `GET /api/dashboard`
- **THEN** the system responds 200 with a JSON object containing the keys `currently_reading`, `recently_finished`, `recently_added`, and `glance`

#### Scenario: Empty library
- **WHEN** the library contains no copies
- **THEN** `currently_reading`, `recently_finished`, and `recently_added` are empty arrays and every `glance` number is 0

### Requirement: Currently-reading selection and ordering
The `currently_reading` array SHALL contain one entry per read-through whose status is `reading` or `paused`. Entries with status `reading` SHALL be ordered before all entries with status `paused`. Within each status group, entries SHALL be ordered by most recent page-log activity (the date of the last `page_log` entry, falling back to `started_date`) descending. Read-throughs with status `finished` or `dnf` SHALL NOT appear.

Each entry SHALL include the copy slug, the read-through `started_date`, `status`, the full `page_log`, the last logged page, the edition `page_count` (null when unknown), the work (`slug`, `title`, `author`), and the cover identifier.

#### Scenario: Reading before paused
- **WHEN** the library has both a `reading` and a `paused` read-through
- **THEN** the `reading` entry appears before the `paused` entry in `currently_reading`

#### Scenario: Most recent activity first within a group
- **WHEN** two `reading` read-throughs differ in the date of their last page-log entry
- **THEN** the one with the more recent last entry appears first

#### Scenario: Finished and DNF excluded
- **WHEN** a copy has a `finished` read-through and a `dnf` read-through
- **THEN** neither appears in `currently_reading`

#### Scenario: Missing page count
- **WHEN** a currently-reading entry's edition has no `page_count`
- **THEN** the entry's `page_count` is null and the entry is still included

### Requirement: Recently-finished selection
The `recently_finished` array SHALL contain at most 6 read-throughs whose status is `finished`, ordered by `finished_date` descending. Each entry SHALL include the copy slug, `finished_date`, `rating` (when present), the work (`slug`, `title`, `author`), and the cover identifier.

#### Scenario: Limited to six, newest first
- **WHEN** the library has 8 finished read-throughs
- **THEN** `recently_finished` contains the 6 with the most recent `finished_date`, ordered newest first

#### Scenario: Rating included when present
- **WHEN** a finished read-through has a `rating`
- **THEN** its entry includes that rating

### Requirement: Recently-added selection
The `recently_added` array SHALL contain at most 6 copies, ordered by the copy's `created_at` descending. Each entry SHALL include the copy slug, `created_at`, the work (`slug`, `title`, `author`), and the cover identifier.

#### Scenario: Limited to six, newest first
- **WHEN** the library has 10 copies
- **THEN** `recently_added` contains the 6 copies with the most recent `created_at`, ordered newest first

### Requirement: Glance numbers
The `glance` object SHALL contain `finished_this_year`, `pages_this_month`, and `currently_reading`. `finished_this_year` SHALL count read-throughs with status `finished` whose `finished_date` falls in the current calendar year. `pages_this_month` SHALL sum page-log deltas dated within the current calendar month across all read-throughs. `currently_reading` SHALL equal the number of read-throughs with status `reading`.

#### Scenario: Finished this year
- **WHEN** three read-throughs were finished in the current calendar year and one in a prior year
- **THEN** `glance.finished_this_year` is 3

#### Scenario: Pages this month
- **WHEN** page-log entries in the current calendar month advance from page 100 to page 180 across a read-through
- **THEN** those advances contribute 80 to `glance.pages_this_month`

#### Scenario: Currently reading count
- **WHEN** two read-throughs have status `reading` and one has status `paused`
- **THEN** `glance.currently_reading` is 2
