## 1. Server runtime changes

- [x] 1.1 Add `build` (`tsc`) and `start` (`node dist/index.js`) scripts to `server/package.json`
- [x] 1.2 Read the listening port from `process.env.PORT`, defaulting to `3001`, in `server/src/index.ts`
- [x] 1.3 Capture the WebSocket server and file watcher handles, and add `SIGTERM`/`SIGINT` handlers that close the HTTP server, WebSocket server, and watcher, with a bounded force-exit timeout
- [x] 1.4 Verify `npm run build --prefix server` compiles cleanly and `npm run start --prefix server` boots the compiled server

## 2. SPA serving

- [x] 2.1 Serve the client's `vite build` output as static files from the API origin, registered after all `/api` routers
- [x] 2.2 Add a history-mode fallback that returns `index.html` for non-`/api`, non-asset requests and never intercepts `/api/*`
- [x] 2.3 Confirm `/api/health`, `/api/attachments/<file>`, and unknown `/api/*` paths still return their existing responses (JSON, not `index.html`)

## 3. Production image

- [x] 3.1 Add a multi-stage production target to `server/Dockerfile`: build stage runs `tsc`, a client build stage runs `vite build`, runtime stage installs production deps only and runs `node dist/index.js` with the built client assets copied in
- [x] 3.2 Ensure every module imported by the compiled server is a runtime `dependency` (not a `devDependency`)
- [x] 3.3 Build the production image and run it locally to confirm it serves both the SPA and the API on one port

## 4. Production Compose

- [x] 4.1 Create `docker-compose.prod.yml` building the production image with `NODE_ENV=production`, no source mounts, and the library data directory mounted with correct ownership
- [x] 4.2 Add `restart: unless-stopped` to the production service
- [x] 4.3 Add a healthcheck that probes `/api/health`
- [x] 4.4 Confirm `docker compose -f docker-compose.prod.yml up -d --build` starts a healthy container and the existing dev `docker compose up --build` is unaffected

## 5. CI

- [x] 5.1 Add a GitHub Actions workflow (Node 22) that, on push and pull request, installs deps and runs server tests, client lint, and the client and server production builds
- [x] 5.2 Confirm the workflow fails when tests, lint, or a production build fails

## 6. Documentation

- [x] 6.1 Document running the production Compose stack and pointing the data mount at the operator's library directory
- [x] 6.2 Document data backup as backing up the mounted data directory with standard tools
- [x] 6.3 Document `tailscale serve` for HTTPS, noting the secure context is required for the phone barcode scanner
