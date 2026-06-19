# Build Plan

> Each step is an independently implementable unit — one OpenSpec artifact.  
> Steps are ordered; each lists its prerequisites and its deliverable.  
> Vague names ("add CRUD") are avoided. Every step has concrete checkboxes.

---

## S1: Project Scaffold

**Prerequisites:** None

Set up the monorepo: Node.js/Express backend, Vite/React/shadcn frontend, single dev command, health-check roundtrip.

- [x] `server/` — Express + TypeScript, `npm run dev` via tsx
- [x] `client/` — Vite + React + TypeScript + Tailwind + shadcn/ui
- [x] Root `package.json`: `npm run dev` starts both (concurrently)
- [x] Vite proxies `/api/*` to `localhost:3001` in dev
- [x] `GET /api/health` returns `{ status: "ok" }`
- [x] Client calls `/api/health` on mount, displays "OK" from the server

---

## S2: Config + Directory Scaffold

**Prerequisites:** S1

App knows where the library lives. Creates the directory tree on first launch.

- [x] `.booktracker/config.yaml` — `library_path` (default: `~/book-tracker-data/`)
- [x] `GET /api/config` returns config
- [x] `PATCH /api/config` updates library_path
- [x] On startup, create directories if missing: `authors/`, `series/`, `works/`, `editions/`, `copies/`, `notes/`, `attachments/`, `.booktracker/cache/`
- [x] Client: Settings page with library path input

---

## S3: File I/O Primitives + In-Memory Index

**Prerequisites:** S2

Read/write markdown files with YAML frontmatter. Build the index that loads them all at startup.

- [x] `readFile(path)` — parse YAML frontmatter + body, return typed object
- [x] `writeFile(path, frontmatter, body)` — serialize + atomic write (temp file + rename)
- [x] `deleteFile(path)`
- [x] `listFiles(dir)`
- [x] `generateSlug(input, existingSlugs)` — sole slug authority: transliterate, normalize, dedup
- [x] `Index` class — `load()` walks tree, parses all files
- [x] Notes: also load markdown body for search
- [x] Lookup methods: `getWork(slug)`, `getCopy(slug)`, `getWorksByAuthor(slug)`, `getCopiesByEdition(slug)`, `getEditionsByWork(slug)`
- [x] `searchWorks(query)` — filter by title/author/genre
- [x] Index updates on write: `index.upsert(entity)`, `index.remove(type, slug)`
- [x] Log startup time; verify <1s for 500 test files

---

## S4: Work API

**Prerequisites:** S3

Full CRUD for Work entities over REST.

- [x] `POST /api/works` — create Work file + update index
- [x] `GET /api/works` — list all, with `?q=&sort=&order=` params
- [x] `GET /api/works/:slug` — single work, resolves edition + copy counts
- [x] `PATCH /api/works/:slug` — update fields (title, subtitle, authors, genres, description, series, series_position, primary_cover)
- [x] `DELETE /api/works/:slug` — orphan-protected (refuse if editions exist, cascade override)

---

## S5: Author API

**Prerequisites:** S3

Full CRUD for Author entities.

- [x] `POST /api/authors` — create Author file, slug from name
- [x] `GET /api/authors` — list all
- [x] `GET /api/authors/:slug` — single author, resolves list of works
- [x] `PATCH /api/authors/:slug` — update name/aliases
- [x] `DELETE /api/authors/:slug` — orphan-protected (refuse if works link to this author, cascade override)

---

## S6: Edition API

**Prerequisites:** S3, S4 (editions link to works)

Full CRUD for Edition entities.

- [x] `POST /api/editions` — create Edition file, links to Work via wikilink
- [x] `GET /api/editions` — list all
- [x] `GET /api/editions/:slug` — single edition, resolves copy count
- [x] `PATCH /api/editions/:slug` — update fields (isbn, publisher, publish_date, page_count, format, language, contributors)
- [x] `DELETE /api/editions/:slug` — orphan-protected (refuse if copies exist, cascade override)

---

## S7: Copy API

**Prerequisites:** S3, S4, S6 (copies link to editions and works)

Full CRUD for Copy entities.

