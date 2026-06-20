## Context

The body rendering engine (`server/src/lib/render-body.ts`) produces rich markdown bodies for all five entity types. These bodies are currently rendered in-memory when detail API endpoints are called and displayed to the user via `react-markdown` on the client. But the on-disk `.md` files still contain empty or trivial bodies (`""` or `# Title`).

The "re-read before write" convention — where PATCH handlers re-read the target file from disk before merging changes — applies to frontmatter only. The body has been a placeholder because no code was generating it during writes. Now that the render engine exists and is tested, the missing piece is calling it during save operations.

## Goals / Non-Goals

**Goals:**
- Write a fully rendered markdown body to every entity file on every POST and PATCH operation
- Cascade Copy body regeneration on read-through, loan, and note mutations (since those sections live in the Copy body)
- Regenerate all three bodies (Work, Edition, Copy) on quick-add
- Reuse the existing `renderBody()` dispatcher and its type-specific renderers without modification
- Follow existing code patterns (atomic writes, re-read-before-write) without introducing new abstractions

**Non-Goals:**
- Regenerating cascading bodies on DELETE operations
- Regenerating Edition or Work bodies when a Copy changes (those converge on their own next save)
- Creating a new write helper abstraction — changes are localized to existing route handler code
- Modifying any render functions or the `renderBody` dispatcher
- Note body regeneration — notes have user-authored bodies, never auto-generated

## Decisions

### 1. Inline renderBody calls in existing route handlers

Each POST/PATCH handler currently calls `writeFile(filePath, frontmatter, body)` where `body` is a literal `""` or `` `# ${name}` ``. The change replaces that literal with `renderBody(entity, index)`. No new helper function, no middleware, no abstraction layer — just a direct call replacement.

**Why not a `writeEntityWithBody` helper?** The handlers have heterogeneous entity construction patterns (some build objects inline, some mutate frontmatter dicts, some use the `readAndWriteCopy` helper). A single helper would need to handle all these patterns, which creates coupling. Inline calls are obvious, grep-able, and each handler already has access to both the entity object and the index.

### 2. Copy body is rendered inside readAndWriteCopy

The `readAndWriteCopy` helper in `copies.ts` is the single write path for all read-through and loan mutations. It already imports `renderBody`. Changing its `writeFile` call from `""` to `renderBody(copy, index)` automatically covers all six copy-mutation endpoints (start RT, log page, transition status, edit entry, create loan, update/return loan).

The `copy` variable at the point of `writeFile` has been fully mutated by the caller's callback. `renderCopyBody` reads `copy.read_throughs` and `copy.loans` from the object directly, and reads edition/note data from the index (which is already populated for those entities). This is safe.

### 3. Copy PATCH (metadata-only) renders after merging

The `PATCH /api/copies/:slug` handler updates copy metadata (condition, location, status, etc.). It already builds an `updated` Copy object from the merged frontmatter. The change passes `renderBody(updated, index)` instead of `""`.

### 4. Note cascade regenerates Copy body via re-read-then-write

When a note is created or updated and it has a `copy` wikilink, the handler:
1. Extracts the copy slug from `note.copy` (e.g., `[[copies/karamazov-katz-pb]]` → `karamazov-katz-pb`)
2. Re-reads the copy file from disk (`readFile`) to get the canonical frontmatter
3. Renders the body via `renderBody(frontmatter as Copy, index)` — the index already has the new/updated note
4. Writes the copy file with the same frontmatter and the new body

Re-reading respects the "re-read before write" convention. The index has the updated note (because `index.upsert("note", note)` was called before the cascade), so `getNotesByCopy()` returns the correct list.

**Why not regenerate the Edition or Work body for notes?** The Edition body's `## Notes` section lists notes by edition wikilink; the Work body and Author body have no notes section. The build plan only lists note → Copy cascade. Regenerating Edition body on note change adds complexity with marginal benefit.

### 5. Quick-add renders each body at write time

Quick-add creates Work, Edition, and Copy sequentially. Each entity is written to disk immediately after construction and added to the index. The Work body is rendered before the Edition exists in the index, so the Work body's `## Editions` section will be empty on disk. This is acceptable — the body is regenerated on every save, and the user can edit the Work to trigger a full regeneration. The web app's in-memory rendering on detail pages already shows the correct list.

### 6. renderBody throws are surfaced, not swallowed

The render functions are pure string concatenation with no I/O and extensive null-safety (optional chaining throughout). The risk of a throw is minimal and indicates a programming bug. If it does throw, the existing route-level error handling (try/catch blocks or Express default error handler) will surface it — which is preferable to silently writing an empty body and masking the bug.

## Risks / Trade-offs

- **Stale Work body after quick-add**: The Work body written during quick-add won't list the new Edition (the edition hasn't been indexed yet). The body converges on the next save. Risk: low — users editing in Obsidian immediately after quick-add may see a momentarily incomplete body. Mitigation: documented constraint; the Observian user can trigger a re-save from the web app.

- **Disk write amplification**: Previously each save wrote "empty body" (~2 bytes). Now each save writes a 500–5000 byte markdown body. Risk: negligible — markdown files are small, and writes are already atomic (temp file + rename). No latency concerns.

- **Copy body references index state**: `renderCopyBody` reads edition and note data from the index. If the index is stale (e.g., an Obsidian edit between index load and save), the rendered body may not reflect the latest on-disk state. Risk: low — the "re-read before write" convention for each entity's own frontmatter is preserved; only cross-entity index lookups could be slightly stale. Mitigation: the index is updated on every write; file watching will eventually close this gap entirely.

## Migration Plan

No migration needed. All existing files get their bodies upgraded on their next save (the next time any PATCH/POST touches that entity). Until then, the web app renders bodies in-memory on display, so users see full content regardless of what's on disk.

## Open Questions

None.
