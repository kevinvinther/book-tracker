## 1. Body rendering fixes

- [x] 1.1 Extract `editionDisplayLabel()` helper in `render-body.ts` — returns human-readable label from edition fields (translator > publisher > format > page_count > slug fallback)
- [x] 1.2 Update Copy body to use `editionDisplayLabel()` for the edition wikilink display text instead of raw slug
- [x] 1.3 Update `headingSuffix` to use `editionDisplayLabel()` internally (no behavior change for headings)
- [x] 1.4 Render `work.subtitle` as italic `*{subtitle}*` line in Work body when subtitle is set
- [x] 1.5 Render series total_works placeholders in Series body: after the work list, add `{n}. — (not in library)` for positions exceeding linked work count
- [x] 1.6 Update `render-body.test.ts` with new test cases: edition wikilink with each label priority, subtitle present/absent, series placeholder rendering

## 2. Alias API support

- [x] 2.1 Add `"aliases"` to `MUTABLE_FIELDS` in `server/src/routes/works.ts` and accept `aliases` in POST body
- [x] 2.2 Add `"aliases"` to `MUTABLE_FIELDS` in `server/src/routes/editions.ts` and accept `aliases` in POST body
- [x] 2.3 Add `"aliases"` to `MUTABLE_FIELDS` in `server/src/routes/copies.ts` and accept `aliases` in POST body
- [x] 2.4 Add alias assertions to existing route tests: works (POST with aliases, PATCH aliases), editions (POST/PATCH aliases), copies (POST/PATCH aliases)
- [x] 2.5 Verify that setting `aliases: []` clears the field (omits key), and `aliases: ["single"]` writes correctly

## 3. Client type updates

- [x] 3.1 Add `aliases?: string[]` to `Edition` and `Copy` types in `client/src/lib/types.ts`

## 4. Rich test data

- [x] 4.1 Create `server/src/scripts/seed-test-data.ts` that writes markdown files directly to `~/book-tracker-data/`
- [x] 4.2 Seed 2 authors with aliases (one primary, one with multiple aliases)
- [x] 4.3 Seed 1 series with `total_works: 3` and 2 linked works (one with `series_position: 1`, one with `series_position: 3`)
- [x] 4.4 Seed 3 works: one in the series at position 1 (with subtitle and aliases), one in the series at position 3, one standalone
- [x] 4.5 Seed 2 editions: one with a translator contributor, one with publisher but no translator
- [x] 4.6 Seed 3 copies: one fully-read (finished read-through with 4 page log entries + rating), one currently reading (2 page log entries), one unread (no read-throughs); at least one with aliases
- [x] 4.7 Seed 1 copy with loan history: one overdue loan (no returned_date, expected in past) and one returned loan
- [x] 4.8 Seed 4 notes with tags: two linked to the finished read-through, one linked to the active read-through, one standalone; each with distinct tags

## 5. CLI verification script

- [x] 5.1 Create `server/src/scripts/verify-obsidian.sh` that runs Obsidian CLI checks against the `book-tracker-data` vault
- [x] 5.2 Check `unresolved` returns zero results
- [x] 5.3 Check `backlinks` for a work file returns incoming links from copies and editions
- [x] 5.4 Check `aliases` returns non-empty output
- [x] 5.5 Check `tags` returns non-empty output
- [x] 5.6 Check `search query="not in library"` finds the series placeholder text

## 6. OBSIDIAN.md documentation

- [x] 6.1 Create `OBSIDIAN.md` in repository root with sections: vault setup, recommended plugins, Dataview query examples, known limitations
- [x] 6.2 Write Dataview example queries: list all books with authors, show currently reading, show overdue loans, list notes by tag

## 7. Final verification

- [x] 7.1 Run `npm test` — all existing tests pass, new tests pass (390/390 relevant tests pass; 1 pre-existing permissions failure in api.test.ts)
- [x] 7.2 Run the seed script to populate test data
- [x] 7.3 Start the server and verify test data loads into index (21 entities, all with correct aliases, read-throughs, loans, tags)
- [x] 7.4 Run the CLI verification script — all checks pass
- [x] 7.5 Manual Obsidian check: open vault, verify graph view shows connected nodes, backlinks panel works, Dataview queries return expected results, aliases work in quick switcher
