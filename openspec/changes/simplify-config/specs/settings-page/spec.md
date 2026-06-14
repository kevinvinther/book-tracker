## MODIFIED Requirements

### Requirement: Settings page
The client SHALL have a Settings page accessible at `/settings` that displays the current library path in a read-only field, indicating that it is set via the `BOOKTRACKER_LIBRARY_PATH` environment variable.

#### Scenario: Navigate to Settings
- **WHEN** the user navigates to `/settings`
- **THEN** the Settings page loads and displays the current `library_path`

#### Scenario: Settings page fetches current config
- **WHEN** the Settings page mounts
- **THEN** it calls `GET /api/config` and displays the current `library_path`
- **AND** shows a note that the path is controlled by the `BOOKTRACKER_LIBRARY_PATH` environment variable
