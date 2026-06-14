## Why

The app doesn't know where the book library lives on disk. There's no config file, no way to set or change the library path, and no guarantee the expected directory tree exists. Every subsequent step — file I/O, the index, CRUD operations — depends on a known, structured library root. This change makes the data directory configurable and ensures the directory tree is ready before any data operations begin.

## What Changes

- Create a `.booktracker/config.yaml` file with a `library_path` field defaulting to `~/book-tracker-data/`
- Add `GET /api/config` — reads the config file and returns its contents as JSON
- Add `PATCH /api/config` — updates the `library_path` field and writes the config file
- On server startup, ensure the library directory tree exists: `authors/`, `series/`, `works/`, `editions/`, `copies/`, `notes/`, `attachments/`, and `.booktracker/cache/`
- Add a `server/src/config.ts` module that encapsulates config file reading, writing, and directory creation
- Update `server/src/index.ts` to run the directory scaffold on startup
- Add a Settings page on the client at `/settings` with a form field for the library path
- Add a navigation link to Settings in the client shell

## Capabilities

### New Capabilities

- `app-config`: Backend configuration file (`.booktracker/config.yaml`) with read/write API. On startup, reads the config and creates the full library directory tree if directories are missing.
- `settings-page`: Client-side Settings page at `/settings` with an editable library path input that reads from and writes to the config API.

### Modified Capabilities

<!-- None -->

## Impact

- New files: `server/src/config.ts`, `client/src/pages/Settings.tsx`
- Modified files: `server/src/index.ts` (startup scaffold), `client/src/App.tsx` (routing)
- New API routes: `GET /api/config`, `PATCH /api/config`
- New dependency: `js-yaml` (for YAML config parsing in the server)
- No existing data to migrate
