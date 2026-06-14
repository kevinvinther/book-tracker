# app-config Specification

## Purpose
Persistent application configuration with a configurable library path
## Requirements
### Requirement: Read config via API
The system SHALL expose `GET /api/config` that returns the current library path. The path SHALL come from the `BOOKTRACKER_LIBRARY_PATH` environment variable if set, otherwise default to `~/book-tracker-data/`. No config file is read.

#### Scenario: Environment variable is set
- **WHEN** `BOOKTRACKER_LIBRARY_PATH=/data` and a GET request is made to `/api/config`
- **THEN** the server responds with HTTP 200 and `{ "library_path": "/data" }`

#### Scenario: Environment variable is not set
- **WHEN** `BOOKTRACKER_LIBRARY_PATH` is not set and a GET request is made to `/api/config`
- **THEN** the server responds with HTTP 200 and `{ "library_path": "~/book-tracker-data/" }`

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

### Requirement: Environment variables are loaded from .env file
The server SHALL load environment variables from a `.env` file in the project root at startup using `dotenv`. A `.env.example` file SHALL be provided documenting the `BOOKTRACKER_LIBRARY_PATH` variable. The `.env` file SHALL be gitignored. The default library path SHALL be `./data/`, resolved relative to the project root.

#### Scenario: .env file is present
- **WHEN** a `.env` file exists in the project root with `BOOKTRACKER_LIBRARY_PATH=./data/`
- **THEN** `readConfig()` returns `{ "library_path": "./data/" }` and file operations resolve `./data/` to the absolute project-relative path

#### Scenario: .env file is absent
- **WHEN** no `.env` file exists and `BOOKTRACKER_LIBRARY_PATH` is not set in the environment
- **THEN** `readConfig()` returns `{ "library_path": "./data/" }`

