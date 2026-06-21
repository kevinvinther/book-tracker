## Why

The app is already running as a "live" deployment, but the only Docker setup is the development one: it runs `npm run dev` (tsx watch + the Vite dev server), mounts source code into the containers, sets `NODE_ENV=development`, never serves the built frontend, and is killed abruptly on every restart. This is fragile and unsuitable as the real deployment it is being used as. We need a genuine production path so the app can be deployed and updated reliably, and reached securely from a phone (whose camera-based barcode scanner requires a secure context).

## What Changes

- **Single-origin production serving**: the Express server serves the built client (static assets + SPA history fallback that does not shadow `/api`) and the API on one port. Relative `/api` paths keep working with no proxy.
- **Production Docker image**: a multi-stage build that runs `vite build` for the client and `tsc` for the server, then a runtime stage that runs `node dist/index.js` with production dependencies only (no tsx, no watch, no mounted source).
- **Server scripts and config**: add `build` and `start` scripts to the server; make the listening `PORT` overridable via environment (default `3001`).
- **Graceful shutdown**: handle `SIGTERM`/`SIGINT` by closing the HTTP server, WebSocket server, and chokidar file watcher cleanly.
- **Production Compose file**: a separate `docker-compose.prod.yml` that builds the production image, sets `NODE_ENV=production`, mounts only the data volume, sets `restart: unless-stopped`, and adds a Docker healthcheck against `/api/health`. The existing dev `docker-compose.yml` is left untouched.
- **CI**: a GitHub Actions workflow that runs the server test suite, the client lint, and the client/server builds on push and pull request — validating that the production build path compiles and tests stay green.
- **Deployment guide**: documentation covering running the production Compose, mounting and backing up the data directory, and putting HTTPS in front via `tailscale serve` (the supported way to reach the app securely from a phone).

No authentication, security middleware (helmet/CORS/rate limiting), in-app backups, or app-terminated TLS are added — these are explicitly out of scope for this single-user, Tailscale-only deployment.

## Capabilities

### New Capabilities

- `spa-serving`: The backend serves the built single-page app and its assets on the same origin as the API, with history-mode fallback that never intercepts `/api` routes.
- `production-container`: A multi-stage production image that compiles the server, builds the client, runs the compiled server with production dependencies only, takes its port from the environment, and shuts down cleanly on termination signals.
- `production-compose`: A separate production Compose definition that orchestrates the image with `NODE_ENV=production`, a data-only volume mount, an automatic restart policy, and a container healthcheck.
- `ci-pipeline`: A continuous integration workflow that runs server tests, client lint, and the production builds on push and pull request.
- `deployment-guide`: Operator documentation for deploying the production instance, backing up the data directory, and serving it over HTTPS with Tailscale.

### Modified Capabilities

None — no existing spec's required behavior changes; this change adds new operational capabilities alongside the existing development setup.

## Impact

- **Code**: `server/src/index.ts` (SPA static serving + fallback, graceful shutdown, env-driven port), `server/package.json` (build/start scripts), `server/tsconfig.json` (build output already configured).
- **Build/infra**: `server/Dockerfile` (multi-stage production target), `docker-compose.prod.yml` (new), `.github/workflows/` (new CI workflow).
- **Docs**: `README.md` / deployment guide (production run instructions, data backup, Tailscale HTTPS).
- **Dependencies**: no new runtime dependencies; production image installs production deps only.
- **Unchanged**: existing dev `docker-compose.yml`, the mkcert dev-HTTPS workflow, all API contracts, and the markdown-on-disk data model.
