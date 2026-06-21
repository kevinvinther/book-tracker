# read-through-frontend Specification

## Purpose

Display and interaction layer for read-throughs on Copy Detail and Work Detail pages. Replaces placeholder sections with full interactive UI: status badges, page log tables, start/log/status-change actions, inline entry editing, undo, and delete.

## Requirements

### Requirement: Read-through list on Copy Detail
The Copy Detail page SHALL render each read-through in the copy's `read_throughs[]` array, ordered by `started_date` descending (most recent first). If `read_throughs` is empty or absent, the section SHALL display "No read-throughs yet."

#### Scenario: Copy with multiple read-throughs
- **WHEN** a copy has two read-throughs (one finished, one reading)
- **THEN** both read-throughs are displayed with the most recent first
- **AND** each shows a status badge, started date, and finished date (if present)

#### Scenario: Copy with no read-throughs
- **WHEN** a copy has no read-throughs
- **THEN** the section displays "No read-throughs yet."

### Requirement: Read-through status badge
Each read-through SHALL display a colored status badge indicating its current status: "Reading" (green), "Paused" (amber), "Finished" (muted), or "DNF" (muted). The badge SHALL be visually distinct from the copy ownership status badge (StatusStamp).

#### Scenario: Active read-through
- **WHEN** a read-through has `status: "reading"`
- **THEN** a green "Reading" badge is displayed

#### Scenario: Paused read-through
- **WHEN** a read-through has `status: "paused"`
- **THEN** an amber "Paused" badge is displayed

### Requirement: Page log table
Each read-through SHALL display a page log table showing all logged entries, sorted newest-first. The sort SHALL compare by date part (YYYY-MM-DD) descending, then by page number descending. Each row SHALL show: date (formatted for display), page number, % of edition page_count (or "—" if unknown), Δ pages from the entry below (or "—" if the entry below has a higher page or none exists), and Δ days from the entry below (or "—" for the last entry). Δ days SHALL use date part only for calculation.

#### Scenario: Edition with known page_count
- **WHEN** the edition has `page_count: 604` and a page log entry has `page: 147`
- **THEN** the row shows "24%" in the % column

#### Scenario: Edition without page_count
- **WHEN** the edition has no `page_count`
- **THEN** the % column shows "—" for all entries

#### Scenario: Delta calculations
- **WHEN** entry N-1 has page 50 and entry N has page 200
- **THEN** entry N shows "+150" in the Δ pages column

### Requirement: Log page count form
The active read-through (status: reading) SHALL show a "Log page count" form with a required page number input and an optional date input (defaults to today). The optional note field SHALL be omitted (deferred to the Notes feature). Submitting SHALL call `POST /api/copies/:slug/read-throughs/:startedDate/log`.

#### Scenario: Logging a page
- **WHEN** the user enters page 104 and submits
- **THEN** a POST is sent to `/api/copies/:slug/read-throughs/YYYY-MM-DD/log` with `{ page: 104 }`
- **AND** the page refreshes with the updated copy data

#### Scenario: Page below last entry
- **WHEN** the last logged page is 200 and the user enters 100
- **THEN** the API returns an error and the error message is displayed inline

### Requirement: Finished prompt
When the page log endpoint returns `{ finished: true }`, the UI SHALL display a dismissible inline banner: "You've reached the final page." with a button to open the finish modal. The explicit "Finish" action button SHALL remain available even when the banner is dismissed.

#### Scenario: Logging the final page
- **WHEN** the user logs page 604 on an edition with `page_count: 604`
- **AND** the API returns `{ finished: true }`
- **THEN** a banner appears with a "Mark as finished" button
- **AND** clicking the button opens the finish modal

### Requirement: Finish modal
The "Finish" action SHALL open a modal dialog collecting: rating (optional, number 0.0–10.0) and finished_date (optional, defaults to today). Submitting SHALL call `PATCH /api/copies/:slug/read-throughs/:startedDate` with `{ status: "finished", ... }`. The server SHALL auto-log the edition's `page_count` if the last logged page is below it, so the user does not need to log the final page manually.

#### Scenario: Finish with rating
- **WHEN** the user enters rating 9.0 and submits
- **THEN** a PATCH is sent with `{ status: "finished", rating: 9.0 }`
- **AND** if the last logged page was below edition page_count, a page_count entry is automatically added by the server

### Requirement: DNF action
The "DNF" action SHALL be available on active (reading) or paused read-throughs. Clicking SHALL open a form allowing the user to optionally enter a final page number and finished_date (defaults to today). Submitting SHALL call `PATCH .../read-throughs/:startedDate` with `{ status: "dnf", ... }`.