- [x] `POST /api/copies` — create Copy file, links to Edition + Work via wikilinks
- [x] `GET /api/copies/:slug` — full copy detail, resolves edition/work metadata
- [x] `PATCH /api/copies/:slug` — update fields (condition, location, cover_image, release_date, acquisition_date, acquisition_source, price_amount, price_currency, status)
- [x] `DELETE /api/copies/:slug` — confirmation dialog, hard delete

---

## S8: Series API

**Prerequisites:** S3

Full CRUD for Series entities.

- [x] `POST /api/series` — create Series file
- [x] `GET /api/series` — list all
- [x] `GET /api/series/:slug` — single series, resolves works ordered by `series_position`
- [x] `PATCH /api/series/:slug` — update name, total_works
- [x] `DELETE /api/series/:slug` — orphan-protected (refuse if works link to this series; cascade clears series link from works)

---

## S9: Work Grid + Work Detail (Frontend)

**Prerequisites:** S4, S5

The main user-facing pages: searchable grid of works, full work detail with editions and copies.

- [x] Work Grid page (`/`):
  - Cover thumbnails in a responsive grid (2 cols mobile, 3–4 cols desktop)
  - Search bar: live filter by title/author/genre
  - Sort: title, author, date added
  - Filter: genre, reading_status
  - Each card: cover, title, author, reading_status badge, copy count
  - Click → Work Detail
  - Empty state: "No books yet. Add your first book."
- [x] Work Detail page (`/works/:slug`):
  - Metadata section: cover, title, authors (clickable → Author Detail), original language, genres, description
  - Series link (if set)
  - Editions section: grouped by edition, each with copy cards
  - Copy cards: format, condition, status badge, location, read-through status, note count, acquisition source, loan badge
  - Recent Notes section: aggregated across all copies
  - Edit Work button → inline or modal form

---

## S10: Author + Series Detail Pages (Frontend)

**Prerequisites:** S5, S8, S9

Navigation hubs for authors and series.

- [x] Author Detail (`/authors/:slug`):
  - Author name + aliases
  - Works list: cover thumbnail, title, copy count, aggregate read status
  - Sorted alphabetically by title (interaction data not yet available)
  - Edit Author button
- [x] Series Detail (`/series/:slug`):
  - Series name
  - Ordered work list by `series_position`: #1 title + read status, #2 title + read status, ...
  - Placeholders for books not yet in library (if `total_works` is set)
  - Edit Series button

---

## S11: Edition + Copy Detail Pages (Frontend)

**Prerequisites:** S6, S7, S9

Detail views for editions and copies.

- [x] Edition Detail (`/editions/:slug`):
  - Metadata: publisher, date, pages, format, language, ISBN, contributors (translator, etc.)
  - Link back to Work
  - Copies list: card per copy with status, location, read progress
  - Add Copy button
  - Edit Edition button
- [x] Copy Detail (`/copies/:slug`):
  - Metadata: links to Work + Edition, format, condition, status, cover image, location, acquisition info, price
  - Sections with empty states: Read-through History, Loan History, Notes
  - Edit Copy button

---

## S12: Manual Add Flow

**Prerequisites:** S4, S5, S6, S7, S9

Create a Work + Edition + Copy in one form, without barcode or ISBN lookup.

- [x] Client: "Add Manually" button in grid header
- [x] Multi-step or single-page form:
  - Title* (required), subtitle
  - Author(s)* — dropdown of existing authors + "create new" with name input
  - Edition fields: ISBN (optional), publisher, publish_date, page_count, format, language, contributors
  - Copy fields: condition, acquisition_date, acquisition_source, price_amount, price_currency, location, cover_image
- [x] Server: `POST /api/quick-add` (manual mode — no ISBN lookup)
  - Creates Author(s) if new
  - Creates Work, Edition, Copy
  - Returns `{ workSlug }`
- [x] Redirect to new Work Detail on success

---

## S13: ISBN Lookup Service

**Prerequisites:** S3

Given an ISBN, return structured book metadata from open APIs.

- [x] `lookupISBN(isbn)` function:
  - Primary: Open Library API (`openlibrary.org/isbn/{isbn}.json`)
  - Fallback: Google Books API
  - Returns: title, subtitle, authors[], publisher, publish_date, page_count, format, language, genres, description, cover_url, contributors[] (when available)
  - [x] Download cover image to `attachments/{slug}-cover.jpg`
