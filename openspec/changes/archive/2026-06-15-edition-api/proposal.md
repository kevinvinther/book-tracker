## Why

Works and Authors exist but editions — the specific published form of a book (ISBN, publisher, format, language) — have no API yet. This change adds full CRUD for Edition entities so that copies have something to link to.

## What Changes

- New REST endpoints: `POST`, `GET /all`, `GET /:slug`, `PATCH /:slug`, `DELETE /:slug` for editions
- Edition files created under `editions/` in the library, with YAML frontmatter linking to their parent Work via wikilink
- Index lookup methods `getEditionsByWork(slug)` and `getCopiesByEdition(slug)` already exist in the in-memory index; this change exercises them
- `DELETE` is orphan-protected with two override modes: `?force=true` deletes the edition file only (copies become dangling), `?cascade=true` deletes the edition and all linked copies

## Capabilities

### New Capabilities
- `edition-api`: Full CRUD REST API for Edition entities — create, list, get, update, delete with orphan protection

### Modified Capabilities
<!-- none -->

## Impact

- New route file `server/src/routes/editions.ts`
- Edition file schema: `slug`, `work` (wikilink), `isbn`, `publisher`, `publish_date`, `page_count`, `format`, `language`, `contributors[]`, `created_at`, `_schema`
- In-memory index already supports editions; no changes to file I/O primitives needed
- Works must exist in the index before an edition can link to them
