## Supersedes

None.

## Why

`downloadCover()` derives the saved filename from the cover URL's pathname basename. Google Books cover URLs all share the same pathname (`/books/content`), so every Google Books cover overwrites the same file (`content-cover.jpg`). When two books receive their cover via Google Books, both point to that one file and the browser's 1-day cache serves the wrong image for at least one of them.

## What Changes

- Replace the URL-derived filename in `downloadCover()` with `crypto.randomUUID()`, matching the pattern already used by the upload endpoint (`POST /api/attachments/upload`). Extension extraction from the URL is preserved.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a bugfix — no spec-level behavior changes.

## Impact

- `server/src/lib/lookup.ts` — `downloadCover()` function (line 319–321)
- `server/src/lib/lookup.test.ts` — existing test (line 324–328) may need filename assertion loosened
