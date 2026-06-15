## Context

The project already has full CRUD for Works and Authors, both following the same route/index/file-I/O pattern. Editions are the bridge entity between Works and Copies — a specific published form of a Work identified by ISBN, publisher, format, and language. The in-memory index already has `getEditionsByWork` and `getCopiesByEdition`; this change exercises those lookups.

## Goals / Non-Goals

**Goals:**
- Full CRUD REST API for Edition entities mirroring the Work and Author API patterns
- Edition file stored at `editions/{slug}.md` with YAML frontmatter linking to its Work via `[[wikilink]]`
- `GET /:slug` resolves `copy_count` from the index
- `DELETE /:slug` is orphan-protected with `?force` and `?cascade` overrides

**Non-Goals:**
- Copy CRUD
- Frontend views for editions
- Body regeneration into the edition file (separate change)

## Decisions

**Follow the same route pattern as Work and Author APIs.**
Both established a clear convention: a route file, read-from-disk before writes, atomic file writes via existing `writeFile`, and index `upsert`/`remove` on every mutation. Editions use the same pattern without introducing a new abstraction.

**Slug generation: `{work-slug}-{publisher}-{year}` as hint, but `generateSlug` deduplicates.**
The slug hint ensures editions for the same work are distinguishable at a glance. `generateSlug` already handles collision avoidance; we pass `work + publisher + year` as the input string.

**`work` stored as a wikilink string `[[works/{slug}]]`.**
Consistent with how Work stores `authors[]` and `series`. Keeps the file human-readable in Obsidian and matches the existing index parsing that strips `[[...]]` to resolve slugs.

**`GET /api/editions` supports `?work=` filtering.**
The index lookup `getEditionsByWork` is already available and makes this trivial. Worth including from the start since the Copy API and frontend will need it.

**Two delete override modes: `?force` and `?cascade`.**
- `?force=true`: delete the edition file only; copies remain on disk with dangling `[[editions/...]]` wikilinks. Mirrors how Author delete works — the user accepts the dangling state.
- `?cascade=true`: delete the edition file and all linked copy files from disk and index.

This gives callers precise control. Force is appropriate when the user wants to remove the edition record but keep the copies (perhaps to re-link them later). Cascade is appropriate for a true teardown.

## Risks / Trade-offs

- **Work validation on create**: The handler verifies the referenced work exists in the index at POST time. If the work is deleted out-of-band later, the edition's wikilink becomes dangling — acceptable and consistent with how other wikilinks behave.
- **Cascade delete scope**: Cascade removes copies but not notes referencing those copies. Notes can become dangling references. Full note cascade is out of scope here and will be handled when the notes API is wired into save endpoints.
