## ADDED Requirements

### Requirement: Dashboard at the home route
The system SHALL render a reading dashboard at the route `/`, fetched from `GET /api/dashboard`. The dashboard SHALL present, in order, a "Currently reading" section, a "Reading at a glance" strip, a "Recently finished" section, and a "Recently added" section.

#### Scenario: Dashboard renders at home
- **WHEN** the user navigates to `/`
- **THEN** the app fetches `GET /api/dashboard` and renders the currently-reading, glance, recently-finished, and recently-added sections in that order

#### Scenario: Live refresh after a change
- **WHEN** a copy, edition, work, or note changes (via the file-watcher change event)
- **THEN** the dashboard re-fetches `GET /api/dashboard` and updates its sections

### Requirement: Currently-reading cards
The "Currently reading" section SHALL render one card per entry in `currently_reading`. Each card SHALL show the cover, work title, and author, and SHALL link to the copy's detail page. When the entry has a `page_count`, the card SHALL show a progress bar reflecting `last_page / page_count`; when `page_count` is null, the card SHALL show the last page read instead of a progress bar. Cards for `paused` entries SHALL be visually de-emphasized (dimmed) and SHALL indicate the paused state.

#### Scenario: Progress bar when page count is known
- **WHEN** a currently-reading entry has `page_count` 300 and `last_page` 150
- **THEN** its card shows a progress bar at 50%

#### Scenario: Page shown when page count is unknown
- **WHEN** a currently-reading entry has a null `page_count` and `last_page` 142
- **THEN** its card shows "p. 142" (or equivalent) instead of a progress bar

#### Scenario: Paused card de-emphasized
- **WHEN** a currently-reading entry has status `paused`
- **THEN** its card is rendered dimmed and indicates it is paused

#### Scenario: Card links to copy detail
- **WHEN** the user clicks a currently-reading card (outside its inline actions)
- **THEN** the app navigates to that copy's detail page

### Requirement: Inline actions on currently-reading cards
Each currently-reading card SHALL let the user log a page, add a note, and — when the final page is reached — finish the read-through, without leaving the dashboard. Logging SHALL reuse the existing page-log form behavior, note-taking SHALL reuse the existing note editor (prefilled with the copy's active read-through and current page), and finishing SHALL reuse the existing finish flow. After any such action the dashboard SHALL reflect the change.

#### Scenario: Log a page from the dashboard
- **WHEN** the user logs a new page on a currently-reading card
- **THEN** the page is recorded against that read-through and the card's progress updates

#### Scenario: Add a note from the dashboard
- **WHEN** the user opens the note action on a currently-reading card
- **THEN** the note editor opens prefilled with the copy's active read-through and current page, and saving creates the note

#### Scenario: Finish from the dashboard
- **WHEN** the user logs the final page on a currently-reading card
- **THEN** the finish flow is offered inline, and completing it marks the read-through finished and removes the card from currently-reading on refresh

### Requirement: Reading at a glance
The dashboard SHALL display a glance strip showing "Finished this year", "Pages this month", and "Currently reading", using the `glance` values from the dashboard response.

#### Scenario: Glance values displayed
- **WHEN** the dashboard response has `glance` `{ finished_this_year: 12, pages_this_month: 430, currently_reading: 2 }`
- **THEN** the strip shows 12 finished this year, 430 pages this month, and 2 currently reading

### Requirement: Recently finished and recently added sections
The dashboard SHALL render up to 6 recently-finished entries (cover, title, author, rating when present) and up to 6 recently-added entries (cover, title, author). Each section SHALL be hidden entirely when its list is empty.

#### Scenario: Recently finished shown
- **WHEN** `recently_finished` has entries
- **THEN** the section renders a card per entry, showing the rating where present

#### Scenario: Empty recent sections hidden
- **WHEN** `recently_finished` (or `recently_added`) is empty
- **THEN** that section is not rendered

### Requirement: Dashboard empty states
When there are no currently-reading entries, the "Currently reading" section SHALL show an inviting empty state with a link to the library, rather than disappearing. When the library contains no books at all, the dashboard SHALL show a single welcoming empty state prompting the user to add their first book, in place of the per-section layout.

#### Scenario: No active reading
- **WHEN** `currently_reading` is empty but the library has books
- **THEN** the currently-reading section shows an empty state inviting the user to start a read-through, with a link to the library

#### Scenario: Brand-new library
- **WHEN** the library contains no books
- **THEN** the dashboard shows one welcoming "add your first book" state instead of the individual sections