- [x] Cache results in `.booktracker/cache/{isbn}.json`
- [x] Handle failures: return error with message "Couldn't find this ISBN"
- [x] Rate limiting: track request count, respect API limits

---

## S14: Barcode Scanner Component

**Prerequisites:** S1 (client exists)

Scan ISBN barcodes from device camera.

- [x] Integrate `html5-qrcode` or `zxing-js/library`
- [x] Camera permission request on first use
- [x] Viewfinder overlay with cancel button
- [x] On detection: beep/vibrate, capture ISBN, close camera
- [x] Fallback if camera denied: show manual ISBN input field
- [x] Desktop: use webcam. If no webcam, show manual ISBN input.
- [x] Component is reusable: `<BarcodeScanner onScan={(isbn) => ...} />`

---

## S15: Author Find-or-Create

**Prerequisites:** S5

Resolve author name strings from API to existing or new Author files.

- [x] `findOrCreateAuthors(names: string[]): {slug, name, isNew}[]`
- [x] For each name: check all Authors for exact match on `name` or `aliases` (case-insensitive, whitespace-normalized)
- [x] Match → return existing slug. No match → create new Author, return new slug.
- [x] No fuzzy matching (transliteration variants create a new Author; user corrects on preview)

---

## S16: Quick Add with Scan (Full Flow)

**Prerequisites:** S12, S13, S14, S15

End-to-end: scan barcode → ISBN lookup → author matching → dedup → preview → create.

- [x] Quick Add page: "Scan" button + "Enter ISBN manually" input
- [x] On scan/ISBN entry: call `lookupISBN`, then `findOrCreateAuthors`, then check dedup
- [x] Dedup checks:
  - ISBN exact match on Edition → "This edition exists. Add another copy?"
  - Title+author fuzzy match on Work → "This might be '[existing title]'. Attach to existing or create new?"
- [x] Preview screen: all fetched data displayed, author links shown (matched existing / new), cover image, all fields editable
- [x] User can correct author links via dropdown if API returned wrong match
- [x] Copy-specific fields: condition, source, location, price (optional, can skip)
- [x] Confirm → `POST /api/quick-add` (with ISBN data)
- [x] Server: same as S12 but enriched with API data. Attaching to existing Work never modifies Work's metadata.
- [x] Success → toast + navigate to Work Detail

---

## S17: Read-through Backend

**Prerequisites:** S7

Read-through state machine: start, log pages, finish, DNF, pause, re-read, correct mistakes.

- [x] `POST /api/copies/:slug/read-throughs` — start new read-through
  - Validates: only one `status: reading` at a time
  - Sets `started_date`, `status: reading`
- [x] `POST /api/copies/:slug/read-throughs/:startedDate/log` — log a page
  - Validates: page ≥ last entry, ≤ edition's page_count
  - If page == page_count → returns `{ finished: true }` for frontend prompt
- [x] `PATCH /api/copies/:slug/read-throughs/:startedDate` — change status
  - `finish`: sets `finished_date`, optional `rating`
  - `dnf`: sets `finished_date`
  - `pause`: sets `status: paused` (manual only)
  - `resume`: sets `status: reading`
- [x] `PATCH /api/copies/:slug/read-throughs/:startedDate/entries/:date` — edit a page log entry
- [x] `DELETE /api/copies/:slug/read-throughs/:startedDate/entries/:date` — delete entry; recheck monotonicity
- [x] `DELETE /api/copies/:slug/read-throughs/:startedDate` — delete entire read-through

---

## S18: Read-through Frontend

**Prerequisites:** S11 (Copy Detail exists), S17

Display and interact with read-throughs on Copy Detail and Work Grid.

- [x] Copy Detail — Read-through History section:
  - Each read-through: status badge, started/finished dates, rating if finished
  - Page log table: date, page, %, Δ pages, Δ days (newest first)
  - "Start new read-through" button
  - Active read-through: "Log page count" form (page number + date + optional note)
  - "Finish" / "DNF" / "Pause" / "Resume" actions
  - Edit/delete individual page log entries (inline or modal)
  - "Undo last entry" shortcut button
- [x] Copy card on Work Detail: shows current read-through status + page progress

---

## S19: Notes Backend + Frontend

**Prerequisites:** S7, S11

Full CRUD for freeform markdown notes attached to copies, with timeline display.

