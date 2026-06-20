## Supersedes

None.

## Why

The in-memory index is only rebuilt on server restart. When files change externally — editing frontmatter in Obsidian, creating or deleting markdown files outside the app — the index becomes stale immediately. The app's re-read-before-write pattern handles merge safety during writes, but the in-memory index itself never picks up external edits until the next restart. This means the UI shows outdated data for the entire session after any Obsidian edit.

## What Changes

- Watch the library directory for `.md` file changes (add, change, delete) using chokidar
- On external change: re-parse the file's frontmatter from disk and update the in-memory index
- Push a notification (`{type, slug, event}`) to all connected clients via WebSocket
- Client re-fetches affected entity data when it has the relevant page open, keeping the UI current
- Debounce file events (300ms) to avoid redundant re-parsing from chokidar's multi-event save pattern
- Ignore `.tmp` files (the atomic write temp files) to avoid false events from the app's own writes

## Capabilities

### New Capabilities

- `file-watcher`: File system watcher that detects external `.md` file changes in the library directory, re-parses frontmatter from disk, and updates the in-memory index. Handles add, change, and unlink events with debouncing.
- `live-updates`: WebSocket server that broadcasts entity change notifications (`{type, slug, event}`) to connected clients. Client-side hook that subscribes to notifications and triggers refetch when the affected entity is currently displayed.

### Modified Capabilities

None.

## Impact

- **Dependencies**: `chokidar` and `ws` added to `server/package.json`
- **Server entry point** (`server/src/index.ts`): HTTP server handle captured from `app.listen()`. WebSocket server mounted on same port. File watcher started after index load.
- **Index** (`server/src/lib/index.ts`): New `handleFileChange(type, slug)` method that re-reads a file from disk and upserts it into the index (replaces in-memory state with canonical on-disk state).
- **Client hooks**: New `useWebSocket` hook subscribes to notifications. Detail page hooks (`useWork`, `useCopy`, `useEdition`, `useAuthor`, `useSeries`) and grid/list hooks (`useWorks`) auto-refresh on relevant entity changes.
- **No breaking changes**: All existing APIs and behaviors unchanged.
