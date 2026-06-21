## ADDED Requirements

### Requirement: Production image is built without dev tooling or source mounts

The production image SHALL be produced by a multi-stage build that compiles the server with `tsc` and builds the client with `vite build`, and whose runtime stage contains only the compiled output, the built client assets, and production dependencies. The runtime SHALL run the compiled server with `node` and SHALL NOT run a file-watcher, `tsx`, the Vite dev server, or rely on host source mounts.

#### Scenario: Building the production image

- **WHEN** the production image target is built
- **THEN** the build runs `vite build` and `tsc`, and the resulting runtime stage starts the server via `node dist/index.js`

#### Scenario: Runtime contains no development dependencies

- **WHEN** the production runtime stage is assembled
- **THEN** only production dependencies are installed and no `tsx`/watch process is started

### Requirement: Server provides build and start scripts

The server package SHALL provide a `build` script that compiles TypeScript to `dist/` and a `start` script that runs the compiled entry point with `node`.

#### Scenario: Compiling the server

- **WHEN** the server `build` script runs
- **THEN** TypeScript is compiled to `dist/` with no errors

#### Scenario: Starting the compiled server

- **WHEN** the server `start` script runs
- **THEN** it executes `node dist/index.js` and the server begins listening

### Requirement: Listening port is configurable via environment

The server SHALL read its listening port from the `PORT` environment variable and SHALL default to `3001` when the variable is unset.

#### Scenario: Default port

- **WHEN** the server starts with no `PORT` set
- **THEN** it listens on port `3001`

#### Scenario: Overridden port

- **WHEN** the server starts with `PORT` set to a value
- **THEN** it listens on that port

### Requirement: Server shuts down gracefully on termination signals

On receiving `SIGTERM` or `SIGINT`, the server SHALL close the HTTP server, the WebSocket server, and the file watcher, then exit. If graceful close does not complete within a bounded time, the process SHALL force-exit so shutdown never hangs.

#### Scenario: Clean shutdown on SIGTERM

- **WHEN** the running server receives `SIGTERM`
- **THEN** it closes the HTTP server, the WebSocket server, and the file watcher, then exits

#### Scenario: Shutdown does not hang

- **WHEN** a resource fails to close within the bounded timeout during shutdown
- **THEN** the process force-exits rather than hanging indefinitely
