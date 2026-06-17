## Why

Works and Editions exist but Copies — a user's physical or digital ownership of a specific Edition — have no API yet. Adding Copy CRUD completes the core entity hierarchy and makes the data model usable end-to-end.

## What Changes

- New REST endpoints: `POST /api/copies`, `GET /api/copies/:slug`, `PATCH /api/copies/:slug`, `DELETE /api/copies/:slug`
- Copy files created under `copies/` in the library, with YAML frontmatter linking to both their Edition and Work via wikilinks
- `DELETE` is a hard delete — Copies are leaf nodes (nothing links to them) so no orphan protection is needed
- No list-all endpoint in this change; copies are accessed via their parent edition or work

## Capabilities

### New Capabilities
- `copy-api`: Full CRUD REST API for Copy entities — create, get, update, hard delete

### Modified Capabilities
<!-- none -->

## Impact

- New route file `server/src/routes/copies.ts`
- Copy file schema: `slug`, `edition` (wikilink), `work` (wikilink), `status`, optional fields `cover_image`, `release_date`, `condition`, `acquisition_date`, `acquisition_source`, `price_amount`, `price_currency`, `location`, `created_at`, `_schema`
- Both the referenced Edition and Work must exist in the index at creation time
- Depends on the in-memory index (already supports copies via `getCopiesByEdition` and `getCopiesByWork`) and the Edition API
