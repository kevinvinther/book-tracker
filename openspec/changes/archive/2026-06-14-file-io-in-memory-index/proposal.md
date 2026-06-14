## Why

The library directory tree exists but is empty — there are no markdown files and no way to read or write them. Every entity CRUD operation (Works, Authors, Editions, etc.) depends on a reliable file I/O layer and a fast in-memory index. Without this foundation, no data can enter the system.

## What Changes

- **File I/O primitives**: `readFile` (parse YAML frontmatter + markdown body into typed objects), `writeFile` (serialize frontmatter + body, atomic write via temp file + rename), `deleteFile`, `listFiles` — all working against the configured library path
- **Slug generation**: `generateSlug` is the sole authority for creating human-readable, URL-safe filenames. It lowercases, transliterates Unicode to ASCII, normalizes special characters to hyphens, truncates to 80 characters, and handles collisions with disambiguating author-name suffixes. Slugs are immutable once a file is created.
- **In-memory Index**: Loads all markdown files from the library tree at startup, parses frontmatter into typed objects, provides lookup and search methods, stays in sync through upsert/remove on every write
- **Lookup methods**: `getWork`, `getCopy`, `getWorksByAuthor`, `getCopiesByEdition`, `getEditionsByWork`
- **Search**: `searchWorks(query)` filtering by title, author, or genre
- **Startup timing**: Log index load time; must be <1s for 500 test files

## Capabilities

### New Capabilities

- `file-io`: Core file read/write/delete/list operations for markdown files with YAML frontmatter in the library directory. Atomic writes via temp file + rename to prevent corruption. The caller is responsible for re-reading before write to merge external changes.
- `slug-generation`: `generateSlug` is the sole slug authority — every entity slug is created through this function. It lowercases, transliterates Unicode characters to ASCII equivalents (ñ→n, é→e, č→c), replaces non-alphanumeric characters with hyphens, collapses consecutive hyphens, strips leading/trailing hyphens, truncates to 80 characters, and handles collisions with an automatic author-surname suffix disambiguator. Slugs are immutable once assigned.
- `in-memory-index`: Startup index that walks the entire library tree, parses all YAML frontmatter into memory, and provides typed lookup and search access. Updated synchronously on every write. Must load 500 files in under one second.

### Modified Capabilities

<!-- None — all new capabilities built on the existing project scaffold and config -->

## Impact

- New files: `server/src/lib/io.ts` (file I/O), `server/src/lib/slug.ts` (slug generation), `server/src/lib/index.ts` (Index class), `server/src/lib/types.ts` (entity TypeScript interfaces)
- New dependencies: `gray-matter` (YAML frontmatter parsing), `limax` (Unicode transliteration)
- Modified: `server/src/index.ts` to build the Index on startup before the server listens
- No API routes yet — those come in later changes — but the Index must be available to route handlers
- No client changes
