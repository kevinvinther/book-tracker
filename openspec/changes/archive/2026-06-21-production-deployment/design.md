## Context

The app currently ships only a development Docker setup. `docker-compose.yml` builds images whose `CMD` is `npm run dev`: the server runs under `tsx watch` and the client runs the Vite dev server, both with host source directories mounted in. `NODE_ENV` is forced to `development`, the built frontend is never produced or served, and there is no signal handling, so `docker stop` kills the process group abruptly. This dev setup is being used as the real, always-on deployment, reached from a phone over Tailscale.

Relevant existing facts:
- The client makes API calls to relative `/api/...` paths; in dev these are proxied to the backend by Vite (`client/vite.config.ts`). There is no hardcoded backend origin in the client.
- The server (`server/src/index.ts`) already serves `/api/attachments` via `express.static`, registers all routes under `/api/...`, and exposes `/api/health` returning `{ status: "ok" }`.
- The server is ESM with `.js` import extensions and `tsconfig.json` already sets `outDir: dist` / `rootDir: src`, so it compiles with `tsc` and runs under `node` with no source changes.
- `createWebSocketServer(server)` returns the `WebSocketServer`, and `startWatcher(...)` returns the chokidar `FSWatcher` — both expose `.close()`, so clean shutdown is feasible without refactoring.
- The deployment is single-user, behind Tailscale, no auth.

## Goals / Non-Goals

**Goals:**
- One production image that serves both the SPA and the API on a single origin.
- A reproducible, watch-free, source-mount-free production runtime.
- Clean container lifecycle: graceful shutdown, automatic restart, healthcheck.
- A CI gate that proves the production build compiles and tests pass.
- Documentation an operator can follow to deploy and reach the app over HTTPS from a phone.

**Non-Goals:**
- Authentication, authorization, or any user model.
- HTTP security middleware (helmet, CORS, rate limiting).
- App-terminated TLS / certificate management (Tailscale terminates HTTPS).
- In-app backup or export features (data is plain files; back up the directory).
- Changing any API contract, the data model, or the development workflow.

## Decisions

### Single-origin: Express serves the built SPA and the API

The Express server serves the client's `vite build` output as static files and falls back to `index.html` for non-`/api`, non-asset routes (SPA history mode). Chosen over a separate nginx static container + reverse proxy because the client already uses relative `/api` paths, so a single origin needs zero proxy configuration and collapses two dev containers into one production image — the least moving parts for a single-user app. The fallback MUST be registered so it never intercepts `/api/*` (those routes, including `/api/attachments` and the `/api/*` 404 handler, keep their behavior) and so unknown `/api` paths still return JSON 404s rather than `index.html`.

### Multi-stage image: `tsc` compile + `vite build`, run `node dist/index.js`

A multi-stage Dockerfile builds the client (`vite build`) and compiles the server (`tsc`) in build stages, then a runtime stage installs only production dependencies and runs `node dist/index.js`, copying in the server `dist/` and the client build output. Chosen over shipping TypeScript and running `tsx` in production because it yields a smaller runtime with no dev dependencies or file-watching overhead and a faster cold start; the codebase already compiles cleanly. The server gains `build` (`tsc`) and `start` (`node dist/index.js`) scripts.

### Env-driven port

The listening port is read from `process.env.PORT`, defaulting to `3001` (today's hardcoded value), so the image is configurable without code changes and the existing behavior is preserved when the variable is unset.

### Graceful shutdown

On `SIGTERM` and `SIGINT`, the process closes the HTTP server, the WebSocket server, and the file watcher, then exits. The handles are already returned by the existing factory functions, so this is additive. A short forced-exit timeout guards against a hung close.

### Separate `docker-compose.prod.yml`

Production orchestration lives in its own Compose file rather than replacing or overriding the dev one. It builds the production image target, sets `NODE_ENV=production`, mounts only the data directory (no source), sets `restart: unless-stopped`, and defines a healthcheck that probes `/api/health`. The existing `docker-compose.yml` and documented `docker compose up --build` dev flow are untouched; production is `docker compose -f docker-compose.prod.yml up -d`.

### CI on GitHub Actions

A workflow on push and pull request installs dependencies and runs: server tests (`vitest run`), client lint (`eslint`), and the production builds (`vite build` + `tsc`). This proves the production build path stays green. Node version matches the image (Node 22).

### HTTPS via Tailscale, documented not coded

The app serves plain HTTP; `tailscale serve` puts HTTPS (with a valid cert) in front, which is what makes the phone's camera/barcode scanner work in a secure context. This is captured in the deployment guide rather than the app, because Tailscale already provides encryption and certificate lifecycle, and self-terminating TLS would add mounting/renewal burden for no benefit in this context.

## Risks / Trade-offs

- **SPA fallback could shadow API routes** → Register static serving and the catch-all only for non-`/api` paths, after all `/api` routers and the existing `/api/attachments` 404 handler; keep an explicit guard so `/api/*` never resolves to `index.html`.
- **Stale client assets after redeploy** → The image is rebuilt on each deploy (`--build`), so the served assets always match the image; Vite's content-hashed filenames prevent stale cached chunks.
- **Forced/abrupt shutdown if a close hangs** → A bounded timeout forces `process.exit` if graceful close does not complete promptly, so container stop never hangs.
- **Production deps must be complete** → Anything imported by the compiled server must be a runtime `dependency`, not a `devDependency`; CI's production build catches misclassification before deploy.
- **Data volume ownership** → The container must read/write the mounted data directory as the host user; the prod Compose keeps the existing `user:`/mount conventions so file ownership stays correct.

## Migration Plan

1. Land the build scripts, SPA serving, graceful shutdown, production Dockerfile target, `docker-compose.prod.yml`, CI workflow, and docs.
2. On the deployment host, point the data mount at the existing library directory and start with `docker compose -f docker-compose.prod.yml up -d --build`.
3. Configure `tailscale serve` to expose the container's HTTP port over HTTPS.
4. Rollback: stop the prod stack and start the existing dev `docker-compose.yml` — it is unchanged and reads the same data directory.

## Open Questions

None.
