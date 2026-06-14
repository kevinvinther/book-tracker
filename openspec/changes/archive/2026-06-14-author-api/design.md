## Context

The Work API established the CRUD pattern: router-per-entity under `server/src/routes/`, `create<Entity>Router(index, libraryPath)`, re-read-before-write merge on PATCH, auto-generated slug via `generateSlug`, orphan-protected deletion with cascade override. The Index has `getAuthor`, `getAllAuthors`, `getWorksByAuthor`, `upsert`, and `remove` methods ready to use.

The Author entity has fewer fields than Work: `name` (required), `aliases`, and `created_at`. Its primary relationship is reverse — Works point to Authors via `[[wikilinks]]` in `authors[]`.

## Goals / Non-Goals

**Goals:**
- Full CRUD for Author entities following the established Work API pattern
- Slug auto-generated from name
- GET single resolves list of works linked to this author
- Cascade delete strips the author wikilink from all linked works (never deletes works)
- Re-read before write on PATCH to merge external changes

**Non-Goals:**
- Author bio, photo, birth/death dates (minimal entity by design)
- Author search endpoint (covered by `index.searchWorks` matching author names)
- Frontend author pages

## Decisions

All architectural decisions follow the Work API pattern established in S4:
- Router at `server/src/routes/authors.ts`, exports `createAuthorsRouter(index, libraryPath)`
- Library path passed as parameter (not read from config internally)
- Slug generated from name via `generateSlug`, never user-provided
- PATCH re-reads file from disk, merges mutable fields (name, aliases), preserves immutable fields (slug, type, created_at, _schema)
- Only `name` is required on create; `aliases` is optional

### Cascade delete: delete author, don't touch works

When `DELETE /api/authors/:slug?cascade=true` is called, the handler deletes the author file and index entry without modifying any linked works. The `[[authors/<slug>]]` wikilinks in works become dangling references — Obsidian renders these as "not yet created" links naturally. Works are never modified by author deletion.

**Alternative considered**: Stripping the author wikilink from all linked works before deleting. Rejected — destructive and unnecessary. Dangling wikilinks are a well-understood pattern in Obsidian; removing them destroys the user's curated author data in works. If the user wants clean wikilinks, they can edit works manually before deleting the author.

## Risks / Trade-offs

- **Cascade delete leaves dangling wikilinks** — works may reference deleted authors via `[[authors/...]]` that no longer resolve. [Mitigation: This is natural Obsidian behavior — unresolved links show as "not yet created". The work grid should handle missing author lookups gracefully.]

## Open Questions

None.
