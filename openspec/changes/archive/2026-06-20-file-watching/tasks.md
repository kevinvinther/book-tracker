## 1. Dependencies and Setup

- [x] 1.1 Install `chokidar` and `ws` in `server/package.json`
- [x] 1.2 Install `@types/ws` in `server/package.json` devDependencies

## 2. Index convenience method

- [x] 2.1 Add `handleFileChange(type: EntityType, slug: string)` method to `Index` class in `server/src/lib/index.ts` — re-reads file from disk, upserts entity, or removes if file no longer exists

## 3. File watcher module

- [x] 3.1 Create `server/src/lib/fileWatcher.ts` — exports a `startWatcher(libraryPath, index, onEntityChange)` function that initializes chokidar, handles add/change/unlink events with debouncing, and calls the onChange callback
- [x] 3.2 Implement entity type resolution from file path (parse directory name to EntityType)
- [x] 3.3 Implement 300ms per-slug debouncing to coalesce rapid events
- [x] 3.4 Configure chokidar with `ignoreInitial: true` and ignore `.tmp` files

## 4. Server wiring

- [x] 4.1 Capture the HTTP server handle from `app.listen()` in `server/src/index.ts`
- [x] 4.2 Create `server/src/lib/websocketServer.ts` — creates a `ws.Server` on the HTTP server, tracks connected clients, and exports a `broadcast(type, slug, event)` function
- [x] 4.3 Wire WebSocket server into `server/src/index.ts`, starting it after route registration
- [x] 4.4 Start file watcher after index load, passing the `broadcast` function as the `onEntityChange` callback

## 5. Client WebSocket hook

- [x] 5.1 Create `client/src/hooks/useWebSocket.ts` — opens a WebSocket connection to `ws://localhost:3001`, handles reconnection with exponential backoff (1s initial, max 30s), and exposes a subscription mechanism for entity change callbacks
- [x] 5.2 Implement message parsing — on receiving `{type, slug, event}`, call all subscribed callbacks

## 6. Wire client hooks to live updates

- [x] 6.1 Add `refetch` to `useWorks` hook and wire into WebSocket — refetch on any work/edition/copy change
- [x] 6.2 Wire `useWork` to WebSocket — refetch when the displayed work changes, or when any of its editions/copies change
- [x] 6.3 Wire `useCopy` to WebSocket — refetch when the displayed copy changes
- [x] 6.4 Wire `useEdition` to WebSocket — refetch when the displayed edition changes
- [x] 6.5 Wire `useAuthor` to WebSocket — refetch when the displayed author or any of their works change
- [x] 6.6 Wire `useSeries` to WebSocket — refetch when the displayed series or any of its works change
- [x] 6.7 Wire `useStats` to WebSocket — refetch on any entity change
- [x] 6.8 Wire `useSearch` to WebSocket — refetch current search on any entity change

## 7. Tests

- [x] 7.1 Add unit tests for `Index.handleFileChange()` in `server/src/lib/index.test.ts`
- [x] 7.2 Add tests for file watcher debouncing behavior
- [x] 7.3 Add tests for WebSocket message broadcast
- [x] 7.4 Verify library directory path watching via chokidar integration test
- [x] 7.5 Add client-side tests for `useWebSocket` hook (connection, reconnection, message handling)
