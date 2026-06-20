## Context

The wire-body-regeneration change writes rendered markdown bodies to every `.md` file on save. These bodies are the primary interface for Obsidian users browsing the vault. Several rendering gaps were identified during code review, and the vault has never been systematically verified as an Obsidian vault. Additionally, the test data at `~/book-tracker-data/` is thin — no read-throughs, loans, notes, aliases, or series — so many rendering paths are untested.

The Obsidian CLI (`~/.local/bin/obsidian`) is available and provides commands for programmatic verification: `unresolved`, `backlinks`, `aliases`, `tags`, `properties`, `orphans`, `deadends`.

## Goals / Non-Goals

**Goals:**
- Fix body rendering gaps so Obsidian users see readable, informative markdown
- Add alias API support for Edition and Copy, normalize Work aliases to match Author/Series
- Create rich test data exercising every entity type, relationship, and feature state
- Automate verification using the Obsidian CLI
- Document recommended Obsidian plugins and Dataview query examples

**Non-Goals:**
- Adding alias form inputs to client-side Edition/Copy detail pages
- Obsidian CSS snippets or theme customization
- File watching for Obsidian edits (separate work)
- Automated Dataview query verification (requires the Dataview plugin and Obsidian GUI)
- Graph view visual testing (CLI can't introspect the graph render)

## Decisions

### 1. Edition wikilink display text: reuse heading priority chain

The `headingSuffix` function already builds a human-readable edition label with the priority: translator name ("Katz Translation") > publisher ("Hodder Paperback") > format ("paperback") > page count ("577 pages"). The Copy body edition wikilink currently shows `[[editions/dune-2|dune-2]]` — raw slug as display text.

**Decision:** Extract an `editionDisplayLabel()` helper function that returns just the label (not "Work Title — Label"). Use it for the wikilink display text. Fall back to `edition.slug` only when the edition has no distinguishing features.

**Alternative considered:** Hard-coding publisher as the display text. Rejected because the priority chain already encodes a well-reasoned ordering (translator is most salient for translated editions, publisher is most salient for English originals, format/page_count are fallbacks for bare editions).

### 2. Work subtitle: italic beneath heading

**Decision:** Render `*{subtitle}*` on its own line after the `# {title}` heading. Follows book typography convention (subtitle in smaller/lighter type below title). Adds no visible complexity — a single line.

**Alternative considered:** Appending to heading with em-dash (`# Dune — A Novel`). Rejected because long titles with long subtitles would create unreadable heading lines.

### 3. Series total_works: numbered placeholders

**Decision:** After the numbered work list, for positions `works.length + 1` through `total_works`, render placeholder lines: `{n}. — (not in library)`. Only when `total_works` is set and exceeds the number of linked works. Matches the web app's Series Detail page behavior.

**Alternative considered:** Just showing "3 of 7 in library" as a summary line. Rejected because the individual placeholder slots are more useful in Obsidian — they show exactly which books you're missing without requiring the reader to count.

### 4. Alias support: normalize to Author/Series pattern

Author and Series accept `aliases` in POST body and PATCH `MUTABLE_FIELDS`. Work has dedicated `POST/DELETE /api/works/:slug/aliases` endpoints but not in POST or PATCH. Edition and Copy declare `aliases?` in TypeScript types but have zero API surface.

**Decision:** Add `"aliases"` to `MUTABLE_FIELDS` for Edition and Copy. Accept `aliases` in POST bodies. Normalize Work by adding `"aliases"` to `MUTABLE_FIELDS` and POST body. Keep all existing dedicated endpoints unchanged. Follow the existing Author pattern: check `Array.isArray(req.body.aliases)` and assign. On PATCH, the re-read-before-write pattern preserves any aliases not touched by the request.

**Alternative considered:** Removing `aliases?` from Edition/Copy types instead. Rejected because the spec's file format examples show aliases on Edition and Copy, and aliases are useful in Obsidian's quick-switcher regardless of entity type.

### 5. Client types: declare but don't expose forms

**Decision:** Add `aliases?: string[]` to client-side `Edition` and `Copy` types in `client/src/lib/types.ts`. This makes the types truthful about what the API returns. Do not add alias input fields to the web app edit forms for these entities — Edition/Copy aliases serve Obsidian, not the web app's editing UX.

### 6. Test data: script-generated, comprehensive

**Decision:** Write a TypeScript script in `server/src/scripts/` that creates markdown files directly in `~/book-tracker-data/`. The script generates:
- 2 authors with aliases
- 1 series (trilogy with `total_works: 3`, only 2 works in library)
- 3 works (2 in the series, 1 standalone) — one with a subtitle
- 2 editions (one with translator, one bare)
- 3 copies with varying states: fully read (finished + rating + 4 log entries), currently reading (2 log entries), unread
- 1 loan (overdue), 1 loan (returned)
- 4 notes (two linked to the finished read-through, one linked to the active read-through, one standalone)

Replaces all existing files in the data directory. Writes directly; no server API calls needed (the script seeds the filesystem directly, then the server's startup index load picks them up).

### 7. CLI verification: bash script with pass/fail output

**Decision:** Write a shell script that invokes the Obsidian CLI against the `book-tracker-data` vault and checks outputs. Each check prints pass/fail. The script runs as part of verification.

Checks:
- `obsidian unresolved` → expect "No unresolved links found"
- `obsidian aliases` → expect non-empty output (multiple entities now have aliases)
- `obsidian tags` → expect non-empty output (notes have tags)
- `obsidian backlinks` per key file → expect expected incoming links
- `obsidian properties name=aliases` → expect files with aliases
- `obsidian search query="not in library"` → expect series placeholder text present

### 8. OBSIDIAN.md: audience is the Obsidian user

**Decision:** Create `OBSIDIAN.md` in the project root. Content:
- How to open the library as an Obsidian vault
- Recommended plugins: Dataview (with example queries), Tag Wrangler
- Dataview query examples: list all books by author, show currently reading, show overdue loans, show notes by tag
- Known limitations: bodies are auto-generated, don't edit them in Obsidian; simultaneous editing unsupported
- How to use aliases in quick-switcher

**Alternative considered:** Adding to README. Rejected because README targets web app users; Obsidian vault users are a distinct audience and would benefit from a focused document.

## Risks / Trade-offs

- **Test data replaces existing data** — Running the seed script destroys any existing test files. Mitigation: the script warns explicitly; existing test data has no user value (it was created by earlier testing).
- **Edition wikilink display text depends on edition data** — If an edition has no translator, publisher, format, or page count, the raw slug remains. Mitigation: this is rare (most editions have at least a format or publisher) and the slug is still a valid wikilink.
- **Series placeholders mark positions after last work, not sparse positions** — If works at positions 1, 3, and 5 are in the library, the body renders them as 1, 2, 3 followed by placeholders for 4 and 5. But missing-book-2 would show as present (work at position 3 becomes #2). This is the same behavior as the web app's Series Detail page and is a limitation of treating `series_position` as the sort key without validating contiguity. Not addressed in this change.
- **CLI verification requires the Obsidian app to be running** — The CLI talks to a running Obsidian instance. Verification script is a development tool, not a CI step.