- [ ] `POST /api/notes` — create Note file
  - Filename: `YYYY-MM-DD-HHMMSS.md`
  - Frontmatter: date, modified, copy, edition, work, read_through (optional started_date), context_page (optional), tags
  - Body: user's markdown
- [ ] `GET /api/notes/:filename` — single note
- [ ] `PATCH /api/notes/:filename` — update content, set modified
- [ ] `DELETE /api/notes/:filename` — confirmation, hard delete
- [ ] Index: load note body text for search (already built in S3, verify it works)
- [ ] Client: Note editor with markdown preview toggle
- [ ] Copy Detail — Notes timeline: newest first, each note shows date, read-through context, excerpt, tags
- [ ] Work Detail — Recent Notes: aggregated across all copies, newest first
- [ ] Note creation: "Add Note" button on Copy Detail or Work Detail (auto-links to active copy/read-through)

---

## S20: Loans Backend + Frontend

**Prerequisites:** S7, S11

Lend books, track who has them, see history.

- [ ] `POST /api/copies/:slug/loans` — create a loan
  - Sets `borrower_name`, `lent_date`, `expected_return_date` (optional)
  - If active read-through: auto-pause it
  - Sets copy `status: lent`
- [ ] `PATCH /api/copies/:slug/loans/:lentDate/return` — mark returned
  - Sets `returned_date`, copy `status: owned`
  - Read-through stays paused (user resumes manually)
- [ ] Copy Detail — Loan History table: Borrower, Lent, Expected, Returned
- [ ] Copy card on Work Detail: red "Lent" badge + borrower name
- [ ] Overdue highlight if `expected_return_date` passed and not returned
- [ ] Block new read-throughs on lent copies (validation in S17)

---

## S21: Statistics Backend

**Prerequisites:** S4, S7, S17, S19

Compute all library and reading statistics from the index.

- [ ] `GET /api/stats?year=2025` — compute stats
  - Library snapshot: total works, editions, copies; by format, status, condition, genre, language
  - Reading: read-throughs finished this year, currently reading, total pages read (max(page_log) per read-through, includes DNF + in-progress), average pages/day, average rating per work/author, copies acquired this year
  - Notes: total notes, notes/month, most-annotated works
- [ ] Support `?year=all` and custom date ranges
- [ ] All calculations run against the in-memory index (no disk reads)

---

## S22: Statistics Frontend

**Prerequisites:** S21

Dashboard page with library and reading stats.

- [ ] New page: `/stats`
- [ ] Time range selector: This Year / Last Year / All Time / Custom
- [ ] Library snapshot section: summary cards (total works, copies) + breakdown sections (by format, status, condition, genre, language)
- [ ] Reading stats section: finished books, currently reading, total pages, pages/day, avg rating
- [ ] Note stats section: total notes, per-month, most-annotated works
- [ ] Navigation: add to bottom nav bar on mobile, header on desktop

---

## S23: Global Search

**Prerequisites:** S4, S19 (note content in index)

Full-text search across all entity types.

- [ ] `GET /api/search?q=...` — searches works, editions, copies, authors, series, notes, loans
  - Works: title, authors, genres, description
  - Editions: ISBN, publisher
  - Copies: acquisition_source
  - Authors: name
  - Notes: body text
  - Loans: borrower_name
- [ ] Results grouped by entity type, each with relevant snippet/context
- [ ] Client: search bar in header (keyboard shortcut `/` or `Ctrl+K`)
- [ ] Results flyout/dialog with grouped sections
- [ ] Recent searches in localStorage

---

## S24: Body Regeneration Engine

**Prerequisites:** S4, S5, S6, S7, S8

Render markdown bodies from frontmatter + related file data. In-memory on open, written to disk on save.

- [ ] `renderWorkBody(work, index)` — metadata block + editions list (reads Edition files for publisher/year/translator/pages)
- [ ] `renderEditionBody(edition, index)` — metadata + copies list
- [ ] `renderCopyBody(copy, index)` — metadata + read-through tables + loan table + notes list (scans notes directory for backlinks)
- [ ] `renderAuthorBody(author, index)` — works list
- [ ] `renderSeriesBody(series, index)` — ordered works list with read status
- [ ] Client display: bodies regenerated in memory on every detail page load (no disk write)
- [ ] `renderBody(entity, index)` — dispatcher function that picks the right renderer
- [ ] Test: create a work with two editions, render the body, verify markdown output matches spec examples

