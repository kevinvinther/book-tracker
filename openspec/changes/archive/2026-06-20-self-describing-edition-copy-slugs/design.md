## Context

All entities share a single global slug namespace. Every create route builds a `Set` of all existing slugs (works, authors, editions, copies, series, notes) and passes it to `generateSlug(seed, existingSlugs, author?)`, which slugifies the seed and, on collision, appends an author suffix (works only) or a numeric counter.

The seeds differ by route:
- `POST /api/editions` already seeds from `[workSlug, publisher, year].filter(Boolean).join(" ")`, so a fully-specified edition becomes `dune-ace-books-1990`. With no publisher/year the seed is just the work slug, which collides with the work and degrades to `dune-2`.
- `POST /api/copies` seeds from the bare edition slug, so a copy of `dune-ace-books-1990` collides and becomes `dune-ace-books-1990-2`; a copy of the degraded `dune-2` becomes `dune-2-2`.
- `POST /api/quick-add` seeds the edition from **only** the work slug (`generateSlug(workSlug, …)`), ignoring publisher/year entirely, and the copy from that edition slug. This is the path that produces the `dune` / `dune-2` / `dune-2-2` chain even when publisher and year were supplied.

Wikilinks are path-qualified (`[[editions/<slug>]]`), and entity bodies are regenerated from frontmatter by the body-rendering layer, so slug *strings* are the only thing changing — no reference format changes. There is no existing library on disk (only generated test fixtures), so there is nothing to migrate.

## Goals / Non-Goals

**Goals:**
- Editions and copies get self-describing slugs: `dune-ace-books-1990`, `dune-ace-books-1990-copy`.
- The same slug logic is shared by the dedicated routes and quick-add so they cannot drift.
- Eliminate the meaningless `-2` / `-2-2` cascade for editions and copies under normal data.

**Non-Goals:**
- Changing the work slug scheme (stays bare title + author-suffix disambiguation).
- Encoding copy-specific metadata (condition, acquisition) into copy slugs.
- Migrating or renaming any existing files (none exist; fixtures are regenerated).
- Removing or restructuring the global cross-type uniqueness set.

## Decisions

**1. Two focused helpers in `server/src/lib/slug.ts`, layered on the existing collision resolver.**
Add `generateEditionSlug(workSlug, publisher, publishDate, existingSlugs)` and `generateCopySlug(editionSlug, existingSlugs)`. Each composes the descriptive base string, then defers the dedup/counter step to the existing `generateSlug` machinery (passing the already-composed base as the seed, no author). This reuses the proven counter logic and the 80-char truncation rather than duplicating it.

- Edition base: build parts `[workSlug, slugify(publisher?), year?]`. `year` = `String(publishDate).split("-")[0]` when `publishDate` is non-empty. If publisher and year are both absent, base = `<workSlug>-edition`. Otherwise base = the available parts joined.
- Copy base: `<editionSlug>-copy`.

*Alternative considered:* teach `generateSlug` a `type` parameter and put the fallback logic inside it. Rejected — it would entangle entity-type policy with the generic slugifier and complicate the works path, which has its own author-suffix branch.

**2. Compose the base, then slugify once.**
Pass the composed base through the same `limax` slugification `generateSlug` already applies, so publisher punctuation/casing (`Ace Books` → `ace-books`, `Little, Brown and Company` → `little-brown-and-company`) is handled identically to today. This keeps the existing edition fixture name `dune-ace-books-1990` stable.

**3. Quick-add calls the shared helpers.**
Replace `generateSlug(workSlug, …)` for the edition with `generateEditionSlug(workSlug, req.body.publisher, req.body.publish_date, …)`, and the copy seed with `generateCopySlug(editionSlug, …)`. Quick-add already has `publisher` and `publish_date` on the request body, so no new inputs are needed.

**4. Keep the global uniqueness set unchanged.**
The new suffixes make cross-type collisions structurally unlikely, but the set is cheap and is a harmless safety net (and still backs the counter for legitimate within-type duplicates, e.g. two copies of one edition). No behavioural change there.

## Risks / Trade-offs

- **Copy slugs can get long** (`dune-ace-books-1990-copy`) → Acceptable; the existing 80-char truncation in `generateSlug` still applies, and length buys self-description, which is the whole point.
- **Test fixtures and slug assertions encode old names** (`dune-2`-style and the bare `dune-ace-1990` copy slug in `copies.test.ts`) → Update `seed-test-data.sh` and the slug assertions in `editions.test.ts`, `copies.test.ts`, `quick-add.test.ts`, `slug.test.ts` as part of this change. These are the only consumers that assert on slug shape.
- **Existing `seed-test-data.sh` copies reuse the edition slug verbatim** (`copies/dune-ace-2005.md` with `slug: dune-ace-2005`) → Regenerate to the `-copy` form so fixtures match what the live code now produces.

## Migration Plan

No data migration. There is no library on disk. The seed script is updated so freshly generated fixtures reflect the new scheme; tests are updated in lockstep. Rollback is a straight revert of the code and fixtures.
