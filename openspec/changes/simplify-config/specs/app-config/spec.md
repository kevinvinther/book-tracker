## ADDED Requirements

### Requirement: Environment variables are loaded from .env file
The server SHALL load environment variables from a `.env` file in the project root at startup using `dotenv`. A `.env.example` file SHALL be provided documenting the `BOOKTRACKER_LIBRARY_PATH` variable. The `.env` file SHALL be gitignored. The default library path SHALL be `./data/`, resolved relative to the project root.

#### Scenario: .env file is present
- **WHEN** a `.env` file exists in the project root with `BOOKTRACKER_LIBRARY_PATH=./data/`
- **THEN** `readConfig()` returns `{ "library_path": "./data/" }` and file operations resolve `./data/` to the absolute project-relative path

#### Scenario: .env file is absent
- **WHEN** no `.env` file exists and `BOOKTRACKER_LIBRARY_PATH` is not set in the environment
- **THEN** `readConfig()` returns `{ "library_path": "./data/" }`

## MODIFIED Requirements

### Requirement: Read config via API
The system SHALL expose `GET /api/config` that returns the current library path. The path SHALL come from the `BOOKTRACKER_LIBRARY_PATH` environment variable if set, otherwise default to `~/book-tracker-data/`. No config file is read.

#### Scenario: Environment variable is set
- **WHEN** `BOOKTRACKER_LIBRARY_PATH=/data` and a GET request is made to `/api/config`
- **THEN** the server responds with HTTP 200 and `{ "library_path": "/data" }`

#### Scenario: Environment variable is not set
- **WHEN** `BOOKTRACKER_LIBRARY_PATH` is not set and a GET request is made to `/api/config`
- **THEN** the server responds with HTTP 200 and `{ "library_path": "~/book-tracker-data/" }`

## REMOVED Requirements

### Requirement: Config file with library path
**Reason**: Config is now environment-variable-only. No `.booktracker/config.yaml` file is read or written.
**Migration**: Set `BOOKTRACKER_LIBRARY_PATH` environment variable instead. Docker Compose already does this. For local dev, the default `~/book-tracker-data/` is used.

### Requirement: Update library path via API
**Reason**: With no config file to persist to, the PATCH endpoint is removed. The library path is set exclusively via the `BOOKTRACKER_LIBRARY_PATH` environment variable and requires a restart to change.
**Migration**: Set `BOOKTRACKER_LIBRARY_PATH` in your environment or `docker-compose.yml`, then restart.
