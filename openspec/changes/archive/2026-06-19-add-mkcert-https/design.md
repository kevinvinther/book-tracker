## Context

The Vite dev server serves HTTPS in two modes:

1. **Local** (`npm run dev:https`): Uses `@vitejs/plugin-basic-ssl` which generates ephemeral self-signed certs. Browser shows NET::ERR_CERT_AUTHORITY_INVALID on every page load.
2. **Docker** (`docker compose up`): Dockerfile generates self-signed certs via `openssl req -x509` at build time to `/app/certs/`. Vite loads them because `existsSync("/app/certs/localhost.key")` passes. Same browser warning.

The camera-based barcode scanner (`html5-qrcode`) requires HTTPS — browsers block `getUserMedia` on insecure origins. This is the only reason HTTPS exists in the dev setup.

## Goals / Non-Goals

**Goals:**
- Eliminate browser certificate warnings on desktop (local and Docker dev).
- No change to current dev commands (`npm run dev:https`, `docker compose up`).
- One `make certs` setup step that generates trusted certs.
- Graceful fallback to `@vitejs/plugin-basic-ssl` if `mkcert` isn't installed.

**Non-Goals:**
- Eliminating warnings on mobile devices (requires manual CA install per device).
- Adding HTTPS to the Express server (stays HTTP, proxied through Vite).
- Production-grade cert management (Let's Encrypt, etc.).

## Decisions

### Use `mkcert` instead of persisting `@vitejs/plugin-basic-ssl` certs

**Chosen:** `mkcert` (system CLI tool).

`mkcert` creates a local Certificate Authority, installs it into the system trust store, and issues certs signed by it. Browsers trust the CA, so they trust the certs — no warnings. `@vitejs/plugin-basic-ssl` generates self-signed certs that can never be trusted, even if persisted.

**Alternative considered:** Keep `@vitejs/plugin-basic-ssl` and document how to manually trust the self-signed cert. Rejected — this is per-cert (expires, regenerates) and doesn't work consistently across browsers.

### Cert storage at `client/.certs/`

**Chosen:** `client/.certs/localhost.pem` + `client/.certs/localhost-key.pem`.

Keeps certs co-located with the client that consumes them. The `dev:https` command runs with `cwd = client/`, so `vite.config.ts` can resolve `.certs/` relative to its working directory. Docker mounts `./client/.certs:/app/certs:ro`.

**Alternative considered:** Project root `.certs/`. Rejected — requires `../.certs/` in vite.config or `process.cwd()` manipulation, which is fragile across tooling.

### Fallback to `@vitejs/plugin-basic-ssl` when certs absent

**Chosen:** If `mkcert` certs aren't found, fall back to the basic-ssl plugin with a `console.warn` hint to run `make certs`. This preserves the current "it works but shows a warning" behavior as a floor.

**Alternative considered:** Refuse to start if certs are missing. Rejected — too disruptive; the basic-ssl plugin is already installed and works.

### Docker certs via volume mount, not Dockerfile

**Chosen:** Remove the `openssl req -x509` step from the Dockerfile. Certs come from the host via `docker-compose.yml` volume mount `./client/.certs:/app/certs:ro`.

This means `make certs` on the host covers both local and Docker. No rebuild needed when certs change.

**Alternative considered:** Install `mkcert` inside the Dockerfile and generate certs at build time. Rejected — `mkcert` requires a trust store (`mkcert -install`) that doesn't survive container rebuilds, and the generated certs would be per-container, not shared with the host.

### `make certs` target in root Makefile

**Chosen:** A single `make certs` target in the project root that:
1. Checks if `mkcert` is installed (errors with install link if not).
2. Runs `mkcert -install` (idempotent — skips if CA already trusted).
3. Generates `localhost.pem` and `localhost-key.pem` into `client/.certs/`.

This is the only setup step the developer needs to remember.

## Risks / Trade-offs

- **`mkcert` must be installed.** This is a prerequisite. The fallback path (basic-ssl plugin) means the app still works, just with warnings. The `make certs` target checks for it and gives a helpful error.
- **Mobile devices don't trust `mkcert` CA.** No change from today — mobile users still tap through the warning. The `mkcert` CA root can optionally be installed on mobile (documented, not automated) to fix this later.
- **Cert expiry after 2 years (mkcert default).** If the developer sees warnings return after ~2 years, re-running `make certs` fixes it.
- **Docker volume mount requires certs to exist on host.** `docker compose up` will fail if `client/.certs/` doesn't exist. The `make certs` step must be run before first Docker start.