#### Scenario: DNF with final page
- **WHEN** the user enters page 312 and submits
- **THEN** a PATCH is sent with `{ status: "dnf", page: 312 }`

### Requirement: Pause and Resume actions
A "Pause" button SHALL be available on active (reading) read-throughs. A "Resume" button SHALL be available on paused read-throughs. Both SHALL call `PATCH .../read-throughs/:startedDate` with the corresponding status.

#### Scenario: Pause an active read-through
- **WHEN** the user clicks "Pause" on a reading read-through
- **THEN** a PATCH is sent with `{ status: "paused" }` and the page refreshes

#### Scenario: Resume a paused read-through
- **WHEN** the user clicks "Resume" on a paused read-through
- **AND** the response includes a `warning` about auto-pausing another read-through
- **THEN** the page refreshes and the warning is displayed to the user

### Requirement: Start new read-through form
A "Start new read-through" button SHALL be displayed above the read-through list. Clicking it SHALL show a form with an optional start_date field (defaults to today). Submitting SHALL call `POST /api/copies/:slug/read-throughs`. If the response includes a `warning` about auto-pausing an existing active read-through, the warning SHALL be displayed.

#### Scenario: Start with custom date
- **WHEN** the user enters a start_date of "2025-03-15" and submits
- **THEN** a POST is sent with `{ started_date: "2025-03-15" }`

#### Scenario: Start on a lent copy
- **WHEN** the copy has `status: "lent"`
- **THEN** the "Start new read-through" button SHALL be disabled with a message indicating the copy is lent

### Requirement: Inline edit of page log entries
Clicking a page log table row SHALL switch the row to edit mode, displaying the page number and date as editable inputs. Saving SHALL call `PATCH /api/copies/:slug/read-throughs/:startedDate/entries/:date`. The baseline entry (page: 0, first entry) SHALL NOT have a delete option.

#### Scenario: Edit page number inline
- **WHEN** the user clicks a row, changes page from 147 to 200, and confirms
- **THEN** a PATCH is sent with `{ page: 200 }`

#### Scenario: Edit date inline
- **WHEN** the user changes the date and confirms
- **THEN** a PATCH is sent with `{ date: "2025-06-15" }`

### Requirement: Delete page log entry
Each non-baseline page log entry SHALL have a delete button. Clicking it SHALL open a confirmation dialog. On confirmation, SHALL call `DELETE /api/copies/:slug/read-throughs/:startedDate/entries/:date`.

#### Scenario: Delete entry with confirmation
- **WHEN** the user clicks delete on a page log entry and confirms
- **THEN** a DELETE is sent and the page refreshes

### Requirement: Undo last entry shortcut
The active read-through section SHALL display an "Undo last entry" button that opens a confirmation dialog. On confirmation, SHALL delete the most recent page log entry via `DELETE /api/copies/:slug/read-throughs/:startedDate/entries/:date`.

#### Scenario: Undo last entry
- **WHEN** the user clicks "Undo last entry" and confirms
- **THEN** the most recent page log entry is deleted and the page refreshes

### Requirement: Delete entire read-through
Each read-through section SHALL display a delete button (or action in a dropdown). Clicking it SHALL open a confirmation dialog warning that all page log data for that read-through will be permanently removed. On confirmation, SHALL call `DELETE /api/copies/:slug/read-throughs/:startedDate`.

#### Scenario: Delete read-through with confirmation
- **WHEN** the user clicks delete on a read-through and confirms
- **THEN** a DELETE is sent and the page refreshes

### Requirement: CopyCard shows most recent read-through
On the Work Detail page, each CopyCard SHALL display the most recent read-through's status and page progress. If the copy has no read-throughs, nothing SHALL be added to the current display. The display format SHALL be:

- Active: "Reading · pg {page}/{page_count}"
- Paused: "Paused · pg {page}/{page_count}"
- Finished with rating: "Finished · ★ {rating}"
- Finished without rating: "Finished"
- DNF: "DNF"
- No read-throughs: nothing added

When the edition has no `page_count`, the "/{page_count}" portion SHALL be omitted.

#### Scenario: Copy with active read-through
- **WHEN** a copy has a most recent read-through with `status: "reading"` and last page 104 on an edition with 604 pages
- **THEN** the CopyCard shows "Reading · pg 104/604"

#### Scenario: Copy with finished read-through and rating
- **WHEN** a copy's most recent read-through has `status: "finished"` and `rating: 9.0`
- **THEN** the CopyCard shows "Finished · ★ 9.0"

#### Scenario: Copy with no read-throughs
- **WHEN** a copy has an empty or absent `read_throughs`
- **THEN** the CopyCard shows no additional read-through information
