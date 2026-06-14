## 1. Server Dependencies

- [x] 1.1 Install `js-yaml` and `@types/js-yaml` in `server/`

## 2. Config Module (`server/src/config.ts`)

- [x] 2.1 Create `server/src/config.ts` with `readConfig()` — reads `.booktracker/config.yaml`, creates with default if missing, resolves `~` in `library_path`
- [x] 2.2 Add `writeConfig(config)` — writes config atomically (temp file + rename)
- [x] 2.3 Add `ensureLibraryDirectories(libraryPath)` — creates `authors/`, `series/`, `works/`, `editions/`, `copies/`, `notes/`, `attachments/`, `.booktracker/cache/` if missing

## 3. Config API Endpoints

- [x] 3.1 Add `GET /api/config` route in `server/src/index.ts` — reads and returns config as JSON
- [x] 3.2 Add `PATCH /api/config` route in `server/src/index.ts` — validates non-empty `library_path`, writes config, returns updated config

## 4. Startup Scaffold

- [x] 4.1 In `server/src/index.ts`, read config on startup and call `ensureLibraryDirectories()` before the server starts listening

## 5. Client Routing

- [x] 5.1 Install `react-router-dom` in `client/`
- [x] 5.2 Wrap app in `<BrowserRouter>` in `client/src/main.tsx`
- [x] 5.3 Restructure `client/src/App.tsx` to use `<Routes>` with a home route (`/`) and a settings route (`/settings`)

## 6. Settings Page

- [x] 6.1 Create `client/src/pages/Home.tsx` with the existing health-check display
- [x] 6.2 Create `client/src/pages/Settings.tsx` — fetches config on mount, renders library path input with save button, validates non-empty

## 7. Navigation

- [x] 7.1 Add a minimal header in `App.tsx` (or a shared layout) with a "Settings" link

## 8. Verification

- [x] 8.1 Start server, verify `GET /api/config` returns default `library_path`
- [x] 8.2 Verify default library directory tree was created at `~/book-tracker-data/`
- [x] 8.3 Update library path via `PATCH /api/config`, verify config file updated
- [x] 8.4 Open client at `/settings`, verify current path is shown and editable
- [x] 8.5 Verify Settings link navigates correctly
