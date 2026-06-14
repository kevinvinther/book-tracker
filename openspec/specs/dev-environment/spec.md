# dev-environment Specification

## Purpose
Monorepo development workflow with concurrent server and client
## Requirements
### Requirement: Monorepo with concurrent dev workflow
The project SHALL use a monorepo structure with `server/` and `client/` directories, and a root `package.json` that starts both services with a single `npm run dev` command.

#### Scenario: Developer starts both services
- **WHEN** the developer runs `npm run dev` from the project root
- **THEN** both the Express server and Vite dev server start concurrently
- **AND** server output and client output are both visible in the terminal

#### Scenario: Developer installs all dependencies
- **WHEN** the developer runs `npm install` from the project root
- **THEN** dependencies for both `server/` and `client/` are installed

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

### Requirement: Server package structure
The `server/` directory SHALL contain an Express application written in TypeScript, with a dev script using `tsx` for hot reload on file changes. The server SHALL have its own `tsconfig.json` targeting Node.js.

#### Scenario: Server starts on configured port
- **WHEN** the server dev script runs
- **THEN** the Express server listens on port 3001
- **AND** logs a startup message including the port number

### Requirement: Client package structure
The `client/` directory SHALL contain a Vite + React application written in TypeScript, with Tailwind CSS for styling and shadcn/ui for UI components. The client SHALL have its own `tsconfig.json` targeting the browser.

#### Scenario: Client starts on Vite default port
- **WHEN** the client dev script runs
- **THEN** the Vite dev server starts on port 5173
- **AND** the homepage renders without errors

### Requirement: API proxy in development
The Vite dev server SHALL proxy all requests to `/api/*` to the backend server at `http://localhost:3001` during development, avoiding CORS issues.

#### Scenario: Client calls backend API via proxy
- **WHEN** the client makes a fetch request to `/api/health`
- **THEN** the request is forwarded to `http://localhost:3001/api/health`
- **AND** the response returns to the client without CORS errors

#### Scenario: Proxy does not interfere with static assets
- **WHEN** the client loads `/src/main.tsx` or any non-API path
- **THEN** Vite serves the file directly without proxying to the backend

