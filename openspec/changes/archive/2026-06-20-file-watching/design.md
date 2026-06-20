## Context

The app maintains an in-memory index of all entities (authors, series, works, editions, copies, notes) loaded at startup from markdown files on disk. When the app writes a file, it updates the index immediately — the write is the source of truth. However, files can also change outside the app (editing frontmatter in Obsidian, deleting or creating files manually). Currently those external changes are invisible until the next server restart. The re-read-before-write pattern in every PATCH handler protects merge safety during writes, but the in-memory index itself becomes stale.

The app is local-only. The HTTP server runs on `localhost:3001`. The Vite dev server runs on `localhost:5173` and proxies `/api` requests to the backend. There is currently no real-time communication channel between server and client.

## Goals / Non-Goals

**Goals:**
- Detect external `.md` file changes (add, modify, delete) in the library directory while the server is running
- Re-parse changed files from disk and update the in-memory index immediately
- Notify connected clients so they can re-fetch affected entity data and keep the UI current
- Handle the atomic write pattern (`.tmp` → rename) without triggering false events

**Non-Goals:**
- Auto-resolving simultaneous-edit conflicts (documented constraint unchanged)
- Body regeneration on external change (frontmatter-only re-index preserves intentional body edits)
- Index cache file for faster startup (deferred)
- Cross-device sync or multi-user
- Persisting WebSocket state across server restarts

## Decisions

### 1. File watcher: chokidar

**Choice**: `chokidar` watching `libraryPath/**/*.md` recursively, with `ignored: (path) => path.endsWith('.tmp')`.

**Rationale**: chokidar is the standard Node.js file watcher — it wraps `fs.watch` with polling fallbacks, handles OS quirks (macOS fsevents, Linux inotify), supports recursive watching, and has a mature ignore/event API. No alternative was seriously considered; it's the tool specified for this task and the right one for the job.

**Event handling**:
- `add` → re-parse frontmatter, `index.upsert(type, entity)`
- `change` → same as add (frontmatter may have changed)
- `unlink` → `index.remove(type, slug)`

### 2. Client notification: WebSocket

**Choice**: Raw WebSocket via the `ws` library, server and client connect on the same port as HTTP.

**Alternatives considered**:
- **SSE (Server-Sent Events)**: Simpler protocol (no upgrade), native `EventSource` in browsers. Rejected because SSE is unidirectional — fine for this use case, but Express 5 doesn't have first-class SSE support and the `EventSource` API doesn't support custom headers or binary. WebSocket is more future-proof if we ever need bidirectional communication.
- **Polling**: Simplest to implement (just `setInterval`). Rejected because it adds constant network traffic even when nothing changes, and the latency is bounded by the poll interval. For a local-only app with near-zero network cost, WebSocket is still the cleaner architecture.
- **socket.io**: Overkill. Adds a large dependency with its own protocol, rooms, and fallbacks. Raw WebSocket is natively supported in all modern browsers and the `ws` library is ~2KB.

**Design**: The `ws` WebSocket server upgrades on the same HTTP server. Messages are plain JSON: `{type: "work", slug: "the-brothers-karamazov", event: "upsert"}`. The client connects to `ws://localhost:3001` directly (bypassing the Vite dev proxy — there's no need since the backend is localhost).

### 3. Debouncing

**Choice**: 300ms per-file debounce using a `Map<string, NodeJS.Timeout>`.

**Rationale**: chokidar often fires both `add` and `change` for a new file, and editors can trigger multiple `change` events during a single save. Debouncing per slug avoids redundant re-parsing. 300ms is long enough to coalesce typical editor write bursts without creating noticeable delay in the UI.

### 4. Entity type and slug from file path

**Choice**: Parse the directory name for type (`authors/`, `works/`, `editions/`, `copies/`, `notes/`, `series/`), strip `.md` for the slug.

**Rationale**: The directory structure is deterministic and the `type` field in frontmatter is present but could be missing for manually-created files. Parsing from the path works even if the file has no frontmatter (though re-parsing would fail gracefully). The slug is the filename without `.md`, which matches the index key convention.

**Note files**: Note filenames are `YYYY-MM-DD-HHMMSS.md`. The slug = filename without extension. The index uses the same key.

### 5. Handling the app's own writes

**Choice**: Let them through. The watcher re-reads from disk and upserts. Since the app already updated the index immediately after writing, this is a redundant but harmless operation.

**Rationale**: Filtering our own writes would require maintaining a cooldown set of recently-written slugs and checking against it in the watcher. This adds complexity for no benefit — re-reading and upserting a file the app just wrote is a fast, idempotent operation. The `.tmp` file ignore prevents the atomic write intermediate step from triggering events.

### 6. Client-side architecture

**Choice**: A `useWebSocket` hook that maintains a single persistent connection per browser tab. On receiving a message, it checks whether the current route/page cares about that entity type and, if so, triggers a refetch.

**Which pages refetch on which events**:
- Work Grid (`/`): refetch on any Work, Edition, or Copy change (affects grid display)
- Work Detail (`/works/:slug`): refetch on change to *this* work, its editions, or its copies
- Edition Detail (`/editions/:slug`): refetch on change to *this* edition or its copies
- Copy Detail (`/copies/:slug`): refetch on change to *this* copy
- Author Detail (`/authors/:slug`): refetch on change to *this* author or any of their works
- Series Detail (`/series/:slug`): refetch on change to *this* series or any of its works
- Stats (`/stats`): refetch on any change (all entities affect stats)
- Search results: refetch on any change

**Refetch mechanism**: Each affected hook adds its entity filter to the WebSocket subscription. The `useWebSocket` hook receives all messages and calls the appropriate refetch callbacks. This is simpler than trying to match slugs in the WebSocket handler — each page knows what it's displaying and can decide locally whether to refetch.

### 7. Reconnection

**Choice**: Exponential backoff reconnection, max 30s delay, with a `navigator.onLine` guard.

**Rationale**: If the server restarts, all WebSocket connections drop. The client should reconnect automatically without user intervention. The `online`/`offline` events prevent reconnection attempts when the device is offline. The WebSocket is an enhancement, not a requirement — the app functions normally without it, just without live updates.

## Risks / Trade-offs

- **[Risk] chokidar may miss events on some Linux filesystems** → chokidar falls back to polling when native fs events aren't available. Test on the target platform (Linux with ext4).
- **[Risk] Debouncing may drop the last event in a rapid-fire sequence** → The 300ms timer resets on each event for the same file. The last event always fires after 300ms of silence.
- **[Risk] Large library (1000+ files) — initial chokidar `add` burst on startup** → chokidar fires `add` for every file when `watch()` starts. We must not re-parse all files — the index is already loaded. Instead, start the watcher *after* `index.load()` completes, and use `ignoreInitial: true` on chokidar options to skip the initial scan.
- **[Risk] Rename events (slug changes)** → Slugs are immutable by convention. If a user renames a file in Obsidian (which updates all wikilinks), chokidar fires `unlink` for the old name and `add` for the new name. The index handles this correctly: remove old slug, add new slug. However, wikilinks in other files that reference the old slug will be broken. This is a pre-existing constraint, not introduced by file watching.
