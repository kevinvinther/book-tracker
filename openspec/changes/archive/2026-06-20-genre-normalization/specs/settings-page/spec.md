## ADDED Requirements

### Requirement: Genre curation section

The Settings page SHALL include a "Genres" section with a textarea displaying the curated genre list (one genre per line), fetched from `GET /api/genres` on mount. A "Save Genres" button SHALL parse the textarea content as a newline-separated list, normalize each line, and send the result to `PATCH /api/genres`. The section SHALL be visually separated from the library path section.

#### Scenario: Genre section loads current curated list

- **WHEN** the Settings page mounts
- **THEN** the genre textarea is populated with the response from `GET /api/genres`, one genre per line

#### Scenario: Save edited genre list

- **WHEN** the user edits the textarea and clicks "Save Genres"
- **THEN** a PATCH request is sent to `/api/genres` with the parsed genre list
- **AND** a brief success toast or indicator is shown

#### Scenario: Empty genre list is valid

- **WHEN** the user clears the textarea and clicks "Save Genres"
- **THEN** the PATCH request sends an empty array and the curated list is cleared

#### Scenario: Network error on save

- **WHEN** the PATCH request fails
- **THEN** an error message is displayed to the user

#### Scenario: API load failure

- **WHEN** the `GET /api/genres` request fails on mount
- **THEN** the textarea is empty and the user can still type and save genres
