## Why

Works exist in the API but reference authors via `[[wikilinks]]`. There's no way to create or manage Author entities — they must be hand-edited into markdown files. The Work creation form needs to offer a dropdown of existing authors and the ability to create new ones, which requires an Author API. Author pages in the frontend need to list an author's works, which requires the index to resolve that relationship.

## What Changes

- **`POST /api/authors`** — create an Author with slug generated from name, persisted to `authors/{slug}.md`
- **`GET /api/authors`** — list all authors
- **`GET /api/authors/:slug`** — single author, resolves list of works linked to this author
- **`PATCH /api/authors/:slug`** — update name and aliases, re-reads before write
- **`DELETE /api/authors/:slug`** — orphan-protected: refuses if works reference this author, cascade override removes the wikilink from all works (leaving them authorless) and deletes the author file

## Capabilities

### New Capabilities

- `author-api`: Full REST CRUD for Author entities — create (slug from name), list, get (with resolved works list), update (name + aliases), delete (orphan-protected with cascade override that strips wikilinks from works).

### Modified Capabilities

- `app-config`: `readConfig` now respects a `BOOKTRACKER_LIBRARY_PATH` environment variable that overrides the config file's `library_path` at runtime (needed for Docker to use `/data` without modifying the config file)
- `dev-environment`: Docker Compose server service now mounts `./data/` to `/data` and sets `BOOKTRACKER_LIBRARY_PATH=/data` so library data lives alongside the project

## Impact

- New file: `server/src/routes/authors.ts`
- Modified: `server/src/index.ts` (register `/api/authors` routes)
- No new dependencies
- No client changes
