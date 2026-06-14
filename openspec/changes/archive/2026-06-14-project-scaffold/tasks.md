## 1. Root Workspace Setup

- [x] 1.1 Create root `package.json` with `concurrently` dev scripts
- [x] 1.2 Create root `.gitignore` with `node_modules/`, `dist/`, `.env`

## 2. Server (`server/`)

- [x] 2.1 Create `server/package.json` with Express, TypeScript, tsx dependencies
- [x] 2.2 Create `server/tsconfig.json` targeting Node ESM (module: "ESNext", moduleResolution: "bundler")
- [x] 2.3 Create `server/src/index.ts` — Express app listening on port 3001, logging startup message

## 3. Client (`client/`)

- [x] 3.1 Scaffold client with `npm create vite@latest client -- --template react-ts`
- [x] 3.2 Install Tailwind CSS v4 and configure `client/src/index.css` with `@import "tailwindcss"`
- [x] 3.3 Initialize shadcn/ui (`npx shadcn@latest init`) in `client/` with defaults (TypeScript, Tailwind v4, CSS variables: yes)
- [x] 3.4 Configure `client/tsconfig.json` paths alias (`@/*` → `./src/*`) for shadcn component imports
- [x] 3.5 Verify client starts cleanly with `npm run dev` showing the Vite + React default page

## 4. Health Check Endpoint (Server)

- [x] 4.1 Add `GET /api/health` route in `server/src/index.ts` returning `{ status: "ok" }` with HTTP 200

## 5. API Proxy (Client)

- [x] 5.1 Configure `client/vite.config.ts` with `server.proxy` — route `/api` to `http://localhost:3001`

## 6. Client Health Check Display

- [x] 6.1 Update `client/src/App.tsx` — call `fetch("/api/health")` on mount, display "OK" on success or "Server unreachable" on error
- [x] 6.2 Clean up default Vite boilerplate (remove starter content, keep minimal App shell)

## 7. Docker Setup

- [x] 7.1 Create `server/Dockerfile` — Node.js base image, install deps, run `tsx watch src/index.ts`
- [x] 7.2 Create `client/Dockerfile` — Node.js base image, install deps, run `vite --host`
- [x] 7.3 Create root `docker-compose.yml` — define `server` and `client` services with bind mounts for source and named volumes for `node_modules/`
- [x] 7.4 Verify `docker compose up` starts both services and health check roundtrip works

## 8. End-to-End Verification

- [x] 8.1 Run `npm run dev` from root — confirm both server and client start without errors
- [x] 8.2 Open `http://localhost:5173` in browser — confirm "OK" is displayed from the server health check
- [x] 8.3 Stop server, reload page — confirm error state is shown
