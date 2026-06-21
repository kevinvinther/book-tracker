## 1. Direct entity saves — render body on POST and PATCH

- [x] 1.1 Works: replace `""` body with `renderBody(work, index)` in `POST /api/works`, `PATCH /api/works/:slug`, and alias add/remove endpoints (`server/src/routes/works.ts`)
- [x] 1.2 Authors: replace `# ${name}` body with `renderBody(author, index)` in `POST /api/authors` and `PATCH /api/authors/:slug` (`server/src/routes/authors.ts`)
- [x] 1.3 Editions: replace `""` body with `renderBody(edition, index)` in `POST /api/editions` and `PATCH /api/editions/:slug` (`server/src/routes/editions.ts`)
- [x] 1.4 Series: replace `""` body with `renderBody(series, index)` in `POST /api/series` and `PATCH /api/series/:slug` (`server/src/routes/series.ts`)
- [x] 1.5 Copies (metadata PATCH): replace `""` body with `renderBody(updated, index)` in `PATCH /api/copies/:slug` and `POST /api/copies` (`server/src/routes/copies.ts`)

## 2. Copy mutations through readAndWriteCopy

- [x] 2.1 Change `readAndWriteCopy` helper to call `renderBody(copy, index)` instead of passing `""` as the body to `writeFile` (`server/src/routes/copies.ts`)

## 3. Note cascade — regenerate linked Copy body

- [x] 3.1 Add a `regenerateCopyBody` helper to notes.ts that extracts the copy slug from a note's `copy` wikilink, re-reads the copy file, renders its body, and writes it back
- [x] 3.2 Call `regenerateCopyBody` after successful note creation in `POST /api/notes` when the note has a `copy` field (`server/src/routes/notes.ts`)
- [x] 3.3 Call `regenerateCopyBody` after successful note update in `PATCH /api/notes/:slug` when the note has a `copy` field (`server/src/routes/notes.ts`)

## 4. Quick-add multi-entity body regeneration

- [x] 4.1 Replace `""` body with `renderBody(work, index)` when writing the Work in `POST /api/quick-add` (`server/src/routes/quick-add.ts`)
- [x] 4.2 Replace `""` body with `renderBody(edition, index)` when writing the Edition in `POST /api/quick-add`
- [x] 4.3 Replace `""` body with `renderBody(copy, index)` when writing the Copy in `POST /api/quick-add`

## 5. Verify

- [x] 5.1 Run existing `render-body.test.ts` to confirm no regressions in render output
- [x] 5.2 Run existing route tests (if any) and the full test suite
- [x] 5.3 Manually verify: create/edit each entity type, inspect the `.md` file body on disk to confirm it's the full rendered markdown
