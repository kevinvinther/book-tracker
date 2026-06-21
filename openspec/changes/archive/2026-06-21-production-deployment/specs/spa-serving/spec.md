## ADDED Requirements

### Requirement: Backend serves the built single-page app on the API origin

The server SHALL serve the client's production build (static assets and `index.html`) from the same origin and port as the API, so the application is reachable without a separate frontend server or proxy.

#### Scenario: Loading the app root

- **WHEN** a browser requests `GET /`
- **THEN** the server responds with the built `index.html`

#### Scenario: Fetching a hashed asset

- **WHEN** a browser requests a built asset path (e.g. `/assets/index-<hash>.js`)
- **THEN** the server responds with that static asset and its content type

### Requirement: SPA history fallback does not shadow the API

For non-`/api` requests that do not match a static asset, the server SHALL respond with `index.html` so client-side routing works on direct navigation and refresh; it SHALL NOT apply this fallback to any `/api` path.

#### Scenario: Direct navigation to a client route

- **WHEN** a browser requests a client-side route such as `GET /works/some-slug` that is not a static asset
- **THEN** the server responds with `index.html` (HTTP 200) and the client router renders the route

#### Scenario: Unknown API path still returns JSON

- **WHEN** a request is made to an unmatched `/api/...` path
- **THEN** the server responds with a JSON error (e.g. HTTP 404) and never serves `index.html`

#### Scenario: Existing API routes are unaffected

- **WHEN** a request is made to a registered API route (e.g. `GET /api/health` or `GET /api/attachments/<file>`)
- **THEN** the server returns that route's existing response, unchanged by SPA serving
