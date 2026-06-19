### Requirement: Start a new read-through

The system SHALL create a new read-through entry on a copy via `POST /api/copies/:slug/read-throughs`. A read-through is identified by its `started_date` within the copy's `read_throughs[]` array.

The created read-through SHALL have `status: "reading"`, the provided or default `started_date`, and an auto-created initial `page_log` entry with `page: 0` and `date` equal to `started_date`.

If another read-through on the same copy has `status: "reading"`, the system SHALL auto-pause it (set its status to `"paused"`) and include a `warning` in the response identifying the paused read-through.

The system SHALL NOT start a read-through on a copy with `status: "lent"`.

The response SHALL return the full updated Copy object.

#### Scenario: Basic start

- **WHEN** a `POST` is sent to `/api/copies/dune-ace-1990/read-throughs` with body `{ "started_date": "2025-06-01" }`
- **THEN** a new read-through is appended to the copy's `read_throughs[]` with `status: "reading"`, `started_date: "2025-06-01T00:00:00.000Z"`, and `page_log: [{ date: "2025-06-01T00:00:00.000Z", page: 0 }]`

#### Scenario: Server defaults started_date to today

- **WHEN** a `POST` is sent to `/api/copies/dune-ace-1990/read-throughs` with an empty body `{}`
- **THEN** a new read-through is created with `started_date` set to today's date

#### Scenario: Auto-pause existing active read-through

- **WHEN** a copy has a read-through with `status: "reading"` and `started_date: "2025-03-01"`
- **AND** a `POST` is sent to start a new read-through
- **THEN** the existing read-through is set to `status: "paused"`
- **AND** the response includes `warning: "Paused existing active read-through started on 2025-03-01"`

#### Scenario: Block read-through on lent copy

- **WHEN** a copy has `status: "lent"`
- **AND** a `POST` is sent to start a new read-through
- **THEN** the response is `400` with an error message indicating the copy is lent

#### Scenario: Copy not found

- **WHEN** a `POST` is sent to `/api/copies/nonexistent/read-throughs`
- **THEN** the response is `404` with an error message

---

### Requirement: Log a page count

The system SHALL append a page log entry to an active read-through via `POST /api/copies/:slug/read-throughs/:startedDate/log`.

The page number SHALL be ≥ the last logged page in the read-through. If the edition has a known `page_count`, the page SHALL also be ≤ that value.

If `page_count` is unknown (the Edition has no `page_count` field), the upper bound check SHALL be skipped and the response SHALL include a `warning`.

When the logged page equals the edition's `page_count` and `page_count` is known, the response SHALL include `finished: true` to signal that the frontend may prompt the user to mark the read-through as finished.

The `date` for the page log entry SHALL default to today if not provided by the client.

#### Scenario: Basic page log

- **WHEN** a `POST` is sent to `/api/copies/dune-ace-1990/read-throughs/2025-06-01/log` with body `{ "page": 104 }`
- **AND** the edition has `page_count: 604`
- **THEN** a new entry `{ date: "<today>", page: 104 }` is appended to the read-through's `page_log`
- **AND** `finished` is not in the response (or is `false`)

#### Scenario: Page reaches edition page_count

- **WHEN** a `POST` is sent with `{ "page": 604 }`
- **AND** the edition has `page_count: 604`
- **THEN** the response includes `finished: true`

#### Scenario: Page below last entry

- **WHEN** the last logged page is `104`
- **AND** a `POST` is sent with `{ "page": 50 }`
- **THEN** the response is `400` with an error message

#### Scenario: Page exceeds edition page_count

- **WHEN** the edition has `page_count: 604`
- **AND** a `POST` is sent with `{ "page": 700 }`
- **THEN** the response is `400` with an error message

#### Scenario: Edition has no page_count

- **WHEN** the edition has no `page_count` field
- **AND** a `POST` is sent with `{ "page": 312 }`
- **THEN** the entry is accepted
- **AND** the response includes `warning` indicating `page_count` is unknown

#### Scenario: Read-through not found

- **WHEN** a `POST` is sent to `/api/copies/dune-ace-1990/read-throughs/2020-01-01/log`
- **AND** no read-through with `started_date: "2020-01-01"` exists on that copy
- **THEN** the response is `404`

#### Scenario: Read-through is not active

- **WHEN** the read-through has `status: "finished"`
- **AND** a `POST` is sent to log a page
- **THEN** the response is `400` with an error message

---

### Requirement: Change read-through status

The system SHALL change a read-through's status via `PATCH /api/copies/:slug/read-throughs/:startedDate` with a `status` field in the body.

Valid transitions:
- **`finished`**: Sets `finished_date` (default today, overridable). Accepts optional `rating` (0.0–10.0). SHALL only succeed if `page_count` is unknown or the page log already contains a `page == page_count` entry.
- **`dnf`**: Sets `finished_date` (default today, overridable). Accepts optional `page` — if provided, appends a final page log entry with that page and `date: finished_date`.
- **`paused`**: Sets `status` to `"paused"` with no side effects.
- **`resumed`**: Sets `status` to `"reading"`. If another read-through on the same copy is `reading`, auto-pauses it (same as starting a new read-through).

#### Scenario: Finish with rating

- **WHEN** a `PATCH` is sent to `/api/copies/dune-ace-1990/read-throughs/2025-06-01` with body `{ "status": "finished", "rating": 9.0, "finished_date": "2025-08-15" }`
- **THEN** the read-through has `status: "finished"`, `rating: 9.0`, `finished_date: "2025-08-15T00:00:00.000Z"`

