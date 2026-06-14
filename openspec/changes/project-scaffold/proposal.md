## Why

The Book Diary application doesn't exist yet — there is no server, no client, no dev environment, and no way to verify that the two halves can communicate. Without a working scaffold, nothing else can begin. This change establishes the monorepo foundation: a single command starts both services, the client can reach the server, and a health check proves the roundtrip works end to end.

## What Changes

- Create a `server/` package with Express + TypeScript running on `localhost:3001`
- Create a `client/` package with Vite + React + TypeScript + Tailwind CSS + shadcn/ui running on `localhost:5173`
- Add a root `package.json` with a `dev` script that starts both services concurrently
- Configure Vite dev server to proxy `/api/*` requests to the backend on port 3001
- Implement `GET /api/health` returning `{ status: "ok" }`
- Client calls `/api/health` on mount and displays the server response
- Docker Compose setup for containerized development (both services run in containers with live reload)

## Capabilities

### New Capabilities

- `dev-environment`: Root-level development workflow — `npm run dev` starts both server and client concurrently, with proper proxy configuration so the client can reach the backend API without CORS issues. Includes Docker Compose setup for containerized development.
- `health-check`: Server exposes `GET /api/health` returning `{ status: "ok" }`; client verifies connectivity by calling it on mount and displaying the result, proving the full frontend-to-backend roundtrip.

### Modified Capabilities

<!-- None — this is the first change in the project. -->

## Impact

- Affected directories: `server/`, `client/`, root `package.json`, `Dockerfile`, `docker-compose.yml`
- New dependencies: Express, Vite, React, Tailwind CSS, shadcn/ui, concurrently, tsx
- No existing code, APIs, or data to migrate or break
