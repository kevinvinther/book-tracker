# app-config Specification

## Purpose
Persistent application configuration with a configurable library path
## Requirements
### Requirement: Config file with library path
The system SHALL maintain a `.booktracker/config.yaml` file in the project root with a `library_path` field. The default value SHALL be `~/book-tracker-data/`.

#### Scenario: Config file does not exist on startup
- **WHEN** the server starts and `.booktracker/config.yaml` does not exist
- **THEN** the server creates the file with `library_path: ~/book-tracker-data/`

#### Scenario: Config file exists on startup
- **WHEN** the server starts and `.booktracker/config.yaml` already exists
- **THEN** the server reads and uses the existing `library_path` value

### Requirement: Read config via API
The system SHALL expose `GET /api/config` that returns the current configuration as JSON.

#### Scenario: Successful config read
- **WHEN** a GET request is made to `/api/config`
- **THEN** the server responds with HTTP 200 and a JSON body containing `library_path`

### Requirement: Update library path via API
The system SHALL expose `PATCH /api/config` that accepts a JSON body with `library_path` and updates the config file atomically.

#### Scenario: Valid library path update
- **WHEN** a PATCH request is made to `/api/config` with `{ "library_path": "/home/user/my-books" }`
- **THEN** the server writes the new value to `.booktracker/config.yaml`
- **AND** responds with HTTP 200 and the updated config

#### Scenario: Invalid library path update
- **WHEN** a PATCH request is made to `/api/config` with missing or empty `library_path`
- **THEN** the server responds with HTTP 400 and an error message

### Requirement: Library directory scaffold on startup
On server startup, the system SHALL read the config, resolve the `library_path`, and create the following directories if they do not already exist: `authors/`, `series/`, `works/`, `editions/`, `copies/`, `notes/`, `attachments/`, `.booktracker/cache/`.

#### Scenario: First launch with default path
- **WHEN** the server starts for the first time
- **THEN** the directory `~/book-tracker-data/` is created
- **AND** all eight subdirectories are created inside it

#### Scenario: Library path changed, new directories needed
- **WHEN** the library path is updated to a new location that has no directories
- **THEN** the server creates the full directory tree in the new location

#### Scenario: Directory tree already exists
- **WHEN** the server starts and all directories already exist
- **THEN** the server does not modify or overwrite any existing directories or files

### Requirement: Home directory expansion
The system SHALL resolve `~` in `library_path` to the current user's home directory before using the path for file operations.

#### Scenario: Path with tilde
- **WHEN** the config has `library_path: ~/book-tracker-data/`
- **THEN** the server resolves `~` to the user's home directory (e.g., `/home/kevin/book-tracker-data/`)

### Requirement: Environment variable overrides library path
The `readConfig` function SHALL check for a `BOOKTRACKER_LIBRARY_PATH` environment variable. When present, the configured `library_path` field SHALL be overridden with the environment variable's value, regardless of what is stored in `.booktracker/config.yaml`. When the environment variable is absent, the config file value SHALL be used as normal.

#### Scenario: Environment variable is set
- **WHEN** `BOOKTRACKER_LIBRARY_PATH=/data` is set in the environment and `readConfig()` is called
- **THEN** the returned config has `library_path: "/data"`, ignoring the config file value

#### Scenario: Environment variable is not set
- **WHEN** `BOOKTRACKER_LIBRARY_PATH` is not set and `readConfig()` is called
- **THEN** the returned config uses the value from `.booktracker/config.yaml`

