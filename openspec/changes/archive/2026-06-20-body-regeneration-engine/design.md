## Context

The app stores all data in markdown files with YAML frontmatter. The frontmatter is canonical — the markdown body below the `---` delimiters is an auto-generated render intended for human reading in Obsidian. Currently, all entity files have empty or trivial bodies (`""` or `# Title`). This design covers the server-side render engine that generates rich markdown bodies from frontmatter data, plus the client-side display of those bodies on detail pages.

No files are written to disk in this change. Body generation is in-memory only — computed when a detail API endpoint is called, and displayed on the client with `react-markdown`. The follow-up change will wire body generation into save endpoints so bodies are persisted to disk.

## Goals / Non-Goals

**Goals:**
- Provide a single `renderBody(entity, index)` dispatcher that returns a markdown string for any entity
- Generate rich, spec-compliant markdown bodies for all five entity types (Author, Series, Work, Edition, Copy)
- Include cross-entity data (e.g., an Edition body lists its Copies; a Copy body lists its Notes) by querying the in-memory Index
- Expose rendered bodies to the client via a `body` field on existing detail GET endpoints
- Display rendered bodies on client detail pages as a collapsible "Markdown Preview" section
- Test every render function with Vitest, using snapshot-style string assertions

**Non-Goals:**
- Writing bodies to disk on save (separate follow-up change)
- Cascade regeneration (e.g., editing a Work regenerates linked Edition bodies)
- Modifying list endpoints or search results
- Note body rendering (notes have user-written bodies, not auto-generated)
- Any file system I/O — this change is read-only regarding disk

## Decisions

### 1. Single file location: `server/src/lib/render-body.ts`

The five render functions are all short pure functions that produce markdown strings. They share no complex internal state. A dispatcher ties them together. A single file keeps discovery simple — every body renderer is one `Ctrl+P` away. Splitting into `render-work-body.ts`, `render-copy-body.ts`, etc. would add import overhead for no benefit.

### 2. Dispatcher uses entity `type` field

`renderBody(entity, index)` switches on `entity.type` (`"work" | "edition" | "copy" | "author" | "series"`). Each entity object already carries `type` in its frontmatter, so no extra parameter is needed. The function is typed to accept the `Entity` union from `types.ts`.

### 3. Heading generation for Copy and Edition bodies

The heading uses a priority chain to distinguish visually between editions/copies of the same work:

1. `{Work Title} — {Translator} Translation` (if a `translator` contributor exists)
2. `{Work Title} — {Publisher}` (e.g., "Dune — Ace")
3. `{Work Title} — {Format}` (e.g., "Dune — paperback")
4. `{Work Title} — {page_count} pages` (e.g., "Dune — 412 pages")
5. Bare `{Work Title}` (fallback)

The Work title is resolved from the Index using the wikilink in the Edition/Copy frontmatter.

### 4. Date formatting: two styles

- **Read-through section headers**: human-friendly, locale-neutral — `"Jun 1, 2025"` (month abbreviation, day, year). Ranges use `"Jan 10 – Mar 2, 2025"`.
- **Table cells** (read-through page log, loan history): `YYYY-MM-DD` (ISO date-only). This is Obsidian-friendly, sortable as plain text, and matches the existing spec mockups.

### 5. Page log table: newest-first, three columns

The rendered markdown table sorts entries newest-first (matching the frontend `PageLogTable` convention), with three columns: `| Date | Page | % |`. Delta columns (Δ pages, Δ days) are UI-only — the static markdown body omits them. Percentage is computed as `Math.round((page / edition.page_count) * 100)` and shown with `%` suffix. When the edition has no `page_count`, the `%` column shows `—` for all entries.

### 6. Copy body sections

The Copy body is the richest render. Sections, in order:
1. Metadata block (edition link, author link, translator, condition, status, cover image, acquired, location, price)
2. Reading History (one `###` subsection per read-through with a facts-in-heading summary, then a table)
3. Loan History (markdown table: Borrower | Lent | Expected | Returned)
4. Notes (bullet list of `[[wikilinks]]` to note files)

All notes are listed, no limit. Only sections with data appear — if there are no read-throughs, the "Reading History" heading is omitted entirely.

### 7. Author and Series bodies: minimal

- Author body: `# {name}` heading, `## My Works` subheading, bullet list of `[[wikilinks]]` to work files. No copy counts or read status — the body is for Obsidian graph navigation, not data display.
- Series body: `# {name}` heading, ordered numbered list of works (`1. [[works/slug]]`, `2. [[works/slug2]]`). No placeholder entries for works not in the library — the body shows only what exists.

### 8. Optional fields are omitted from the body

If a field is absent in the frontmatter, the corresponding line or section in the body is omitted entirely. For example, if a Work has no `description`, the `## Description` section is not rendered. If a Copy has no `price_amount`, no price line appears. This avoids placeholder text like "Price: —" and keeps bodies clean.

### 9. API response: `body` field always present

The five detail GET endpoints (`/api/works/:slug`, `/api/editions/:slug`, `/api/copies/:slug`, `/api/authors/:slug`, `/api/series/:slug`) call `renderBody()` and include the result as a `body: string` field in their JSON response. No query parameter gating — the body is cheap to compute (string concatenation from in-memory data) and small. Always-on avoids frontend complexity.

### 10. Client display: `<details>` element with `react-markdown`

Each detail page adds a `<details>` element (native HTML collapsible) at the bottom of the page, styled with Tailwind to match the existing UI. Contents are rendered with `<Markdown>` from `react-markdown`, an already-installed dependency used by the note editor. The `<summary>` text reads "Markdown Preview" with a muted style. Default state is closed (collapsed). This keeps the body out of the way while making it available for Obsidian-preview use cases.

### 11. Testing approach

Tests live in `server/src/lib/render-body.test.ts`. Each test:
- Creates a minimal in-memory Index populated with the entity under test and any related entities needed for cross-referencing
- Calls the specific render function (e.g., `renderWorkBody(work, index)`)
- Asserts the output string matches expected markdown using `expect(result).toContain(...)` for key sections and structural elements

Tests cover: each entity type, empty optional fields, multiple editions/copies, multiple read-throughs with page logs, loans, notes wikilinks, and heading priority chain.

## Risks / Trade-offs

- **In-memory rendering is stateless**: Each API call re-renders the body from scratch. For a library of 10,000 entities this is negligible (microseconds of string concatenation). No caching is needed.
- **Body and structured UI may drift**: The rendered body and the structured UI display the same data in different formats. If the frontend adds a field without updating the renderer, the body will be stale. Mitigation: the renderer is the canonical "what does this entity look like" function; the structured UI is a separate concern. Both draw from the same Index data.
- **`react-markdown` in a `<details>` element does not lazy-load**: The body content is fetched with the page data and rendered into the DOM regardless of whether the `<details>` is open. This is acceptable — bodies are typically < 5 KB of markdown.