---

## S25: Wire Body Regeneration into Save Endpoints

**Prerequisites:** S24, all API steps (S4–S8, S12, S16, S17, S19, S20)

Bodies are written to disk on every save operation.

- [ ] Every PATCH/POST endpoint that modifies frontmatter calls `renderBody()` and writes the result to the `.md` file
- [ ] Work saves → regenerate Work body
- [ ] Edition saves → regenerate Edition body
- [ ] Copy saves → regenerate Copy body
- [ ] Author saves → regenerate Author body
- [ ] Series saves → regenerate Series body
- [ ] Note create/edit → regenerate linked Copy body (notes list section)
- [ ] Read-through changes → regenerate linked Copy body (reading history section)
- [ ] Loan changes → regenerate linked Copy body (loan history section)

---

## S26: Obsidian Verification Pass

**Prerequisites:** S25 (bodies on disk)

Open the library as an Obsidian vault and verify everything works.

- [ ] Open `~/book-tracker-data/` as an Obsidian vault
- [ ] `[[wikilinks]]` navigate correctly: Work → Author, Work → Series, Work → Edition → Copy → Note
- [ ] Graph view: shows all entity types as connected nodes
- [ ] Backlinks panel: Works show up on Author pages, Copies show up on Edition pages
- [ ] Frontmatter is queryable with Dataview
- [ ] Markdown bodies are readable and correctly formatted
- [ ] `aliases` work in Obsidian quick switcher and search
- [ ] If issues found: fix and re-verify
- [ ] Document which Obsidian plugins improve the experience (Dataview for dynamic queries)

---

## S27: Genre Normalization

**Prerequisites:** S4 (work PATCH writes genres)

Consistent genre values across the library.

- [ ] Genre input component: autocomplete from existing genres
- [ ] `genres.yaml` in `.booktracker/` populated from all existing genres on startup
- [ ] Normalization on write: lowercase, trim, spaces → hyphens
- [ ] Autocomplete suggests existing genres as user types
- [ ] User can add new genres (free text, normalized on save)
- [ ] `genres.yaml` is user-editable for bulk curation

---

## S28: Mobile Responsiveness

**Prerequisites:** All frontend steps (S9–S12, S16, S18–S20, S22, S23)

App is usable on a phone browser.

- [ ] Work Grid: 2 columns tablet, 1 column phone
- [ ] Bottom navigation bar (mobile only): Grid | Stats | Scan | Settings
- [ ] All touch targets ≥ 44px
- [ ] Search bar fixed at top, filters in slide-out bottom sheet
- [ ] Forms: full-width inputs, large tap targets
- [ ] Modals/dialogs: full-width on mobile, centered on desktop
- [ ] Tables (page log, loan history): horizontal scroll or card layout on mobile
- [ ] Barcode scanner works on mobile (verify on real device)

---

## S29: Dark Mode

**Prerequisites:** S1 (Tailwind + shadcn set up)

Standard dark mode support.

- [ ] shadcn/ui dark mode provider
- [ ] Tailwind `dark:` classes for custom components
- [ ] Toggle in header or settings page
- [ ] Persist preference in localStorage
- [ ] Default: respect `prefers-color-scheme` system setting
- [ ] Verify every page looks correct in both modes

---

## S30: Accessibility

**Prerequisites:** S28, S29

WCAG AA compliance for core flows.

- [ ] Semantic HTML audit: headings (h1–h4), landmarks (nav, main, aside), lists, tables
- [ ] Keyboard navigation: Tab through all interactive elements, Enter to activate, Escape to close modals, arrow keys in grid
- [ ] Focus indicators: visible on all interactive elements
- [ ] Color contrast: verify with automated tool, fix failures
- [ ] Screen reader: labels on all inputs, buttons, links; alt text on covers
- [ ] shadcn/ui components are accessible by default — verify each one used passes

---

## S31: File Watching (Nice-to-Have)

**Prerequisites:** S3, S25

Live index update when files change externally (e.g., Obsidian edit).

