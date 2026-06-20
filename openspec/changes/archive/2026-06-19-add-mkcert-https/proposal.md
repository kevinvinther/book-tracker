## Supersedes

None.

## Why

The Vite dev server uses self-signed certificates (via `@vitejs/plugin-basic-ssl` locally or `openssl` in Docker) for HTTPS. Every page load on desktop shows a "Your connection is not private" warning that the developer must click through. This friction is unnecessary — `mkcert` can generate locally-trusted certificates that browsers accept without warnings, without changing any dev workflow.

## What Changes

- Replace self-signed certs with `mkcert`-generated locally-trusted certificates for local and Docker development.
- Add a `make certs` target that installs `mkcert`'s local CA and generates certs into `client/.certs/`.
- Update `client/vite.config.ts` to prefer `mkcert` certs over `@vitejs/plugin-basic-ssl`, falling back to the plugin when certs aren't found.
- Remove the `openssl` cert generation step from `client/Dockerfile`; certs come from the host via volume mount.
- Mount `client/.certs/` into the client container at `/app/certs/`.

## Capabilities

### New Capabilities

None. This is dev-tooling infrastructure, not a user-facing capability.

### Modified Capabilities

- `dev-environment`: Adds a requirement for `mkcert`-based HTTPS cert generation and a `make certs` setup target. The existing Docker Compose configuration is modified to volume-mount certs instead of generating them at build time.

## Impact

- **Client config**: `client/vite.config.ts` — cert path detection logic changes.
- **Client Docker**: `client/Dockerfile` — `dev-https` stage simplified (openssl step removed).
- **Docker Compose**: `docker-compose.yml` — new volume mount for certs.
- **Makefile**: New `make certs` target.
- **Gitignore**: `client/.certs/` added.
- **Dependencies**: No new npm packages. `mkcert` is a system-level CLI tool, not a runtime dependency.
- **Mobile**: No change. Camera still works after tapping through the warning (same as today). Optional: install the `mkcert` CA profile on the mobile device to eliminate the warning there too.
