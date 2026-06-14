## Why

The library path is configured through two competing mechanisms: a `.booktracker/config.yaml` file and a `BOOKTRACKER_LIBRARY_PATH` environment variable. Docker uses the env var, local dev uses the file. This dual approach creates confusion — Docker writes to `/root/book-tracker-data/` inside the container because it reads the file before the env var override kicked in. A single mechanism eliminates the ambiguity.

## What Changes

- **Drop `.booktracker/config.yaml`** — the config file is no longer read or written
- **Env var as sole source**: `readConfig()` returns `BOOKTRACKER_LIBRARY_PATH` if set, otherwise defaults to `~/book-tracker-data/`. `.env` files are loaded via `dotenv` so users don't need to export the variable in their shell.
- **Add `.env.example`** documenting the variable, `.env` is gitignored
- **Remove `writeConfig()`** and the `PATCH /api/config` endpoint entirely — config is read-only via env var
- **Settings page** shows the library path as read-only, noting it comes from `BOOKTRACKER_LIBRARY_PATH`
- **Docker Compose** already sets `BOOKTRACKER_LIBRARY_PATH=/data` — no change needed

## Capabilities

### New Capabilities

<!-- None -->

### Modified Capabilities

- `app-config`: `readConfig` uses env var only; `writeConfig` is removed; config file is deprecated
- `settings-page`: PATCH endpoint acknowledges but does not persist; UI shows env var source

## Impact

- Modified: `server/src/config.ts` (simplified to env var only)
- Modified: `server/src/index.ts` (PATCH /api/config behavior changes)
- Removed: `.booktracker/config.yaml` (gitignored)
- No client changes needed immediately (Settings page still works, just shows env var info)
