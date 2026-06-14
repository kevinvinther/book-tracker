## Context

The config system currently uses a YAML file (`.booktracker/config.yaml`) with an env var (`BOOKTRACKER_LIBRARY_PATH`) override added to support Docker. This dual-source approach caused a hard-to-debug issue where Docker's server wrote to `/root/book-tracker-data/` because the config file took effect before the env var was checked. The decision is to make the env var the sole config source.

## Goals / Non-Goals

**Goals:**
- Env var is the single source of truth for `library_path`
- Default to `~/book-tracker-data/` when no env var is set
- Remove config file I/O entirely
- Docker and local dev behave identically (both use the same mechanism)

**Non-Goals:**
- Multi-variable config (just `library_path` for now)
- `.env` file loading (user sets the var in their environment or docker-compose)
- Changing the Settings page UI significantly (just informational update)

## Decisions

### Env var only, no config file

`readConfig()` returns `{ library_path: process.env.BOOKTRACKER_LIBRARY_PATH || "./data/" }`. The default is `./data/` — a relative path resolved against the project root by `expandHome`. This means both Docker (`BOOKTRACKER_LIBRARY_PATH=/data`) and local dev (default `./data/`) write to the same `data/` directory alongside the project. `dotenv` loads `.env` files automatically at startup.

This also eliminates `js-yaml` from the config module (it's still used by `io.ts` for file writes).

**Alternative considered**: Keeping the config file as a fallback when no env var is set. Rejected — the dual-source ambiguity is the problem we're fixing. A single mechanism eliminates confusion.

### Settings page: read-only display

The Settings page displays the current library path from `GET /api/config` and notes it is controlled by `BOOKTRACKER_LIBRARY_PATH`. The path input is replaced with a read-only display. The `PATCH /api/config` endpoint is removed entirely — there is nothing to persist.

**Alternative considered**: Keeping PATCH as a no-op acknowledgment. Rejected — an endpoint that can't do anything is misleading. Removing it is honest.

### Default path unchanged: `~/book-tracker-data/`

The default remains `~/book-tracker-data/` for backward compatibility with existing local dev setups. Docker users override via the env var.

## Risks / Trade-offs

- **Settings page can't persist changes**: The only way to change the library path is to set the env var and restart. [Mitigation: This is a reasonable trade-off for simplicity. The library path is changed once and rarely touched.]
- **Existing config files become dead data**: Any `.booktracker/config.yaml` file is ignored. [Mitigation: Add `.booktracker/` to `.gitignore` and document the migration in the commit message.]

## Open Questions

None.
