## Context

The library has Works, Editions (linked to a Work via `[[works/<slug>]]`), Copies (linked to an Edition via `[[editions/<slug>]]` and to a Work via `[[works/<slug>]]`), and Notes (optionally linked to Work, Edition, and Copy via wikilinks). All entities live as markdown files with YAML frontmatter; an in-memory `Index` mirrors them and exposes lookup methods like `getEditionsByWork(workSlug)`, `getCopiesByWork(workSlug)`, and `getNotesByCopy(copySlug)`.

Today there is no Work-merge primitive. Users accumulate duplicate Works through different ISBN lookups, slightly different titles, or manual entries. The quick-add flow has dedup/`attachToWorkSlug` for *creating* editions against an existing work, but once two Works exist there is no cleanup path.

Key constraints shaping the design:
- **Slugs are immutable.** Edition, Copy, and Note slugs embed parent slugs but are not regenerated when their parent work changes — only the `work` wikilink in their frontmatter is rewritten.
- **Frontmatter is canonical; bodies are auto-generated.** Every rewritten file must have its body re-rendered via `renderBody(entity, index)`.
- **Re-read before write.** Every file rewrite re-reads from disk first and merges fields the merge isn't touching.
- **Atomic writes.** Temp file + rename, never direct write.
- **File watcher drives WebSocket broadcasts.** Routes only touch the index and the filesystem; the watcher emits `upsert`/`remove` events to clients. No manual broadcasting in the handler.

## Goals / Non-Goals

