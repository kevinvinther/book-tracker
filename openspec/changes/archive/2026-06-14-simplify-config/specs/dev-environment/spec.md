## MODIFIED Requirements

### Requirement: Docker Compose development environment
The project SHALL include a root `docker-compose.yml` and per-service `Dockerfile`s so that a developer can run the full stack with `docker compose up` without installing Node.js locally. The server service SHALL mount `./.env:/app/.env` so the container reads the same configuration as local development. `./data/` SHALL be mounted to `/data` for the default library path. No `BOOKTRACKER_LIBRARY_PATH` SHALL be hardcoded in the Compose file — the `.env` file is the single source of truth for both Docker and local dev.

#### Scenario: Developer starts containers
- **WHEN** the developer runs `docker compose up` from the project root
- **THEN** both the server and client containers start
- **AND** source directories are bind-mounted for live reload
- **AND** `.env` from the project root is mounted into the server container
- **AND** `./data/` on the host is mounted to `/data` inside the server container
- **AND** `node_modules/` uses a named volume inside each container

#### Scenario: Library path is read from .env
- **WHEN** `.env` contains `BOOKTRACKER_LIBRARY_PATH=~/my-library/`
- **THEN** the server inside Docker uses `~/my-library/` as the library path (resolved inside the container)
- **AND** to make this path visible on the host, the user adds a matching volume mount to `docker-compose.yml`

#### Scenario: No .env file present
- **WHEN** no `.env` file exists in the project root
- **THEN** the server uses the default `./data/` (resolved to `/data` inside the container, mounted from `./data/` on the host)