#### Scenario: Finish requires page == page_count

- **WHEN** the edition has `page_count: 604`
- **AND** the last page log entry has `page: 400`
- **AND** a `PATCH` is sent with `{ "status": "finished" }`
- **THEN** the response is `400` with an error message

#### Scenario: DNF with final page

- **WHEN** a `PATCH` is sent with `{ "status": "dnf", "page": 312, "finished_date": "2025-07-01" }`
- **THEN** the read-through has `status: "dnf"`, `finished_date: "2025-07-01T00:00:00.000Z"`
- **AND** a new page log entry `{ date: "2025-07-01T00:00:00.000Z", page: 312 }` is appended

#### Scenario: DNF without page

- **WHEN** a `PATCH` is sent with `{ "status": "dnf", "finished_date": "2025-07-01" }`
- **THEN** the read-through has `status: "dnf"`, `finished_date: "2025-07-01T00:00:00.000Z"`
- **AND** no new page log entry is appended

#### Scenario: Pause

- **WHEN** a `PATCH` is sent with `{ "status": "paused" }`
- **THEN** the read-through has `status: "paused"`

#### Scenario: Resume with auto-pause

- **WHEN** a copy has read-through A with `status: "reading"`
- **AND** read-through B is paused
- **AND** a `PATCH` is sent to resume read-through B with `{ "status": "resumed" }`
- **THEN** read-through B has `status: "reading"`
- **AND** read-through A has `status: "paused"`
- **AND** the response includes a `warning` about the auto-paused read-through

#### Scenario: Invalid status transition

- **WHEN** a `PATCH` is sent with `{ "status": "invalid" }`
- **THEN** the response is `400` with an error message

#### Scenario: Read-through not found

- **WHEN** a `PATCH` is sent to `/api/copies/dune-ace-1990/read-throughs/2020-01-01`
- **AND** no read-through with that `started_date` exists
- **THEN** the response is `404`

---

### Requirement: Edit a page log entry

The system SHALL edit an existing page log entry via `PATCH /api/copies/:slug/read-throughs/:startedDate/entries/:date`.

Both `date` and `page` fields in the request body SHALL be supported. After updating, the `page_log` array SHALL be re-sorted by date ascending, then validated for page monotonicity (each entry's page ≥ the previous entry's page).

#### Scenario: Edit page number

- **WHEN** a `PATCH` is sent to `/api/copies/dune-ace-1990/read-throughs/2025-06-01/entries/2025-06-10` with body `{ "page": 150 }`
- **THEN** the entry at date `2025-06-10` has `page: 150`

#### Scenario: Edit date

- **WHEN** a `PATCH` is sent with `{ "date": "2025-06-12" }`
- **THEN** the entry is updated to date `2025-06-12` and re-sorted

#### Scenario: Monotonicity violation after edit

- **WHEN** the page log is `[{ date: "A", page: 0 }, { date: "B", page: 147 }, { date: "C", page: 312 }]`
- **AND** entry B is edited to `page: 400`
- **THEN** the response is `400` because entry C has `page: 312` which is less than B's new `page: 400`

#### Scenario: Entry not found

- **WHEN** a `PATCH` is sent to an entry date that does not exist in the page log
- **THEN** the response is `404`

---

### Requirement: Delete a page log entry

The system SHALL delete a page log entry via `DELETE /api/copies/:slug/read-throughs/:startedDate/entries/:date`.

After deletion, the remaining entries SHALL be validated for page monotonicity. If the deletion creates a gap (e.g., removing the middle entry from `[0, 147, 312]` leaving `[0, 312]`), this is valid as long as pages remain non-decreasing.

The entry with `page: 0` at position 0 SHALL not be deletable — it is the baseline entry.

#### Scenario: Delete middle entry

- **WHEN** a `DELETE` is sent for the entry at date `2025-06-15` from a page log `[{ page: 0 }, { page: 147 }, { page: 312 }]`
- **THEN** the page log becomes `[{ page: 0 }, { page: 312 }]`
- **AND** the response is `200`

#### Scenario: Monotonicity violation after delete

- **WHEN** the page log is `[{ page: 0 }, { page: 50 }, { page: 100 }]`
- **AND** the entry at date (page 50) was placed before page 0 due to date re-sorting
- **AND** deleting an entry creates an out-of-order sequence
- **THEN** the response is `400`

#### Scenario: Delete baseline entry

- **WHEN** a `DELETE` is sent for the first entry (`page: 0`) in the page log
- **THEN** the response is `400` with an error message

#### Scenario: Entry not found

- **WHEN** a `DELETE` is sent for a date that does not exist in the page log
- **THEN** the response is `404`

---

### Requirement: Delete an entire read-through

The system SHALL delete a read-through via `DELETE /api/copies/:slug/read-throughs/:startedDate`.

The entire read-through entry SHALL be removed from the copy's `read_throughs[]` array.

#### Scenario: Delete read-through

- **WHEN** a `DELETE` is sent to `/api/copies/dune-ace-1990/read-throughs/2025-06-01`
- **THEN** the read-through with `started_date: "2025-06-01"` is removed from the copy's `read_throughs[]`
- **AND** the response returns the full updated Copy object

#### Scenario: Read-through not found

- **WHEN** a `DELETE` is sent for a `started_date` that does not exist on the copy
- **THEN** the response is `404`
