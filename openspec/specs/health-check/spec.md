# health-check Specification

## Purpose
Server health check endpoint for connectivity verification

## Requirements

### Requirement: Health check endpoint
The server SHALL expose a `GET /api/health` endpoint that returns a JSON response confirming the server is operational.

#### Scenario: Server is running
- **WHEN** a GET request is made to `/api/health`
- **THEN** the server responds with HTTP 200
- **AND** the response body is `{ "status": "ok" }`

#### Scenario: Server is not running
- **WHEN** a GET request is made to `/api/health` while the server is stopped
- **THEN** the request fails with a connection error

### Requirement: Client connectivity verification
The client SHALL call `GET /api/health` when the application first mounts and display the response to the user, proving the full frontend-to-backend roundtrip works.

#### Scenario: Health check succeeds
- **WHEN** the client mounts and the server is running
- **THEN** the client displays "OK" (or the server's status response) on the page
- **AND** the response is fetched from `/api/health` without errors

#### Scenario: Health check fails
- **WHEN** the client mounts and the server is not running
- **THEN** the client displays an error state indicating the server is unreachable
