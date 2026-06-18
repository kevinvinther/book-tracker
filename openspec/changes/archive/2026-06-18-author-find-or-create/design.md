## Context

The `quick-add` route handler currently contains an inline `findOrCreateAuthor` function. This function iterates all authors in the index, performs case-insensitive whitespace-normalized matching against each author's `name` and `aliases`, and creates a new Author file if no match is found. It returns a plain slug string.

The upcoming Quick-Add-with-Scan flow (ISBN lookup → multi-step preview) needs the same logic, but also needs the caller to know whether each author was found or newly created (for UI display on the preview screen). The inline function returns only a slug — the caller can't distinguish existing from new.

Extracting this into a shared utility with a richer return type solves both reuse and the `isNew` need.

## Goals / Non-Goals

**Goals:**
- Extract author resolution into `server/src/lib/authors.ts` as `findOrCreateAuthors(names, index, libraryPath)`
- Return structured results: `{ slug: string; name: string; isNew: boolean }[]`
- Match against both `name` and `aliases` fields, case-insensitive, whitespace-normalized, exact (not fuzzy)
- Create new Author files with generated slugs when no match is found
- Refactor `quick-add.ts` to call the extracted utility
- Provide dedicated unit tests covering all match scenarios

**Non-Goals:**
- No fuzzy/transliteration matching (e.g., "Dostoyevsky" ≠ "Dostoevsky")
- No deduplication of near-duplicate authors in the library
- No UI components — this is a server-side utility
- No API endpoint — this is invoked by other route handlers, not directly by the frontend

## Decisions

### Module location: `server/src/lib/authors.ts`
Following the existing pattern where shared service logic lives in `server/src/lib/` (e.g., `lookup.ts`, `index.ts`, `io.ts`, `slug.ts`). The utility module exports a single function and is called from route handlers that need author resolution.

### Function signature
```ts
function findOrCreateAuthors(
  names: string[],
  index: Index,
  libraryPath: string
): { slug: string; name: string; isNew: boolean }[]
```
The return type includes `isNew` so callers (especially the preview screen in the Quick-Add-with-Scan flow) can distinguish existing authors from newly created ones. The `name` field carries the trim-normalized input name.

### Matching algorithm
For each input name string:
1. Trim and normalize whitespace (collapse all whitespace to single spaces)
2. Compare lowercase against each author's `name` (same normalization)
3. If no match on `name`, compare against each entry in the author's `aliases[]` (same normalization)
4. If a match is found on any author, use that author's slug
5. If no match across all authors, generate a slug from the name via `generateSlug`, create an Author file, upsert into the index, return the new slug with `isNew: true`

This is the exact same algorithm currently in `quick-add.ts`, preserved unchanged.

### No fuzzy matching
Fuzzy matching creates more problems than it solves — false positives are worse than creating a duplicate author that the user can merge later. The preview screen in the Quick-Add-with-Scan flow will show author names so users can spot mismatches before saving.

### Independent of quick-add
The utility receives the `Index` instance and `libraryPath` as parameters (not via module-level closures or globals). This keeps it pure, testable, and reusable from any route handler. It does not import from or depend on `quick-add.ts`.

### File creation uses same conventions as existing Author POST route
New Author files are written to `authors/{slug}.md` with `writeFile`, using the same frontmatter shape (`type: author`, `slug`, `name`, `created_at`, `_schema: 1`) and a simple markdown body (`# {name}`). This matches the existing `POST /api/authors` handler exactly.

## Risks / Trade-offs

- **Duplicate authors from transliteration variants**: "Dostoevsky" and "Dostoyevsky" from different ISBN lookups will create separate Author files. Users must manually reconcile on the preview screen. Mitigation: this is documented behavior. The preview screen in the Quick-Add-with-Scan flow will show author names so users can spot mismatches before saving.
- **Linear scan of all authors**: The matching algorithm iterates every author in the index. For a personal library (even at 1,000 authors), this is instantaneous. No indexing by name is needed at this scale.
- **No idempotency on the slug generation**: If `generateSlug` produces a slug that collides with an existing non-author entity (e.g., a Work), it auto-appends a suffix. This is correct behavior — slugs must be globally unique.
