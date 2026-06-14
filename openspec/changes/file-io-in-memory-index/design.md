## Context

The library directory tree exists at the configured `library_path` (default `~/book-tracker-data/`) with all eight subdirectories in place (`authors/`, `series/`, `works/`, `editions/`, `copies/`, `notes/`, `attachments/`, `.booktracker/cache/`). The server reads the config on startup via `server/src/config.ts` and creates directories. But no code reads or writes markdown files yet. The existing codebase uses ESM (`type: "module"`), synchronous `fs` operations, and follows a consistent pattern: read from disk, parse, return typed objects. Atomic writes are already demonstrated in `writeConfig()` via temp-file-then-rename.

The library uses a file-per-entity model with a fixed directory tree. Each directory holds `.md` files named by slug (e.g., `works/dune.md`). Files consist of a YAML frontmatter block between `---` delimiters followed by a markdown body. The frontmatter is the canonical data; the body is auto-generated for human reading.

This change builds the foundational data layer — the file I/O primitives that all CRUD operations will use, the slug generation algorithm that creates human-readable filenames, and the in-memory index that makes querying fast without touching disk.

## Goals / Non-Goals

**Goals:**
- Parse markdown files with YAML frontmatter into typed JavaScript objects
- Write files atomically (temp file + rename) with serialized frontmatter + body
- Delete files from disk
- List files in a directory with basic filtering
- Generate slugs deterministically: lowercase, transliterate Unicode to ASCII, normalize non-alphanumeric characters to hyphens, truncate to 80 chars, handle collisions with automatic disambiguation
- The slug generator is the sole authority — no user-provided slugs; every entity slug comes from `generateSlug`
- Build an in-memory index at startup by walking all library subdirectories, parsing every `.md` file
- Provide typed lookup methods for the common navigation paths
- Provide a `searchWorks` method filtering by title, author, and genre
- Keep the index in sync on every write (upsert/remove)
- Load 500 files in under one second

