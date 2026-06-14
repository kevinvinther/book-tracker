# settings-page Specification

## Purpose
Client settings page for viewing and editing the library path

## Requirements

### Requirement: Settings page
The client SHALL have a Settings page accessible at `/settings` that allows the user to view and edit the library path.

#### Scenario: Navigate to Settings
- **WHEN** the user navigates to `/settings`
- **THEN** the Settings page loads and displays the current `library_path` in a text input

#### Scenario: Settings page fetches current config
- **WHEN** the Settings page mounts
- **THEN** it calls `GET /api/config` and populates the input field with the current `library_path`

#### Scenario: Update library path
- **WHEN** the user edits the library path input and submits the form
- **THEN** the client calls `PATCH /api/config` with the new path
- **AND** displays a success confirmation

#### Scenario: Empty library path
- **WHEN** the user submits an empty library path
- **THEN** the client shows a validation error and does not submit

### Requirement: Navigation to Settings
The application shell SHALL include a navigation link to the Settings page.

#### Scenario: Settings link visible
- **WHEN** the application renders on any page
- **THEN** a link or button labeled "Settings" is visible in the header
- **AND** clicking it navigates to `/settings`