- [ ] `chokidar.watch(libraryPath)` — watch all `.md` files
- [ ] On change: re-parse the file, update in-memory index
- [ ] If client has a page open showing the changed entity, push update via WebSocket or polling
- [ ] Documented constraint remains: simultaneous editing unsupported

---

## S32: Edge Cases & Empty States

**Prerequisites:** All frontend steps

Handle unusual but real situations gracefully.

- [ ] Empty library: "No books yet. [Add your first book]" + scan/add buttons
- [ ] Loading states: skeleton cards/spinners while data loads
- [ ] Error states: API failures show error message + retry button
- [ ] Long titles/authors: truncation with tooltip on hover
- [ ] Missing cover images: placeholder thumbnail
- [ ] No-ISBN editions: display "ISBN: —"
- [ ] Zero-author Works (after Author cascade-delete): display gracefully, prompt to add author
- [ ] Very large library test: generate 1000+ test files, verify index load <2s, grid filter <100ms

---

## S33: Export Endpoint

**Prerequisites:** S3

User can get their entire library as a zip file.

- [ ] `GET /api/export` — zip the library directory, stream the download
- [ ] Frontend: "Export Library" button in Settings
- [ ] Document in-app: "Your data lives in `~/book-tracker-data/`. Back it up like any other folder."

---

## Dependency Graph

```
S1 ──→ S2 ──→ S3 ──┬──→ S4 ──→ S9 ──┬──→ S12 ──→ S16
                    │                  │
                    ├──→ S5 ──→ S10    ├──→ S11 ──┬──→ S18
                    │                  │           │
                    ├──→ S6 ──→ S11    │           ├──→ S19
                    │                  │           │
                    ├──→ S7 ──→ S11    │           ├──→ S20
                    │   │              │           │
                    ├──→ S8 ──→ S10    │           └──→ S17
                    │                  │
                    └──→ S13 ──→ S15   │
                         │             │
                         └──→ S14      │
                                       │
              S21 ←── S4+S7+S17+S19    │
              S22 ←── S21              │
              S23 ←── S4+S19           │
              S24 ←── S4–S8            │
              S25 ←── S24+S12+S16+     │
                      S17+S19+S20      │
              S26 ←── S25              │
              S27 ←── S4               │
              S28 ←── S9–S23           │
              S29 ←── S1               │
              S30 ←── S28+S29          │
              S31 ←── S3+S25           │
              S32 ←── S9–S25           │
              S33 ←── S3               │
```

## Summary

| Step | Name | Est. effort |
|------|------|------------|
| S1 | Project Scaffold | 1 evening |
| S2 | Config + Directory Scaffold | 1 evening |
| S3 | File I/O + In-Memory Index | 2 evenings |
| S4 | Work API | 1 evening |
| S5 | Author API | 1 evening |
| S6 | Edition API | 1 evening |
| S7 | Copy API | 1 evening |
| S8 | Series API | 1 evening |
| S9 | Work Grid + Detail | 2 evenings |
| S10 | Author + Series Detail | 1 evening |
| S11 | Edition + Copy Detail | 2 evenings |
| S12 | Manual Add Flow | 1 evening |
| S13 | ISBN Lookup Service | 1 evening |
| S14 | Barcode Scanner Component | 1 evening |
| S15 | Author Find-or-Create | 1 evening |
| S16 | Quick Add with Scan | 1 evening |
| S17 | Read-through Backend | 1 evening |
| S18 | Read-through Frontend | 1 evening |
| S19 | Notes | 2 evenings |
| S20 | Loans | 1 evening |
| S21 | Statistics Backend | 1 evening |
| S22 | Statistics Frontend | 1 evening |
| S23 | Global Search | 1 evening |
| S24 | Body Regeneration Engine | 2 evenings |
| S25 | Wire Regeneration into Saves | 1 evening |
| S26 | Obsidian Verification | 1 evening |
| S27 | Genre Normalization | 1 evening |
| S28 | Mobile Responsiveness | 2 evenings |
| S29 | Dark Mode | 1 evening |
| S30 | Accessibility | 1 evening |
| S31 | File Watching | 1 evening |
| S32 | Edge Cases & Empty States | 1 evening |
| S33 | Export | 1 evening |

**Total: ~40 evenings.** Each step is ~1–4 hours of focused work and produces a verifiable, mergeable changeset suitable for one OpenSpec artifact.