**Goals:**
- Provide a single `POST /api/works/merge` endpoint that fully merges loser into winner in one request.
- Re-parent every dependent entity (Editions, Copies, Notes) onto the winner.
- Absorb non-conflicting loser metadata into the winner (authors/genres/aliases union; scalar fields filled from loser where winner has none; loser's title added as an alias).
- Keep slugs immutable — no edition/copy/note slug regeneration.
- Surface a preview-and-confirm modal from the Work Detail page.

**Non-Goals:**
- Batch merging (multiple losers at once).
- Merge audit log or undo. The file watcher + Obsidian backlinks provide practical recovery; no separate history is kept.
- Renaming dependent slugs to match the winner.
- Separate Loan re-parenting — loans are nested under `Copy.loans[]` and travel with the copy automatically.
- Cross-entity merges (e.g. merging two authors) — Works only.

## Decisions

### D1: Endpoint shape — `POST /api/works/merge` with `{ winner, loser }` body
**Rationale:** Both slugs are peers in the operation; nesting under `POST /api/works/:winner/merge` would imply the winner is "more primary," which carries no meaning. A flat peer-slugs body is symmetric and reads cleanly. Returns the updated winner work on success.

**Alternatives considered:**
- `POST /api/works/:winnerSlug/merge` with `{ loser }` — rejected for the asymmetry reason above.
- `POST /api/works/merge?winner=x&loser=y` — rejected because the operation is not idempotent (it deletes the loser) and modifies server state, so it belongs in the body per HTTP semantics.

### D2: Slug immutability preserved — dependent slugs not regenerated
**Rationale:** AGENTS.md is explicit: "Once a file is created, its slug never changes." Edition slugs embed the work slug (e.g. `the-hobbit-houghton-1937`) and Copy slugs embed the edition slug, so regenerating them would cascade. Keeping slugs as-is means an edition's slug may no longer match its parent work's slug after a merge — that's an accepted cosmetic cost in exchange for stability. The loser's work slug is freed for reuse only after deletion, but nothing should reference it post-merge.

**Alternatives considered:**
- Regenerate dependent slugs to match the winner — rejected; violates immutability and cascades through copies/notes.

### D3: Metadata absorption rules
**Rationale:** Provides sensible "union where it makes sense, winner-precedence for scalars" defaults that the user confirmed:
- **authors** — union, dedupe by author slug
- **genres** — union, dedupe by normalized value (via `normalizeGenre`)
- **aliases** — append loser's aliases to winner's (dedupe by string equality)
- **title** — winner's title always wins; loser's title appended as an alias so future searches by the old title still resolve
- **subtitle, description, primary_cover, series, series_position, original_language, original_publish_year** — winner keeps its value if set; otherwise take the loser's

**Alternatives considered:**
- Field-by-field interactive selection in the modal (Calibre-style) — rejected as scope creep; the absorption rules are predictable enough that an interactive picker adds friction without value.

### D4: Implementation lives in a new `server/src/routes/merge.ts` router
**Rationale:** The merge handler is substantial (multiple file rewrites across entity types) and conceptually distinct from single-entity CRUD. A dedicated router keeps `works.ts` focused. The router is registered in `server/src/index.ts` alongside `/api/works`.

**Alternatives considered:**
- Extend `server/src/routes/works.ts` — rejected; the handler would dominate the file and blur Work-CRUD with cross-entity orchestration.

### D5: Order of operations — re-parent dependents, then absorb metadata, then delete loser
**Rationale:** Re-parenting dependents first ensures the loser has no inbound references by the time it's deleted, so deletion cannot leave dangling wikilinks. Absorbing metadata happens on the winner's file *after* dependents are re-pointed (so `renderBody` sees the winner's final state with all editions). Steps:
1. Resolve winner and loser Works; validate (404 if either missing, 400 if same slug).
2. Collect loser's editions, copies (via `getCopiesByWork`), and notes (notes referencing the loser's work directly — `Note.work === [[works/<loser>]]`).
3. For each note: re-read, rewrite `work` wikilink to winner, re-render body, write atomically, upsert index.
4. For each copy: re-read, rewrite `work` wikilink to winner, re-render body, write atomically, upsert index.
5. For each edition: re-read, rewrite `work` wikilink to winner, re-render body, write atomically, upsert index.
6. Absorb metadata into winner: re-read winner from disk, apply absorption rules, re-render body, write atomically, upsert index.
7. Delete loser work file and `index.remove("work", loser.slug)`.
8. Return updated winner.

**Alternatives considered:**
- Delete loser first, then re-parent — rejected; would create dangling references mid-operation and break `renderBody` lookups that walk the index.

### D6: Note lookup — query notes by `work` wikilink directly
**Rationale:** The `Index` has `getNotesByCopy` but no `getNotesByWork`. Notes have an optional `work` field (a `[[works/<slug>]]` wikilink). The merge handler iterates all notes and filters on `note.work === [[works/<loser>]]`. Adding a `getNotesByWork` helper to the `Index` keeps the route clean and is generally useful.

**Alternatives considered:**
- Inline filter in the route — rejected; an index method is reusable and testable.

### D7: Failure handling — best-effort, errors abort with 500 and partial state left for retry
**Rationale:** A merge touches many files. Wrapping the whole thing in a transaction with rollback would require shadow copies of every file, which is disproportionate for a single-user local app. If a write fails mid-merge, the handler returns 500 with the error; the user re-runs once the underlying issue (disk full, permission, etc.) is resolved. The re-read-before-write rule means a retry is safe: already-reparented entities are simply re-read and rewritten.

**Alternatives considered:**
- Pre-flight snapshot + rollback — rejected as over-engineering for this deployment context.

## Risks / Trade-offs

- **[Cosmetic slug mismatch]** After merge, an edition's slug may reference the loser's old work slug even though its `work` wikilink points to the winner. → Accepted trade-off for slug immutability; backlinks and the in-memory index handle navigation correctly.
- **[Loser slug freed for reuse]** Once the loser is deleted, its slug could be reused by a new work, but search results and backlinks should no longer reference it. → Acceptable; if a stale reference exists it would 404 cleanly, surfacing the problem.
- **[Partial-failure state]** A crash mid-merge leaves some dependents re-parented and others not, with the loser still present. → Mitigated by re-read-before-write on retry; the operation is idempotent for already-reparented entities.
- **[Concurrent edits during merge]** If the user edits an entity in another tab while the merge runs, the re-read-before-write captures the latest state per file, but two rapid merges could race. → Single-user local app; acceptable. The file watcher will reconcile the in-memory index if external edits happen.
- **[Modal confusion]** Users might merge the wrong pair. → Mitigated by the preview step showing edition/copy/note counts and the absorbed metadata before confirmation.
