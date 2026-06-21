## Context

Genres are stored as raw `string[]` in Work frontmatter with zero validation or normalization. The frontend `EditWorkModal` uses a comma-separated text input. The ISBN lookup results include genres but the quick-add flow drops them. The Work Grid filter chips deduplicate by exact string match, so "Science Fiction" and "science fiction" appear as separate chips. The stats page's `works_by_genre` chart suffers the same problem. The spec and conventions call for normalized genre values (lowercase, trimmed, spaces→hyphens) with a controlled vocabulary file.

## Goals / Non-Goals

**Goals:**
- Normalize every genre string to a consistent kebab-case form using `limax` (the same library used for slug generation)
- Maintain a curated controlled vocabulary as a flat YAML file at `.booktracker/genres.yaml`
- Seed the controlled vocabulary from existing works on first startup
- Provide `GET /api/genres` and `PATCH /api/genres` endpoints
- Normalize genres on every write path (POST/PATCH works, quick-add)
- Normalize genres on read in the stats endpoint for accurate aggregation
- Replace the comma-separated genre text input with a chip-autocomplete component
- Fix quick-add to pass genres from lookup data through to the created Work
- Add genre curation UI to the Settings page

**Non-Goals:**
- Normalizing genres in the search endpoint (already case-insensitive)
- Normalizing genres on disk proactively (lazy: only on next write)
- File watching for `genres.yaml` external changes (future work)
- Changing note tags (free-form, different domain)

## Decisions

### 1. Use `limax` for normalization, not a simpler transform

`limax` handles Unicode folding (ñ → n, é → e, č → c), strips punctuation (`children's` → `childrens`), collapses whitespace, and produces kebab-case. A simpler case+space-only transform would leave apostrophes, dashes, and other characters that cause subtle duplication ("sci-fi" ≠ "Sci-Fi" ≠ "sci fi"). Using the same library as slug generation is consistent and battle-tested.

### 2. Normalization function lives in `server/src/lib/genres.ts`

A standalone utility module keeps the logic centralized. Exports: `normalizeGenre(s: string): string`, `readGenresYaml()`, `writeGenresYaml(genres: string[])`, `seedGenresYaml(index)`, and `loadAllGenres(index)` (merges curated + discovered). Routes import what they need.

### 3. Lazy normalization, not one-shot migration

Files on disk are not rewritten to normalize existing genres. Normalization happens only when the user saves a Work (POST or PATCH). This avoids modifying files without explicit user action, generating git/backup noise, or risking data loss on edge cases. The stats endpoint normalizes on read to bridge the mixed-state gap.

### 4. `genres.yaml` is a flat list, not a keyed structure

`genres:` followed by a YAML list of strings. No metadata, no usage counts, no structure. This is the simplest format that's both human-editable and machine-parseable. It aligns with the convention that users can edit it in a text editor.

### 5. `GET /api/genres` returns curated + discovered, merged and deduplicated

The curated list from `genres.yaml` is the base. Any genres found in existing Work files that aren't in the curated list are appended. This lets the autocomplete surface all known genres immediately, even before the user curates them into the file. The response is a deduplicated, sorted array of strings.

### 6. `PATCH /api/genres` replaces the entire list

The request body is `{ genres: string[] }`. It replaces `genres.yaml` entirely. No orphan protection — removing a genre from the curated list doesn't change works on disk, it only removes it from autocomplete suggestions. If that genre still exists in works, it reappears in the merged response from `GET /api/genres` on next restart.

### 7. GenreSelector follows the AuthorSelector pattern

The existing `AuthorSelector` component is a chip-autocomplete: text input with dropdown suggestions, selected items as removable chip badges, "Create new" button when no match exists, click-outside-to-close behavior. `GenreSelector` follows the same pattern with lighter weight — it doesn't need to fetch an entity list on mount; it uses `GET /api/genres` for the suggestion list and the "create new" path just normalizes the free-text input. Selected values are plain strings (not `{ slug, name }` objects like authors).

### 8. Settings page genre curation via textarea

A `<textarea>` showing one genre per line, fetched from `GET /api/genres`, with a save button that sends `PATCH /api/genres` with the parsed array. Simpler than a full tag-editing UI, aligns with "bulk curation" intent. Users can also edit `genres.yaml` directly in a text editor.

### 9. Quick-add genres come from the request body, not the lookup data server-side

The server's `POST /api/quick-add` already accepts arbitrary fields (title, subtitle, publisher, etc.). Adding `genres` to the accepted fields is a one-line change. The client-side `AddBook` page already receives `genres` in the lookup response object — it just needs to pass them through in the request body. No additional API call needed.

## Risks / Trade-offs

- **Risk:** Two genre strings that are semantically different collapse to the same normalized form (e.g., "c#" meaning C-sharp programming vs. C# music key). → **Mitigation:** Extremely unlikely in book genres. `limax` preserves numbers, so "c#" becomes "c" which is meaningless anyway. Genre vocabulary is natural language.
- **Risk:** User has personally meaningful capitalization in genre names. → **Mitigation:** Genres are identifiers, not display text. The app can title-case them for display if desired later. For now, the filter chips and badges show the normalized form.
- **Risk:** `genres.yaml` grows stale because it's only read on startup. → **Mitigation:** The `GET /api/genres` endpoint always merges discovered genres from works, so the autocomplete is never stale. The curated list is only for human curation.
- **Risk:** Quick-add genres from API lookups include low-quality or irrelevant categories (Library of Congress subjects, etc.). → **Mitigation:** The genres are still user-correctable — the `AddBook` preview screen shows genres after lookup, and the user can edit before saving. This is an improvement over silently dropping them.

## Migration Plan

1. Deploy server changes first (normalization utility, genres endpoints, write-path normalization, stats normalization)
2. On first startup with no `genres.yaml`, seed it from existing works
3. Deploy client changes (GenreSelector, EditWorkModal update, AddBook fix, Settings curation)
4. Existing unnormalized genres on disk remain untouched until the work's next edit — no data migration step needed
5. Rollback: revert code. The old code ignores `genres.yaml` and doesn't normalize; genres continue working as before.

## Open Questions

None.
