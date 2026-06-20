# live-updates Specification

## Purpose
Push entity change notifications from the server to connected clients via WebSocket, so the UI stays current when files change externally without requiring a page refresh.

## Requirements
### Requirement: WebSocket server on the same HTTP port
The system SHALL run a WebSocket server on the same port as the HTTP server, upgrading connections that arrive at the same port.

#### Scenario: WebSocket connection accepted
- **WHEN** a client opens a WebSocket connection to `ws://localhost:3001`
- **THEN** the connection is accepted and upgraded
- **AND** HTTP API requests continue to work on the same port

#### Scenario: IPv4 and IPv6 loopback support
- **WHEN** the server listens on `localhost:3001`
- **THEN** the WebSocket server accepts connections from both IPv4 and IPv6 loopback addresses

### Requirement: Broadcast entity changes to connected clients
When the file watcher updates the in-memory index, the system SHALL broadcast a JSON message to all connected WebSocket clients. The message SHALL contain the entity type, slug, and event.

#### Scenario: Work entity upserted
- **WHEN** a file change causes a Work to be upserted in the index
- **THEN** all connected clients receive `{ "type": "work", "slug": "dune", "event": "upsert" }`

#### Scenario: Copy entity removed
- **WHEN** a file deletion causes a Copy to be removed from the index
- **THEN** all connected clients receive `{ "type": "copy", "slug": "dune-ace-pb", "event": "remove" }`

#### Scenario: Author entity upserted
- **WHEN** a file change causes an Author to be upserted
- **THEN** all connected clients receive `{ "type": "author", "slug": "frank-herbert", "event": "upsert" }`

#### Scenario: No clients connected
- **WHEN** a file change occurs and no clients are connected
- **THEN** no broadcast error occurs and the server continues normally

### Requirement: Message format is consistent and minimal
All WebSocket messages SHALL be JSON objects with exactly three fields: `type` (the entity type as a string), `slug` (the entity's unique identifier), and `event` (either `"upsert"` or `"remove"`).

#### Scenario: Valid message format
- **WHEN** a broadcast is triggered
- **THEN** the message is `{ "type": "<entityType>", "slug": "<slug>", "event": "<upsert|remove>" }`
- **AND** no additional fields are included

### Requirement: Client WebSocket connection lifecycle
The system SHALL provide a client-side hook that opens a WebSocket connection to the server, handles reconnection on disconnect with exponential backoff, and cleans up on unmount.

#### Scenario: Initial connection
- **WHEN** a component mounts that uses the WebSocket hook
- **THEN** a WebSocket connection is opened to `ws://localhost:3001`

#### Scenario: Reconnection on disconnect
- **WHEN** the WebSocket connection drops (e.g., server restarts)
- **THEN** the client attempts to reconnect with exponential backoff starting at 1s, doubling up to a maximum of 30s

#### Scenario: Connection cleanup on unmount
- **WHEN** the last component using the WebSocket hook unmounts
- **THEN** the WebSocket connection is closed and no further reconnection attempts are made

### Requirement: Client refetches affected entity data
When the client receives a WebSocket message, the system SHALL trigger a refetch of the affected entity on any page that is currently displaying it.

#### Scenario: Work detail page open, that work changes
- **WHEN** the client is on `/works/dune` and receives `{ "type": "work", "slug": "dune", "event": "upsert" }`
- **THEN** the work detail page refetches its data

#### Scenario: Work grid page open, any work changes
- **WHEN** the client is on the work grid page `/` and receives `{ "type": "work", "slug": "foundation", "event": "upsert" }`
- **THEN** the work grid refetches its data (any work change may affect the grid display)

#### Scenario: Wrong slug, no refetch
- **WHEN** the client is on `/works/dune` and receives `{ "type": "work", "slug": "foundation", "event": "upsert" }`
- **THEN** the work detail page does NOT refetch (the notification is for a different work)

#### Scenario: Wrong entity type on detail page
- **WHEN** the client is on `/works/dune` and receives `{ "type": "copy", "slug": "some-other-copy", "event": "upsert" }`
- **THEN** the work detail page refetches (copy changes may affect the work's copy list)

#### Scenario: Stats page open
- **WHEN** the client is on `/stats` and receives ANY entity change notification
- **THEN** the stats page refetches its data
