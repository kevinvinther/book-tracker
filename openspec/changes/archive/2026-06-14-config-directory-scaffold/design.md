## Context

The project scaffold is complete — the Express server runs on port 3001, the Vite client on 5173, and the health check roundtrip works. The app has no awareness of the library directory yet. The spec (§3, decision #6) defines a configurable data directory with a default of `~/book-tracker-data/` and a `.booktracker/config.yaml` at the project level for storing `library_path`.

## Goals / Non-Goals

**Goals:**
- `.booktracker/config.yaml` in the project root holds `library_path` with a sensible default
- Server reads config on startup, creates the full library directory tree if absent
- `GET /api/config` and `PATCH /api/config` for runtime config access
- Client Settings page at `/settings` with an editable library path input
- Navigation link to Settings from the app shell

**Non-Goals:**
- Config validation beyond non-empty path (no filesystem permission checks, no path sanitization beyond tilde expansion)
- Reloading the directory scaffold on config change without restart (restart required for the path change to take effect)
- Multiple config files, environment variable overrides, or profiles
- Production-only config or secrets management

## Decisions

### Config file location: project root `.booktracker/config.yaml`
The config file lives at the project root, not inside the library directory. This avoids a chicken-and-egg problem: the config tells us where the library is, so it can't live inside the library. The library directory gets its own `.booktracker/cache/` subdirectory for library-specific metadata (ISBN cache, genres), keeping project config and library metadata separate.

### YAML with `js-yaml` over JSON or dotenv
YAML is human-editable and consistent with the project's choice of YAML frontmatter for data files. `js-yaml` is the standard Node.js YAML parser with `safeLoad`/`safeDump` for secure serialization. Using the same format as the data files avoids introducing a second configuration format.

**Alternative considered**: JSON (`.booktracker/config.json`). Rejected — YAML is more readable for hand-editing and matches the project's format conventions.

### Atomic writes for config file
Same atomic-write pattern as the data files: write to a temp file, then rename. This prevents corruption if the server crashes mid-write. Config updates use a simple read-modify-write cycle: read existing config, merge the changed field, write atomically.

**Alternative considered**: Direct `fs.writeFileSync`. Rejected — violates the atomic-writes convention established in the project spec (§9.2).

### Client routing: `react-router-dom`
The app needs at least two pages (home/health check and settings). Adding `react-router-dom` now establishes the routing pattern before more pages are added in later steps. A `<BrowserRouter>` wrapper in `main.tsx` with `<Routes>` in `App.tsx` keeps routing centralized.

**Alternative considered**: Manual state-based routing (toggle a `useState` to show settings). Rejected — doesn't scale past two pages and doesn't support deep linking.

### Home directory expansion: `os.homedir()`
The default path `~/book-tracker-data/` uses a tilde. Node.js doesn't resolve `~` in `fs` operations natively. The config module resolves `~` to `os.homedir()` when reading paths. This is done in the config layer so all consumers get an absolute resolved path.

**Alternative considered**: Requiring absolute paths only. Rejected — `~/book-tracker-data/` is more intuitive for users and the spec explicitly uses tilde notation (§3).

### Directory creation: `fs.mkdirSync` with recursive
On startup, the server iterates over the list of required subdirectories and calls `mkdirSync(path, { recursive: true })` for each. This is a one-time startup cost (sub-millisecond) and simpler than using a recursive walk or async.

**Alternative considered**: `fs.promises.mkdir` with `Promise.all`. Rejected — startup is synchronous before the server starts listening; async adds complexity for no benefit here.

## Risks / Trade-offs

- **Config change requires restart**: Updating `library_path` via the API changes the config file, but the running server still uses the old path until restart. The Settings page should note this.
- **No path validation**: The server doesn't verify the library path is a writable directory. If the user enters a non-existent or invalid path, directory creation will fail on the next restart with a clear error.
