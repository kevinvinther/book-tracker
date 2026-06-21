## ADDED Requirements

### Requirement: Separate production Compose file

The repository SHALL provide a `docker-compose.prod.yml` distinct from the development `docker-compose.yml`. It SHALL build the production image, run with `NODE_ENV=production`, and SHALL NOT mount host source directories into the container. The existing development Compose file and workflow SHALL remain unchanged.

#### Scenario: Starting the production stack

- **WHEN** an operator runs `docker compose -f docker-compose.prod.yml up -d --build`
- **THEN** the production image is built and started with `NODE_ENV=production` and no source mounts

#### Scenario: Development workflow preserved

- **WHEN** an operator runs the existing `docker compose up --build`
- **THEN** the development setup behaves exactly as before this change

### Requirement: Data directory is mounted as a persistent volume

The production Compose SHALL mount the library data directory into the container so the markdown library persists across container restarts and rebuilds, with file ownership that lets the container read and write it.

#### Scenario: Data persists across restart

- **WHEN** the production container is restarted or rebuilt
- **THEN** the previously stored library data is still present and writable

### Requirement: Automatic restart policy

The production service SHALL be configured with a `restart: unless-stopped` policy so it recovers from crashes and host reboots without manual intervention.

#### Scenario: Recovery after crash

- **WHEN** the production container exits unexpectedly
- **THEN** the container runtime restarts it automatically

### Requirement: Container healthcheck

The production service SHALL define a healthcheck that probes the application's `/api/health` endpoint so the container's health is observable.

#### Scenario: Healthy container

- **WHEN** the server is running and `/api/health` returns `{ status: "ok" }`
- **THEN** the container's healthcheck reports healthy
