## Supersedes

None. This change extends the slug-generation behaviour established in `edition-api`, `copy-api`, and `quick-add-endpoint` without invalidating their other requirements.

## Why

Editions and copies are seeded from a string that collides with their parent in the single global slug namespace, so they fall through to the `-2` / `-2-2` counter and produce meaningless names: a work `dune`, its edition `dune-2`, and that edition's copy `dune-2-2`. Quick-add is the worst case — it seeds the edition from just the work slug, ignoring publisher and year entirely, so it *always* yields `dune-2` / `dune-2-2`. The result is a vault full of opaque filenames instead of self-describing ones.

## What Changes

- **Editions** are slugged as `<work>-<publisher>-<year>` (slugified) — e.g. `dune-ace-2005`. When only one of publisher/year is present, the available part is used (`dune-ace`, `dune-2005`). The literal word `edition` is a **fallback only**, used when both publisher and year are absent → `dune-edition`. A numeric counter is appended only on a genuine collision (`dune-ace-2005-2`).
- **Copies** are slugged as `<edition-slug>-copy` — e.g. `dune-ace-2005-copy`, with a counter on collision (`dune-ace-2005-copy-2`).
- **Quick-add** is brought in line: it currently seeds the edition from only the work slug. It will use the same edition/copy slug logic as the dedicated routes, so a book added via quick-add and a book added via the individual endpoints produce identical names.
- The slug-building logic for editions and copies is centralised so `POST /api/editions`, `POST /api/copies`, and `POST /api/quick-add` cannot drift.
- **Works** are unchanged — bare title slug with the existing author-suffix disambiguation (`dune`, `dune-herbert-2`).
- **BREAKING** (cosmetic): newly created editions/copies get differently shaped slug strings, which appear in API responses and frontend URLs. There is no real library to migrate (only test data), so no migration is performed; the seed script and slug assertions in the test suite are updated to the new scheme.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `edition-api`: the "Create an edition" requirement changes how the slug is derived — explicit `<work>-<publisher>-<year>` composition with a `<work>-edition` fallback when both are absent.
- `copy-api`: the "Create a copy" requirement changes the slug seed to `<edition-slug>-copy` rather than the bare edition slug.
- `quick-add-endpoint`: the entity-creation requirement changes so quick-add applies the same edition (`<work>-<publisher>-<year>`) and copy (`<edition>-copy`) slug logic as the dedicated routes instead of seeding the edition from the work slug alone.

## Impact

- Code: `server/src/lib/slug.ts` (shared edition/copy slug helpers), `server/src/routes/editions.ts`, `server/src/routes/copies.ts`, `server/src/routes/quick-add.ts`.
- Tests: slug assertions in `server/src/routes/editions.test.ts`, `server/src/routes/copies.test.ts`, `server/src/routes/quick-add.test.ts`, and `server/src/lib/slug.test.ts`; the `server/src/scripts/seed-test-data.sh` fixtures.
- The global cross-type uniqueness set is retained unchanged as a safety net; the new suffixes make cross-type collisions structurally unlikely.
- No data migration: there is no existing library, only generated test data. Works, authors, series, and notes slug schemes are untouched.
