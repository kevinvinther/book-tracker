## Supersedes

None.

## Why

The markdown library is designed to be opened as an Obsidian vault, but it has never been verified end-to-end. Bodies are written to disk but several rendering gaps make the Obsidian experience worse than it should be: edition wikilinks in copy bodies show raw slugs instead of readable labels, edition and copy aliases have no API surface, work subtitle never appears, and series bodies don't show how many books are missing. Additionally, the test data is too thin to exercise all rendering paths. This change verifies every Obsidian compatibility guarantee, fixes the rendering and alias gaps, and leaves the vault genuinely usable in Obsidian.

## What Changes

- Fix body rendering: Copy bodies use human-readable edition wikilink display (translator > publisher > format > page count priority chain, matching heading logic); Work bodies render subtitle as italic text beneath the heading; Series bodies show missing-book placeholders when `total_works` is set
- Add missing alias API support: Edition and Copy routes accept `aliases` on POST and in PATCH `MUTABLE_FIELDS`; Work route normalizes `aliases` into POST body and `MUTABLE_FIELDS` to match the Author/Series pattern, while preserving the existing dedicated alias endpoints
- Update client-side TypeScript types: `Edition` and `Copy` gain `aliases?` field
- Create rich test data in `~/book-tracker-data/` covering all entity types, read-throughs, loans, notes, aliases, and series relationships
- Build automated CLI-based verification: use the Obsidian CLI to confirm wikilinks resolve, backlinks exist, aliases and tags are detectable, and properties are present
- Document the Obsidian experience in `OBSIDIAN.md`: recommended plugins (Dataview), setup instructions, and example Dataview queries

## Capabilities

### New Capabilities

- `obsidian-verification`: Automated verification using the Obsidian CLI (`unresolved`, `backlinks`, `aliases`, `tags`, `properties`) plus manual graph-view and Dataview checks. Confirms every Obsidian compatibility guarantee from the spec. Includes `OBSIDIAN.md` documentation with plugin recommendations and Dataview query examples.
- `rich-test-data`: A set of markdown files exercising all entity types, relationships, and features (read-throughs from multiple states, loans with overdue detection, notes linked to read-throughs and copies, aliases on all entity types, series with `total_works`). Replaces the current bare-bones test data.

### Modified Capabilities

- `body-rendering`: Body output changes — Copy body edition wikilink uses human-readable display text (e.g. `[[editions/dune-2|Hodder Paperback]]` instead of `[[editions/dune-2|dune-2]]`); Work body renders `subtitle` as italic text beneath the heading; Series body renders "not in library" placeholders for missing positions when `total_works` exceeds the number of linked works.
- `edition-api`: Edition POST and PATCH now accept `aliases`. The `aliases` field is added to `MUTABLE_FIELDS`.
- `copy-api`: Copy POST and PATCH now accept `aliases`. The `aliases` field is added to `MUTABLE_FIELDS`.
- `work-api`: Work POST and PATCH now accept `aliases` (normalized to match Author/Series). The `aliases` field is added to `MUTABLE_FIELDS`. Existing dedicated `POST/DELETE /api/works/:slug/aliases` endpoints remain unchanged.

## Impact

- **Server code**: `render-body.ts` (body content fixes), `routes/editions.ts` (aliases), `routes/copies.ts` (aliases), `routes/works.ts` (aliases normalization)
- **Client types**: `client/src/lib/types.ts` (add `aliases?` to Edition, Copy)
- **Test data**: `~/book-tracker-data/` (replace with rich data exercising all features)
- **Documentation**: New `OBSIDIAN.md` in project root
- **Tests**: Body rendering tests need updated expectations; route tests need alias coverage for Edition/Copy; new CLI verification script
- **No API breaking changes**: All existing endpoints preserve their contract. Alias additions are purely additive.
