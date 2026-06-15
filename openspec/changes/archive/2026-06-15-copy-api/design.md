## Context

The project has full CRUD for Works, Authors, and Editions, all following the same route/index/file-I/O pattern. Copies are the leaf nodes in the entity hierarchy — they represent a user's physical or digital ownership of a specific Edition of a Work. The in-memory index already tracks copies and exposes `getCopiesByEdition` and `getCopiesByWork`; this change adds the REST surface.

## Goals / Non-Goals

**Goals:**
- Full CRUD REST API for Copy entities at `/api/copies`
- Copy file stored at `copies/{slug}.md` linking to both Edition and Work via wikilinks
- `GET /api/copies/:slug` resolves and inlines Edition and Work metadata
- `DELETE` is a hard delete — no orphan protection needed since nothing links to copies

**Non-Goals:**
- List-all endpoint (`GET /api/copies`) — copies are always accessed in context of an edition or work; the index lookups used by those routes are sufficient for now
- Read-through or loan tracking (separate changes)
- Frontend views

## Decisions

**Follow the same route pattern as Work, Author, and Edition APIs.**
Consistent convention: route file, read-from-disk before writes, atomic writes via `writeFile`, index `upsert`/`remove` on every mutation.

**Slug generated from `edition + sequential counter`.**
Unlike Works (title-based) or Editions (work+publisher+year), Copies have no natural distinguishing text field. Using the edition slug as the base with `generateSlug` deduplication (e.g. `dune-ace-books-1990`, `dune-ace-books-1990-2`) keeps slugs meaningful and unique.

**Both `edition` and `work` stored as wikilinks.**
Redundant but intentional — having `work` directly on the Copy lets Obsidian graph view show copies connected to works without traversing through editions. Matches the existing `Copy` type definition.

**Validate both Edition and Work exist at create time.**
If either is missing, return 400. This prevents orphaned copies that would silently fail to resolve metadata.

**`GET /api/copies/:slug` inlines edition and work metadata.**
The spec calls for "full copy detail, resolves edition/work metadata". Rather than returning raw wikilinks, the handler resolves the Edition and Work from the index and includes their key fields inline (title, publisher, format, etc.).

**Hard delete, no cascade options.**
Copies are leaf nodes — no other entity links to them by slug. Force/cascade distinctions are unnecessary.

## Risks / Trade-offs

- **`status` field has a fixed enum** (`owned`, `lent`, `lost`, `given-away`, `sold`). The POST handler should default to `owned` if not provided, since that's the expected state for a newly acquired copy.
- **Inlined metadata on GET is snapshot-only**: if the Edition or Work is updated after the copy is fetched, the response may be stale. Acceptable since this is a request-time resolution from the in-memory index.
