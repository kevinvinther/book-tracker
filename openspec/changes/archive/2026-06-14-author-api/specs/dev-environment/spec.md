## MODIFIED Requirements

### Requirement: Docker Compose development environment
The project SHALL include a root `docker-compose.yml` and per-service `Dockerfile`s so that a developer can run the full stack with `docker compose up` without installing Node.js locally. The server service SHALL set `BOOKTRACKER_LIBRARY_PATH=/data` and mount `./data/` (relative to the project root) to `/data` inside the container so library data persists on the host alongside the project.

#### Scenario: Developer starts containers
- **WHEN** the developer runs `docker compose up` from the project root
- **THEN** both the server and client containers start
- **AND** source directories are bind-mounted for live reload
- **AND** `./data/` on the host is mounted to `/data` inside the server container
- **AND** `node_modules/` uses a named volume inside each container

#### Scenario: Library data persists on host
- **WHEN** the server creates files in `/data/authors/` inside the container
- **THEN** those files are visible on the host at `./data/authors/` relative to the project root
