## Why

When users add books via the Quick Add flow (manual or ISBN lookup), the API returns author name strings, not existing library slugs. The app needs to match these name strings to existing Author files or create new ones. This logic is currently inlined in the quick-add route handler. Extracting it into a reusable utility prepares it for the forthcoming full Quick-Add-with-Scan flow (ISBN lookup + preview) and makes it independently testable.

## What Changes

- Extract the inline `findOrCreateAuthor` logic from `server/src/routes/quick-add.ts` into a new shared module `server/src/lib/authors.ts`
- Expose `findOrCreateAuthors(names: string[]): {slug, name, isNew}[]` — accepts an array of author name strings, resolves each to an existing or new Author slug
- Matching strategy: case-insensitive, whitespace-normalized exact match against each Author's `name` and `aliases` fields; no fuzzy matching
- On no match: create a new Author file and index entry, return the new slug
- Refactor the quick-add route to use the extracted utility
- Add dedicated unit tests for the `findOrCreateAuthors` function

## Capabilities

### New Capabilities
- `author-find-or-create`: Resolves an array of author name strings to existing or newly created Author slugs. Matches by case-insensitive, whitespace-normalized exact comparison against Author `name` and `aliases`. Creates new Author files with generated slugs when no match is found. No fuzzy or transliteration-based matching.

### Modified Capabilities
<!-- None -->

## Impact

- New server module: `server/src/lib/authors.ts` (find-or-create utility)
- New test file: `server/src/lib/authors.test.ts`
- Modified: `server/src/routes/quick-add.ts` (refactor to use extracted utility)
- No breaking changes to routes, API contracts, or data model
- No new npm dependencies
