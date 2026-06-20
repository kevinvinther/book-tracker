## 1. Shared slug helpers

- [x] 1.1 Add `generateEditionSlug(workSlug, publisher, publishDate, existingSlugs)` to `server/src/lib/slug.ts`: compose the base as `<work>-<publisher>-<year>` (year = first `-`-segment of `publishDate` when non-empty), use only the present part when one of publisher/year is missing, fall back to `<work>-edition` when both are absent, then resolve uniqueness via the existing `generateSlug` collision/counter logic.
- [x] 1.2 Add `generateCopySlug(editionSlug, existingSlugs)` to `server/src/lib/slug.ts`: compose base `<editionSlug>-copy` and resolve uniqueness via the existing collision/counter logic.
- [x] 1.3 Add unit tests in `server/src/lib/slug.test.ts` covering: both publisher+year, publisher-only, year-only, both-absent fallback (`<work>-edition`), edition collision counter, copy base, and copy collision counter (`-copy-2`).

## 2. Wire the routes

- [x] 2.1 Update `server/src/routes/editions.ts` `POST /api/editions` to build the slug via `generateEditionSlug` instead of the inline `[workSlug, publisher, year].join(" ")` seed.
- [x] 2.2 Update `server/src/routes/copies.ts` `POST /api/copies` to build the slug via `generateCopySlug(editionSlug, …)` instead of seeding `generateSlug` with the bare edition slug.
- [x] 2.3 Update `server/src/routes/quick-add.ts` to build the edition slug via `generateEditionSlug(workSlug, req.body.publisher, req.body.publish_date, …)` and the copy slug via `generateCopySlug(editionSlug, …)`, removing the `generateSlug(workSlug, …)` edition seed.

## 3. Tests and fixtures

- [x] 3.1 Update slug assertions in `server/src/routes/editions.test.ts` to the new scheme (e.g. `dune-chilton-1965`, plus the both-absent `dune-edition` fallback).
- [x] 3.2 Update slug assertions in `server/src/routes/copies.test.ts` (copy of `dune-ace-1990` now `dune-ace-1990-copy`; second copy `…-copy-2`) and any pre-seeded copy fixtures referenced by the tests.
- [x] 3.3 Update `server/src/routes/quick-add.test.ts` to assert the new edition/copy slug shapes for the full and minimal creation paths.
- [x] 3.4 Update `server/src/scripts/seed-test-data.sh` so generated copy files use the `<edition>-copy` slug and filename (e.g. `copies/dune-ace-2005-copy.md` with `slug: dune-ace-2005-copy`), keeping `edition`/`work` wikilinks pointing at the unchanged edition/work slugs.

## 4. Verify

- [x] 4.1 Run the server test suite and confirm all slug-related tests pass.
- [x] 4.2 Run the seed script against a scratch library and confirm editions/copies render with self-describing slugs and no `-2` / `-2-2` cascades; spot-check that copy/edition/note wikilinks still resolve.
