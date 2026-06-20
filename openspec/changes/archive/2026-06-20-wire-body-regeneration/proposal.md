## Supersedes

None.

## Why

Entity markdown bodies are rendered in-memory for the web app display but never written to disk on save. Every `.md` file on disk has an empty or trivial body (`""` or `# Title`). When the user opens their library in Obsidian, files show no useful rendered content — no edition lists on Work pages, no reading history tables on Copy pages, no author work lists. The rendering engine exists and is tested, but it's not wired into the save pipeline.

## What Changes

- Every POST and PATCH endpoint that creates or modifies an entity calls `renderBody()` and writes the result as the file's markdown body
- Entity-specific saves regenerate only that entity's body (Work save → Work body, Edition save → Edition body, etc.)
- Read-through mutations (start, log page, transition status, edit entry) regenerate the enclosing Copy body — since read-throughs live in the Copy file's frontmatter
- Loan mutations (create, update, return) regenerate the enclosing Copy body
- Note create and update regenerate the linked Copy body when the note references a copy — the Copy body's `## Notes` section needs to reflect the change
- Quick-add (which creates Work + Edition + Copy in one call) regenerates all three bodies

## Capabilities

### New Capabilities

- `body-persistence`: Writing rendered markdown bodies to disk on every entity save. Covers direct entity saves (Work, Edition, Copy, Author, Series), cascading regeneration (read-through/loan/note mutations regenerate the linked Copy body), and the quick-add multi-entity path.

### Modified Capabilities

None. The API contracts (request/response shapes, status codes) are unchanged. This is purely a server-side disk side effect.

## Impact

- **Affected code**: Six route files — `works.ts`, `editions.ts`, `copies.ts`, `authors.ts`, `series.ts`, `quick-add.ts`, `notes.ts`. The `readAndWriteCopy` helper in `copies.ts` is the primary change point.
- **No API changes**: Responses are identical. No client changes needed.
- **No new dependencies**: `renderBody` is already imported in all route files that need it.
- **Disk impact**: `.md` files become 1–5 KB larger (rich markdown bodies instead of empty strings). Atomic write pattern unchanged.
- **Test impact**: Existing render-body tests already cover body output. No new tests required for the render functions themselves. Route-level integration tests could be added but are not strictly necessary — the wiring has no branching logic.
