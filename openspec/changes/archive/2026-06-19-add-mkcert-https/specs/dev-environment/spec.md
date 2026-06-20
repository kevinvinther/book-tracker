## ADDED Requirements

### Requirement: HTTPS with locally-trusted certificates

The project SHALL support HTTPS in the Vite dev server using `mkcert`-generated certificates that are trusted by the developer's operating system, eliminating browser certificate warnings on desktop. The project SHALL provide a `make certs` setup target that automates certificate generation.

#### Scenario: Developer sets up HTTPS certs for the first time

- **WHEN** the developer runs `make certs` from the project root
- **AND** `mkcert` is installed on the system
- **THEN** the system runs `mkcert -install` to trust the local CA (idempotent, skips if already trusted)
- **AND** the system generates `localhost.pem` (certificate) and `localhost-key.pem` (private key) into `client/.certs/`

#### Scenario: Developer starts HTTPS dev server with trusted certs

- **WHEN** the developer runs `npm run dev:https` (or `make dev-local-https`)
- **AND** `client/.certs/localhost.pem` and `client/.certs/localhost-key.pem` exist
- **THEN** the Vite dev server starts on `https://localhost:5173`
- **AND** the browser loads the page without certificate warnings

#### Scenario: Developer starts HTTPS dev server without certs (fallback)

- **WHEN** the developer runs `npm run dev:https`
- **AND** `client/.certs/` does not contain valid cert files
- **THEN** the system falls back to `@vitejs/plugin-basic-ssl` (self-signed certs)
- **AND** the system logs a warning suggesting the developer run `make certs`

#### Scenario: Docker Compose uses host certs via volume mount

- **WHEN** the developer has run `make certs` and runs `docker compose up`
- **THEN** `client/.certs/` on the host SHALL be mounted into the client container at `/app/certs/`
- **AND** the Vite dev server inside the container SHALL serve HTTPS using those certs
- **AND** no cert generation SHALL occur during Docker image build

#### Scenario: mkcert is not installed

- **WHEN** the developer runs `make certs`
- **AND** `mkcert` is not found on the system PATH
- **THEN** the `make certs` target SHALL print an error message with installation instructions
- **AND** the target SHALL exit with a non-zero status