**Non-Goals:**
- Full-text search on note bodies at index-time (note bodies are loaded into the index but cross-entity global search is a later concern)
- File watching for live index updates on external changes
- Body regeneration from frontmatter (markdown bodies are auto-generated later; for now the index stores what's on disk)
- Any API routes — those come later
- Client-side changes
- Validation of entity schemas beyond basic field presence
- Genre normalization (a later concern)

## Decisions

### YAML frontmatter parsing: `gray-matter`

`gray-matter` is the standard Node.js library for parsing markdown files with YAML frontmatter. It extracts the frontmatter block between `---` delimiters, parses the YAML (using `js-yaml` under the hood, which is already a dependency from the config module), and returns both the parsed data and the markdown body.

**Alternative considered**: Manual regex extraction + `js-yaml` `load()`. Rejected — `gray-matter` handles edge cases (frontmatter not at position 0, missing closing `---`, empty bodies, YAML parse errors) that would be tedious to reimplement.

### Slug generation: `limax` for transliteration, custom pipeline for normalization

`limax` (Lingua::Intelligent::MAX) handles Unicode transliteration (ñ→n, é→e, č→c) and can be configured for custom replacement rules. The normalization pipeline layer is applied on top: transliterate via limax → lowercase → replace non `[a-z0-9-]` characters with hyphens → collapse consecutive hyphens → strip leading/trailing hyphens → truncate to 80 characters → disambiguate collisions by appending author surname suffix.

`generateSlug` is the sole slug authority. Entity creation code never accepts a user-provided slug — it always calls `generateSlug` and uses the result. This keeps slugs consistent, predictable, and free of user error (typos, bad characters, duplicates).

**Alternative considered**: Manual character mapping. Rejected — Unicode is vast and maintaining a transliteration table manually is error-prone. `limax` handles dozens of scripts.

**Alternative considered**: `slugify` npm package. Rejected — `slugify` doesn't do transliteration (it strips non-ASCII instead of converting), which would produce unreadable slugs for non-English titles.

**Alternative considered**: Letting the user provide custom slugs. Rejected — adds complexity (validation, dedup, UX) and creates opportunity for broken wikilinks when users make typos. The algorithm is predictable and always produces valid, unique slugs.

### Index data structure: `Map<string, Entity>` per entity type

The Index class holds a `Map` per entity type (`works`, `authors`, `series`, `editions`, `copies`, `notes`), each keyed by slug for O(1) lookup. Cross-entity navigation (e.g., `getWorksByAuthor`) iterates the works map and filters by the author slug in the `authors[]` field. This is O(n) but fine for a personal library of <10,000 items. Memory: ~50MB at 10,000 items is well within acceptable bounds for a local desktop app.

**Alternative considered**: Pre-built reverse indexes (Map of author slug → Set of work slugs). Rejected — premature optimization. The filter approach is simpler and fast enough up to 10,000+ entries.

### Atomic writes: temp file + rename, consistent with config.ts

The existing `writeConfig()` in `config.ts` uses this pattern: write to `{path}.tmp`, then `renameSync(tmp, path)`. The `writeFile` primitive extends this to markdown files. The rename is atomic on POSIX filesystems (Linux, macOS) and near-atomic on NTFS (Windows), preventing corruption from server crashes mid-write.

**Alternative considered**: Write-to-then-move with a `.tmp` suffix in a temp directory. Rejected — same-directory rename is more atomic and simpler.

### Re-read before write for conflict resolution

Before any PATCH operation, the caller re-reads the target file from disk and merges fields the app isn't touching. This is the caller's responsibility (the CRUD route handler, in later changes), not the `writeFile` primitive. The `writeFile` function writes exactly what it's given — it doesn't merge.

**Rationale**: Keeping the merge logic at the route layer means `writeFile` stays a dumb serialization function, which is simpler, more testable, and more reusable.

### Note body loading

Notes are the only entity type where the markdown body matters — it's the user-written searchable content. For all other entities, the frontmatter is canonical and the body is an auto-generated render (done by a later body-regeneration change). During index load, note bodies are stored as a `body` field on the note entity. Other entity types store only frontmatter — their bodies are omitted to save memory.

**Alternative considered**: Loading all bodies upfront. Rejected — works and copies will eventually have large auto-generated bodies (reading history tables, loan history, notes lists) that waste memory. Notes have meaningful user-written content that must be searchable.

### File naming: slug as filename

Files are named `{slug}.md` and stored in their type's directory (e.g., `works/{slug}.md`). The Index walks each directory, parses every `.md` file, and uses the parsed frontmatter's `slug` field (not the filename) as the canonical key. If a filename diverges from the slug — shouldn't happen under normal operation, but could via external edits — the frontmatter slug wins.

**Alternative considered**: Deriving slug from filename. Rejected — the frontmatter is the canonical source of truth for all data. The filename is a convenience; the YAML `slug` field is authoritative.

### No database, no ORM

The index is a plain JavaScript class with Maps. No knex, prisma, or any database library. The durable source of truth is the markdown files on disk. The index is a derived cache.

## Risks / Trade-offs

- **Index staleness**: If files are edited externally (e.g., in Obsidian), the in-memory index is out of date until the server restarts. [Mitigation: Future file-watching will proactively refresh the index on external changes. Until then, restart the server after making external edits.]
- **Memory for large libraries**: 10,000 books with full frontmatter metadata is ~50MB. [Mitigation: This is acceptable for a local desktop app. If memory becomes an issue, lazy-load entities on demand and evict from cache — a future concern.]
- **Slug collisions**: Two works with identical titles by different authors (e.g., "Dune" by Herbert and Anderson) generate the same base slug. [Mitigation: `generateSlug` accepts the set of existing slugs and automatically appends an author-surname suffix on collision. If that suffix also collides, an incrementing number is appended. This is fully automatic — no user intervention needed.]
- **YAML parse errors on corrupted files**: A malformed YAML frontmatter block could prevent the entire Index from loading. [Mitigation: Wrap `readFile` in try/catch during index loading; skip the problematic file and log a warning with the file path. The app continues with the rest of the library.]
- **`limax` may not transliterate every character**: Some scripts (CJK, Arabic) don't transliterate to ASCII cleanly. [Mitigation: Characters that limax can't transliterate are stripped per the normalization pipeline's "replace non-[a-z0-9-] with hyphen" step. The resulting slug may be less readable but is always unique and valid.]
- **Synchronous fs on startup**: Index loading uses sync calls which block the event loop. [Mitigation: The index loads before the server starts listening, so no requests are blocked. Load time <1s for 500 files is the target.]
