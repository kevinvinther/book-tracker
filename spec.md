# Book Diary — Specification v1.0

> Draft for refinement. Everything in this doc is a proposal; nothing is decided until we say it is.

---

## 1. Overview

A personal, data-rich book diary that treats each physical copy as a first-class entity. Your data lives in plain markdown files with YAML frontmatter, fully navigable in Obsidian. The web app provides a polished UI for entry, browsing, and discovery — barcode scanning, ISBN lookup, cover art, statistics.

---

## 2. Data Model

### 2.1 Core Entities

```
Author (a person who wrote one or more Works)
├── name                   (display name — "Fyodor Dostoevsky")
├── aliases                (alternate names and spellings for matching)
├── created_at
└── _schema: 1

Work (the abstract intellectual creation)
├── title                  (required)
├── subtitle               (optional — "A Novel in Four Parts and an Epilogue")
├── authors[]              ([[wikilinks]] → Author files)
├── original_language       (ISO 639-1 — "ru", "en", "fr")
├── original_publish_year   (when the work was first published — distinct from any edition)
├── genres[]
├── description
├── series                 (optional — [[wikilink]] → Series file)
├── series_position         (optional — e.g. 3 for "Book 3 of..."; only present if series is set)
├── primary_cover           (optional — manually pinned cover image path for Work grid)
├── reading_status          (derived — computed, not stored: "reading" | "paused" | "finished" | "dnf" | "unread")
├── created_at              (ISO 8601 datetime — set on file creation, never modified)
└── _schema: 1              (format version for migration — stored once per file)

Series (a sequence of related Works)
├── name                   ("The Dark Tower", "The Lord of the Rings")
├── total_works             (optional — total number of works in the series, for showing placeholders)
├── aliases
├── created_at
└── _schema: 1

Edition (a specific published version)
├── isbn                   (primary lookup identifier; optional — slug is the internal primary key)
├── publisher
├── publish_date
├── page_count
├── format                 (hardcover | paperback | mass-market | ebook | audiobook)
├── language               (ISO 639-1 — may differ from Work.original_language)
├── contributors[]          (people who worked on this edition beyond the author — structured data, not wikilinks)
│   ├── name
│   └── role               ("translator" | "editor" | "illustrator" | "introduction" | "foreword" | "afterword")
├── created_at              (ISO 8601 datetime)
└── _schema: 1

Copy (the physical object on your shelf)
├── copy_id                (unique slug)
├── edition                 ([[wikilink]] → Edition file)
├── work                    ([[wikilink]] → Work file — denormalized for convenience)
├── cover_image             (local file path — this copy's cover/jacket photo)
├── release_date            (when this specific copy/printing was released, if known)
├── condition              (free text — "new", "good", "worn", "water-damaged front cover")
├── acquisition_date
├── acquisition_source      ("bought on vacation in Italy", "gift from Mom")
├── price_amount            (optional — numeric, e.g. 14.50)
├── price_currency          (optional — "EUR", "USD", etc.)
├── location                (optional — "living room shelf", "bedroom stack")
├── status                  (owned | lent | lost | given-away | sold)
├── loans[]                 (loan history)
│   ├── borrower_name
│   ├── lent_date
│   ├── expected_return_date (optional)
│   └── returned_date       (null if outstanding)
├── read_throughs[]         (each complete or in-progress read)
│   ├── started_date        (used as the read-through identifier)
│   ├── finished_date       (null if reading/dnf/paused)
│   ├── status              (reading | finished | dnf | paused)
│   ├── rating              (optional — 0.0 to 10.0, one decimal)
│   └── page_log[]
│       ├── date
│       └── page
├── created_at              (ISO 8601 datetime)
└── _schema: 1

Note (independent markdown file — NOT embedded in Copy YAML)
├── date                    (ISO 8601 datetime — creation time; also serves as created_at)
├── modified                (ISO 8601 datetime — last edit time)
├── copy                    ([[wikilink]] → Copy file)
├── edition                 ([[wikilink]] → Edition file — denormalized)
├── work                    ([[wikilink]] → Work file — denormalized)
├── read_through            (optional — started_date of the read-through)
├── context_page            (optional)
├── tags[]                  (optional)
├── content                 (markdown body — this is the searchable text)
└── _schema: 1
```

### 2.2 Relationships

- One **Author** has many **Works**. One **Work** has at least one **Author** (many-to-many via `[[wikilinks]]` in `authors[]`).
- One **Series** has many **Works**. One **Work** optionally belongs to one **Series** (via `series: "[[series/slug]]"` + `series_position`).
- One **Work** has many **Editions**. One **Edition** has many **Copies**.
- One **Copy** has many **ReadThroughs** and many **Loans**.
- One **ReadThrough** has many **PageLog** entries.
- **Notes** are independent files (not embedded in Copy YAML). A Note references a Copy (and optionally an Edition, a Work, a read-through via `started_date`, and a `context_page`). The relationship is discovered through forward `[[wikilinks]]` in the note's frontmatter or by scanning the `notes/` directory.
- Loans are per-copy, not per-edition.
- Forward references only: Copy → Edition → Work, Note → Copy → Edition → Work, Work → Author, Work → Series, via `[[wikilinks]]`. Reverse navigation uses Obsidian's backlinks panel or Dataview queries.
- **Contributors** (translators, editors, etc.) on Editions are structured `{name, role}` objects, not wikilinks. They are typically one-off relationships and creating Author pages for every translator adds noise to the graph. This can be revisited.
- `_schema` is an integer version number on every file. When the schema changes, the app can detect old-format files and offer migration.

### 2.2.1 Derived Fields

**`reading_status` on Work** is computed, not stored. It answers "what is the current state of this work across all my copies?" Priority ladder (first match wins):

1. If any copy has a read-through with `status: reading` → Work is **reading**
2. Else if any copy has a read-through with `status: paused` → Work is **paused**
3. Else if any copy has a read-through with `status: finished` → Work is **finished**
4. Else if any copy has a read-through with `status: dnf` → Work is **dnf**
5. Else → **unread**

If the grid feels too noisy with this heuristic, an alternative is to show the status of the most recently updated read-through across all copies instead. The derivation rule can be tuned later; the important thing is that it's defined and consistent.

### 2.3 Source of Truth

**Frontmatter is canonical.** The YAML frontmatter is the authoritative data. The markdown body of each file is an **auto-generated render** produced by the web app on every save — intended for human reading in Obsidian, but never edited by hand. If you edit the body in Obsidian, the app will overwrite those changes on the next save from the web app.

For Obsidian-only users who want the body to stay in sync with frontmatter without the web app, Dataview inline queries (e.g., `table page, date from this.file.frontmatter.read_throughs[0].page_log`) can render the same data directly from YAML with no duplication. This requires the Dataview plugin.

---

## 3. File System Layout

Data stored as markdown files in a directory tree. Obsidian can open the root folder directly. **Frontmatter is canonical** — the markdown body in each file is auto-generated by the web app on every save for human reading in Obsidian. Body edits made in Obsidian will be overwritten by the app on next save. See section 2.3 for the rationale and Dataview alternative.

```
library/
├── .booktracker/             # app config / metadata cache (not needed by Obsidian)
│   ├── config.yaml
│   └── cache/                # cached ISBN lookup results
│
├── authors/                  # one file per author
│   ├── fyodor-dostoevsky.md
│   ├── frank-herbert.md
│   └── ...
│
├── series/                   # one file per series
│   ├── the-dark-tower.md
│   └── ...
│
├── works/                    # one file per abstract Work
│   ├── the-brothers-karamazov.md
│   ├── dune.md
│   └── ...
│
├── editions/                 # one file per Edition
│   ├── karamazov-katz-translation.md
│   ├── dune-ace-2005.md
│   └── ...
│
├── copies/                   # one file per physical Copy
│   ├── karamazov-katz-pb.md
│   └── ...
│
├── notes/                    # all notes live here, filenames are timestamps
│   ├── 2024-01-15-143000.md
│   └── ...
│
├── attachments/              # cover images, scanned receipts, etc.
│   └── ...
│
└── templates/                # Obsidian templates (optional convenience)
    ├── author-template.md
    ├── work-template.md
    ├── edition-template.md
    └── copy-template.md
```

### 3.0 Slug Generation

Every file needs a unique, human-readable slug that serves as its filename and identifier within wikilinks.

**Algorithm:**
1. Lowercase the title (or meaningful name for copies)
2. Unicode-fold non-ASCII characters to ASCII equivalents (ñ → n, é → e, č → c). Use a proper transliteration library (e.g., `unidecode` in Python, `transliterate` in Node); do not strip them.
3. Replace any character that is not `[a-z0-9]` or a hyphen with a single hyphen
4. Collapse consecutive hyphens into one
5. Strip leading and trailing hyphens
6. Truncate to 80 characters

**Examples:**
- "The Brothers Karamazov" → `the-brothers-karamazov`
- "Dune" → `dune`
- "Cien años de soledad" → `cien-anos-de-soledad`
- "Čapek's War" → `capeks-war`

**Collision handling:** If the generated slug already exists (e.g., two works both titled "Dune" by different authors), append a disambiguating suffix: `dune-herbert` and `dune-anderson`. The app auto-suggests this on save; the user can override. The suffix is derived from the first author's last name.

**Copy slugs:** For copies, the slug is `{edition-slug}-{descriptor}` where the descriptor is generated from the copy's distinguishing feature (format, condition, acquisition source). Example: `karamazov-katz-translation-pb` or `karamazov-katz-translation-italy`. The user can edit this.

**Note slugs:** Not user-facing. `YYYY-MM-DD-HHMMSS` is always unique at second granularity. If two notes are created in the same second, append `-2`, `-3`, etc.

**Immutability:** Slugs are immutable once a file is created. Renaming a file would break all incoming `[[wikilinks]]` from other files. If the user edits a title (or any field the slug was derived from), the slug stays the same. Obsidian's "rename and update all links" feature can handle this in Obsidian; the web app would need to implement the same behavior. For v1, slugs are immutable and the title can diverge from the slug — the slug is an internal identifier, not a display value.

### 3.1 Author File Format (`authors/{slug}.md`)

```markdown
---
type: author
slug: fyodor-dostoevsky
name: "Fyodor Dostoevsky"
aliases:
  - "Dostoevsky"
  - "F. M. Dostoevsky"
created_at: 2024-01-10T12:00:00
_schema: 1
---

# Fyodor Dostoevsky

## My Works

<!-- Auto-generated: list of works by this author -->
<!-- In Obsidian, view backlinks for a dynamic list. -->

- [[works/the-brothers-karamazov]]
- [[works/crime-and-punishment]]
```

### 3.2 Series File Format (`series/{slug}.md`)

```markdown
---
type: series
slug: the-dark-tower
name: "The Dark Tower"
aliases:
  - "Dark Tower"
created_at: 2024-03-15T18:00:00
_schema: 1
---

# The Dark Tower

## Books in Series

<!-- Auto-generated or backlinks-based in Obsidian. -->

1. [[works/the-gunslinger]]
2. [[works/the-drawing-of-the-three]]
3. [[works/the-waste-lands]]
```

### 3.3 Work File Format (`works/{slug}.md`)

```markdown
---
type: work
slug: the-brothers-karamazov
title: "The Brothers Karamazov"
subtitle: "A Novel in Four Parts and an Epilogue"
authors:
  - "[[authors/fyodor-dostoevsky]]"
original_language: "ru"
original_publish_year: 1880
genres:
  - "fiction"
  - "classic"
  - "russian-literature"
description: >
  The Brothers Karamazov is a passionate philosophical novel set in 19th-century Russia...
primary_cover: "attachments/karamazov-katz-cover.jpg"
created_at: 2024-01-10T12:00:00
aliases:
  - "Karamazov"
  - "Brothers K"
_schema: 1
---

# The Brothers Karamazov

**[[authors/fyodor-dostoevsky|Fyodor Dostoevsky]]** · Originally published 1880 · Russian

## Description

The Brothers Karamazov is a passionate philosophical novel set in 19th-century Russia...

## Editions

<!-- This section is auto-generated by the web app. -->
<!-- In Obsidian, view backlinks for a dynamic list of editions. -->

- [[editions/karamazov-katz-translation]] — Liveright, 2019, translated by Michael R. Katz, 796 pages
- [[editions/karamazov-vintage-1995]] — Vintage Classics, 1995, translated by Pevear & Volokhonsky, 796 pages
```

### 3.4 Edition File Format (`editions/{slug}.md`)

```markdown
---
type: edition
slug: karamazov-katz-translation
work: "[[works/the-brothers-karamazov]]"
isbn: "9781631498233"
publisher: "Liveright"
publish_date: 2019-07-15
page_count: 796
format: paperback
language: "en"
contributors:
  - name: "Michael R. Katz"
    role: "translator"
  - name: "Susan McReynolds"
    role: "introduction"
aliases:
  - "Katz Karamazov"
created_at: 2024-01-10T12:05:00
_schema: 1
---

# The Brothers Karamazov — Katz Translation

**Publisher:** Liveright · **Published:** 2019-07-15  
**Pages:** 796 · **Format:** paperback · **Language:** English  
**ISBN:** 9781631498233  
**Translator:** Michael R. Katz  
**Introduction by:** Susan McReynolds

## My Copies

<!-- This section is auto-generated by the web app. -->
<!-- In Obsidian, view backlinks for a dynamic list of copies. -->

- [[copies/karamazov-katz-pb]] — paperback, good, owned
```

### 3.5 Copy File Format (`copies/{slug}.md`)

```markdown
---
type: copy
slug: karamazov-katz-pb
work: "[[works/the-brothers-karamazov]]"
edition: "[[editions/karamazov-katz-translation]]"
cover_image: "attachments/karamazov-katz-pb-cover.jpg"
release_date: 2019-07-15
condition: good
acquisition_date: 2015-07-12
acquisition_source: "Bought on vacation in Italy, small bookstore in Florence"
price_amount: 14.50
price_currency: "EUR"
location: "living room shelf"
status: owned
aliases:
  - "Karamazov paperback"
  - "Italy Karamazov"
loans:
  - borrower_name: "Sarah"
    lent_date: 2024-05-10
    expected_return_date: 2024-07-01
    returned_date:
read_throughs:
  - started_date: 2024-01-10
    finished_date: 2024-03-02
    status: finished
    rating: 9.0
    page_log:
      - date: 2024-01-10
        page: 0
      - date: 2024-01-15
        page: 147
      - date: 2024-02-01
        page: 312
      - date: 2024-03-02
        page: 796
  - started_date: 2025-06-01
    finished_date:
    status: reading
    rating:
    page_log:
      - date: 2025-06-01
        page: 0
      - date: 2025-06-10
        page: 104
created_at: 2024-01-10T12:10:00
_schema: 1
---

# The Brothers Karamazov — Katz Translation

<!-- Auto-generated: metadata block -->

**Edition:** [[editions/karamazov-katz-translation|Katz Translation]] · Liveright, 2019 · 796 pages
**Author:** [[authors/fyodor-dostoevsky|Fyodor Dostoevsky]]
**Translator:** Michael R. Katz  
**Condition:** good · **Status:** owned  
**Cover:** ![cover](attachments/karamazov-katz-pb-cover.jpg)  
**Acquired:** 2015-07-12 — Bought on vacation in Italy, small bookstore in Florence  
**Location:** living room shelf · **Price:** €14.50

<!-- Auto-generated: reading history -->

## Reading History

### Read-through 1 · Jan 10 – Mar 2, 2024 · Finished · ★ 9.0/10

| Date | Page | % |
|------|------|---|
| 2024-01-10 | 0 | 0% |
| 2024-01-15 | 147 | 18% |
| 2024-02-01 | 312 | 39% |
| 2024-03-02 | 796 | 100% |

### Read-through 2 · Started Jun 1, 2025 · Reading

| Date | Page | % |
|------|------|---|
| 2025-06-01 | 0 | 0% |
| 2025-06-10 | 104 | 13% |

<!-- Auto-generated: loan history -->

## Loan History

| Borrower | Lent | Expected | Returned |
|----------|------|----------|----------|
| Sarah    | 2024-05-10 | 2024-07-01 | — |

<!-- Auto-generated: notes list -->

## Notes

- [[notes/2024-01-15-143000]]
- [[notes/2024-03-02-091500]]
```

### 3.6 Note File Format (`notes/{YYYY-MM-DD-HHMMSS}.md`)

```markdown
---
type: note
date: 2024-01-15T14:30:00
modified: 2024-01-15T14:30:00
copy: "[[copies/karamazov-katz-pb]]"
edition: "[[editions/karamazov-katz-translation]]"
work: "[[works/the-brothers-karamazov]]"
read_through: 2024-01-10
context_page: 147
tags:
  - "reflection"
  - "character-analysis"
_schema: 1
---

The Grand Inquisitor chapter is hitting different on this read. Last time through I was 19
and thought Ivan was clearly right. Now I'm not so sure. The silence of Christ at the end
— is that weakness or is it the only answer that doesn't play the Inquisitor's game?
```

---

## 4. Feature Specifications

### 4.1 Work Grid (Primary View)

**What it is:** The main screen. A searchable, filterable grid of works with cover thumbnails. The cover shown is the copy you most recently interacted with, unless a `primary_cover` is manually pinned on the Work.

**Behaviors:**
- **Grid display:** Cover image + title + authors beneath each cover. Empty cover placeholder for works without one.
- **Search:** Type to filter by title, author, ISBN, genre, or series. Results narrow live as you type.
- **Sort:** By title, author (sorts by Author `name` field), or date added (`created_at`). Ascending/descending toggle.
- **Filter:** By genre, language, series, or by copy-level properties (status, format, condition).
- **View toggle:** Grid (covers) ↔ List (compact rows with more metadata visible).
- **Empty state:** "No books yet. [Add your first book]" with a prominent button.
- **Click a work:** Opens the Work Detail page.

**On mobile:** Grid becomes 2-column. Search bar stays fixed at top. Filters collapse into a bottom-sheet or slide-out panel.

### 4.2 Quick Add

**What it is:** Fastest path to get a book into the system. Minimum friction. Creates up to 4 files in one flow: Author (if new) + Work + Edition + Copy.

**Behaviors:**
- **Barcode scan** (primary): Opens device camera, scans ISBN barcode, auto-fills everything available from ISBN lookup. Confirmation screen shows what was found — user can accept as-is or edit before saving.
- **Manual ISBN entry** (fallback): Type an ISBN, same lookup flow.
- **Pure manual** (fallback): Type title, author(s), ISBN yourself. No lookup.
- **Author find-or-create:** The API returns author name strings. For each author, the app checks for an existing Author file with a matching `name` or `aliases` entry (case-insensitive, whitespace-normalized exact match). If a match is found, the wikilink is set to the existing Author. If no match, a new Author file is created with a generated slug. The user sees the resolved Author links on the preview screen and can correct any mismatches before saving — the app suggests, the user decides. Fuzzy near-matches (transliteration variants like "Dostoyevsky" vs "Dostoevsky") are not auto-resolved; the user selects the correct Author from a dropdown if the API name doesn't match what's in the library.
- **Series find-or-create:** Same logic if the API returns series data. User confirms on preview.
- **Deduplication:** After ISBN lookup, the app checks for an existing Edition with the same ISBN (exact match — this is the primary check). If found, prompt: "This edition is already in your library. Add another copy?" Separately, check for a Work with a fuzzy title+author match (normalized: lowercase, strip articles, collapse whitespace). If a likely match is found, prompt: "This might be the same work. Attach to '[existing work title]' or create a new work?" Fuzzy matches are suggestions, not blockers — the user always chooses.
- **Attaching to an existing Work never modifies the Work's metadata.** The API data (title, subtitle, description, etc.) populates the new Edition only. The existing Work retains the user's curated data.
- **Result:** Creates up to 4 files: Author (if new) + Work (or attaches to existing) + Edition (or attaches to existing) + Copy. Everything can be enriched later.
- **Success feedback:** Brief toast, then navigate to the new Work Detail page or stay on grid (configurable).

### 4.3 Barcode Scanning

**Behaviors:**
- Tap "Scan" button → device camera opens with barcode detection overlay.
- On detection: beep/vibrate, capture ISBN, close camera, trigger lookup.
- Camera permission: request on first use, degrade gracefully if denied (show manual ISBN input).
- Supported formats: EAN-13, UPC-A (standard book barcodes).
- Desktop fallback: webcam scanning via browser API. If unavailable, show manual ISBN entry.

### 4.4 ISBN Lookup

**What it is:** Given an ISBN, fetch book metadata from an open API.

**Data fetched:**
- Title, subtitle
- Authors
- Publisher
- Publication date
- Page count
- Language
- Genres/subjects
- Description/synopsis
- Cover image URL

**Behaviors:**
- Primary source: Open Library API (openlibrary.org) — free, no key required.
- Fallback: Google Books API (requires key, rate-limited but richer data).
- Fetch cover image, download it locally to `attachments/`.
- Show a preview of fetched data before saving. User can correct any field.
- Cache lookup results so re-scanning the same ISBN is instant.
- Handle failures gracefully: "Couldn't find this ISBN. You can enter the details manually."

**Contributors from API:** Open Library and Google Books occasionally return translator, editor, or illustrator data. The lookup attempts to populate `contributors[]` on the Edition when this data is available in the API response. Even when present, API contributor data is often incomplete — it should be treated as a pre-fill suggestion, and the user should review and correct it before saving.

### 4.5 Work Detail Page

**What it is:** The full view for one abstract work — its metadata, all editions, all copies, all read-throughs, all notes across copies, reading stats.

**Layout (desktop):**

```
┌─────────────────────────────────────────────────────┐
│ [Back to grid]                   [Edit work]  [⋯]   │
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│   [Cover]    │  # The Brothers Karamazov            │
│              │  [[authors/fyodor-dostoevsky\|Fyodor Dostoevsky]]                │
│              │  Originally published 1880 · Russian  │
│              │                                      │
│              │  Genres: fiction, classic, russian    │
│              │                                      │
│              │  ## Description                      │
│              │  The Brothers Karamazov is a...      │
│              │                                      │
│              │  ## Editions & Copies                │
│              │                                      │
│              │  ▸ Katz Translation (2019) · 796p    │
│              │  ┌──────────────────────────────┐    │
│              │  │ paperback · good · owned     │    │
│              │  │ Living room shelf            │    │
│              │  │ Read 1: finished · 9.0/10    │    │
│              │  │ Read 2: reading · pg 104     │    │
│              │  │ 3 notes · Bought in Italy    │    │
│              │  └──────────────────────────────┘    │
│              │                                      │
│              │  ▸ Vintage Classics (1995) · 796p    │
│              │  ┌──────────────────────────────┐    │
│              │  │ hardcover · worn · owned     │    │
│              │  │ Bedroom stack                │    │
│              │  │ Unread                       │    │
│              │  └──────────────────────────────┘    │
│              │                                      │
│              │  ## Recent Notes (across all copies) │
│              │  2024-03-02 — Finished! What a...    │
│              │  2024-02-01 — Halfway thoughts...    │
│              │                                      │
├──────────────┴──────────────────────────────────────┤
│ [Add edition/copy]  [Add note]  [Start reading]     │
└─────────────────────────────────────────────────────┘
```

**Copy card** shows:
- Edition name (clickable to Edition detail)
- Format, condition, status badges
- Cover image (copy-specific)
- Location
- Current read-through status (reading/finished/DNF with page progress)
- Rating if finished
- Note count
- Acquisition source (truncated)
- Loan status (if lent: "Lent to X on date", if available: nothing shown)
- Click → opens Copy Detail page

### 4.5.1 Edition Detail Page

**What it is:** A focused view for one edition — its metadata and all copies of that edition.

**Layout:**
```
## The Brothers Karamazov — Katz Translation

**Work:** The Brothers Karamazov (link)
**Publisher:** Liveright · Published: 2019-07-15
**Pages:** 796 · Format: paperback · Language: English
**ISBN:** 9781631498233
**Translator:** Michael R. Katz
**Introduction by:** Susan McReynolds

### Copies (2)
┌──────────────────────────────────────────────┐
│ paperback · good · owned                     │
│ Living room shelf                            │
│ Read 1: finished · 9.0/10 · Read 2: reading  │
│ Bought in Italy                              │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│ paperback · worn · lent to Sarah             │
│ Bedroom stack                                │
│ Unread                                       │
└──────────────────────────────────────────────┘

[Add copy of this edition]  [Edit edition]
```

This is a lightweight page — the Edition file itself is thin in the Obsidian-compatible model. Its main value is grouping copies of the same edition and providing a stable link target from the Work Detail page.

### 4.5.2 Author Detail Page

**What it is:** Minimal page for an author — list of their works with read status.

**Layout:**
```
## Fyodor Dostoevsky

### Works (3)
┌──────────────────────────────────────────────┐
│ [cover] The Brothers Karamazov               │
│ 2 copies · 1 reading · 1 finished            │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│ [cover] Crime and Punishment                 │
│ 1 copy · finished                            │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│ [cover] Notes from Underground               │
│ 1 copy · unread                              │
└──────────────────────────────────────────────┘

[Edit author]
```

Lists all Works that link to this Author via `[[wikilinks]]` in their `authors[]` field. Sorted by most recently interacted-with. Shows copy count and aggregate read status per Work. No stats, no bio, no dates — just a navigation hub.

### 4.5.3 Series Detail Page

**What it is:** Ordered list of works in a series with read status.

**Layout:**
```
## The Dark Tower

### Books (8)

#1 [[works/the-gunslinger|The Gunslinger]]
   1 copy · finished
#2 [[works/the-drawing-of-the-three|The Drawing of the Three]]
   1 copy · finished
#3 [[works/the-waste-lands|The Waste Lands]]
   1 copy · reading · pg 224/512
#4 — (not in library)
...

[Edit series]
```

Works are ordered by `series_position`. Works not yet in your library are shown as placeholders if the series has a known total length (user-set), or omitted if the series length is unspecified. The series length (`total_works`) is an optional field on the Series file for this purpose.

Add `total_works` to the Series entity:

### 4.6 Copy Detail Page

**What it is:** Full detail for one physical copy — its read-throughs, notes, loan history.

**Layout:**
```
## The Brothers Karamazov — Katz Translation

**Work:** The Brothers Karamazov (link)
**Edition:** Katz Translation · Liveright 2019 · 796 pages (link)
**Translator:** Michael R. Katz
**Format:** paperback · Condition: good
**Status:** owned
**Cover:** [image]
**Location:** living room shelf
**Acquired:** 2015-07-12 — Bought on vacation in Italy, small bookstore in Florence
**Price:** €14.50

### Read-through History

#### Read #1 · Jan 10 – Mar 2, 2024 · Finished · Rating: 9.0/10
| Date | Page | % | Δ pages | Δ days |
|------|------|---|---------|--------|
| 2024-03-02 | 796 | 100% | +484 | 29 |
| 2024-02-01 | 312 | 39%  | +165 | 17 |
| 2024-01-15 | 147 | 18%  | +147 | 5  |
| 2024-01-10 | 0   | 0%  | — | — |

#### Read #2 · Started Jun 1, 2025 · Reading
| Date | Page | % | Δ pages | Δ days |
|------|------|---|---------|--------|
| 2025-06-10 | 104 | 13% | +104 | 9 |
| 2025-06-01 | 0   | 0%  | — | — |

[Start new read-through]  [Log page count]

### Loan History
| Borrower | Lent | Expected | Returned |
|----------|------|----------|----------|
| Sarah    | 2024-05-10 | 2024-07-01 | — (still out) |
| Mom      | 2023-01-15 | — | 2023-06-20 |

[Lend this copy]  [Mark as returned]

### Notes
<timeline of notes, newest first, grouped by read-through if applicable>
```

**Read-through states:**
- **reading** — active, has page_log entries, no finished_date
- **finished** — finished_date set, page_log reaches page_count
- **dnf** (did not finish) — finished_date set, page_log < page_count
- **paused** — manually set by the user when they put a book aside; has finished_date unset and no recent page_log entries in practice, but the state is an explicit user action, not auto-detected

Only one read-through can be `reading` at a time. A copy can have multiple read-throughs (re-reads).

### 4.7 Page Count Logging & Read-throughs

**What it is:** Record what page you're on within a read-through. Each read-through is a distinct attempt at reading a copy.

**Behaviors:**
- "Start new read-through" button on Copy Detail creates a new read_through entry with `status: reading`.
- "Log page count" button on Copy Detail (within the current read-through).
- Simple form: current page number (required), date (defaults to today), optional note.
- Page number must be ≥ the last logged page for that read-through and ≤ the edition's page_count.
- When page == page_count, the read-through can be marked as finished. Prompt: "Finished? Want to rate it and add a note?"
- **DNF:** If you abandon a read-through, you can mark it `dnf` with a finished_date. The page log freezes at wherever you stopped.
- **Paused:** Manually set by the user. No auto-detection in v1 — "no page log entry for N days" is deferred as it produces surprising state changes (e.g., after a vacation). The user explicitly marks a read-through as paused when they set a book aside.
- **Re-reads:** Starting a new read-through on a copy that already has one just adds another entry. Each read-through is independent — its own page_log, rating, and linked notes.
- **Only one active read-through** per copy at a time. If you start a new one while another is `reading`, either finish/DNF the old one first, or the app auto-pauses it.
- **Correcting mistakes:** Individual page log entries can be edited or deleted from the Copy Detail page. The monotonicity constraint (page ≥ last entry) is enforced on the final state, not on intermediate edits. Deleting an entry re-checks that the remaining entries are still in order. An "undo last entry" shortcut is available on the copy card for quick corrections.

### 4.8 Notes

**What it is:** Freeform markdown notes attached to a copy, optionally linked to a specific read-through and page.

**Behaviors:**
- "Add note" from Copy Detail or Work Detail (auto-links to the active copy and current read-through).
- Editor: full markdown with preview toggle.
- Optional fields: read_through (started_date of the read-through you're in), context page, tags.
- Notes appear in reverse-chronological timeline on the Copy Detail page, grouped by read-through if applicable.
- On Work Detail: "Recent Notes" aggregating notes from all copies of that work, with copy label.
- Each note gets its own `.md` file in `notes/` named by timestamp: `YYYY-MM-DD-HHMMSS.md`.
- Backlinks in the copy file keep Obsidian navigation working.
- Editing a note: opens the markdown editor. Changes to `content` and `modified` date.
- Deleting a note: confirmation dialog, hard delete.

### 4.9 Loan Tracking

**What it is:** Know who has which copy, when they got it, and whether it's still out.

**Behaviors:**
- "Lend this copy" button on Copy Detail.
- Form: borrower name (free text), lent date (defaults to today), optional expected return date.
- Copy status changes to `lent`. Copy card on Work Detail shows red "Lent" badge + borrower name.
- "Mark as returned" button: sets returned date, changes status back to `owned`.
- Loan history: table of past loans on the Copy Detail page (Borrower, Lent, Expected, Returned).
- "Overdue" highlight: if expected return date has passed and not returned, show a subtle warning on the copy card.
- **Lending + reading interaction:** A copy with `status: lent` cannot have a read-through started on it (the book isn't physically with you). If a copy is lent while a read-through is in progress (`status: reading`), the active read-through is auto-paused and the copy status changes to `lent`. When the copy is returned, the read-through remains paused — the user must manually resume it.

### 4.10 Statistics / Dashboard

**What it is:** A separate page with reading stats and library overview.

**What's shown:**

**Library snapshot:**
- Total works (distinct titles)
- Total editions
- Total copies
- Copies by format (hardcover / paperback / other)
- Copies by status (owned / lent / lost / given away / sold)
- Copies by condition
- Works by genre
- Works by original language
- Works by series

**Reading stats (for a given year or all-time):**
- Read-throughs finished this year
- Currently reading (active read-throughs)
- Total pages read this year (sum of max(page_log.page) across all read-throughs active in the year — includes finished, DNF, and in-progress reads)
- Average pages per day (from page_log deltas across all read-throughs)
- Average rating per work/author
- Copies acquired this year
- Reading pace: pages per day over time

**Time range selector:** This year / last year / all time / custom range.

**Note stats (nice to have):**
- Total notes written
- Notes per month
- Most-annotated works

### 4.11 Search

**What it is:** Global search across your library.

**Behaviors:**
- Search bar always accessible (header).
- Searches: work titles, author names, ISBN, edition names, publisher, series names, note content, borrower names, acquisition sources, tags.
- Results grouped: Works (header), Editions, Copies, Notes, Loans.
- Keyboard shortcut: `/` or `Ctrl+K` to focus search.
- Recent searches remembered locally.

### 4.12 Mobile Support

**What it is:** The app works on a phone browser.

**Behaviors:**
- Responsive layout: grid → 2 columns, single column on very narrow screens.
- Bottom navigation bar (mobile): Grid | Stats | Scan | Settings.
- Touch-friendly targets (min 44px).
- Swipe actions on copy cards (optional, nice-to-have).
- Barcode scanning via phone camera (primary use case for mobile).

### 4.13 Entity Deletion

**What it is:** Rules for deleting Works, Editions, and Copies.

**Copy deletion:**
- A Copy can be deleted directly (not just archived with a status change).
- Works and Editions referencing this Copy are unaffected (the `[[wikilink]]` becomes a dangling link visible in Obsidian's graph).
- Confirmation dialog before deletion.

**Edition deletion:**
- **Orphan protection:** If the Edition has copies referencing it, refuse deletion with: "This edition has N copies. Delete those copies first or reassign them to another edition."
- **Cascade override:** User may choose: "Delete this edition and all N copies?" If confirmed, deletes the edition file and all linked copy files, plus any notes referencing those copies.
- If the Edition has no copies, delete immediately after confirmation.

**Work deletion:**
- **Orphan protection:** If the Work has editions referencing it, refuse deletion with: "This work has N editions. Delete those editions first." (Chains to Edition deletion, which chains to Copy deletion.)
- **Cascade override:** "Delete this work, all N editions, and all M copies?" If confirmed, deletes the work file, all edition files, all copy files, and all notes referencing those copies.
- If the Work has no editions, delete immediately after confirmation.

**Note deletion:**
- Confirmation dialog, hard delete. The linked Copy's body updates on next open.

**Author deletion:**
- **Orphan protection:** If the Author has Works referencing it, refuse deletion with: "This author is linked from N works. Edit those works to remove or reassign the author link first."
- **Cascade override:** "Remove this author from all N works and delete?" If confirmed, removes the `[[wikilink]]` from every affected Work's `authors[]` (may leave Works with zero authors) and deletes the Author file.
- If the Author has no works, delete immediately after confirmation.

**Series deletion:**
- **Orphan protection:** If the Series has Works referencing it, refuse deletion with: "This series is linked from N works. Clear the series link from those works first."
- **Cascade override:** "Clear the series link from all N works and delete?" If confirmed, sets `series` and `series_position` to absent on every affected Work and deletes the Series file. Works are never deleted by Series deletion — the series link is optional.
- If the Series has no works, delete immediately after confirmation.

---

## 5. Data Entry Flows

### 5.1 Quick Add (Happy Path)

```
User taps [Scan]
  → Opens camera
  → Scans ISBN barcode
  → ISBN Lookup fires
  → Author find-or-create:
      - For each author name in API response:
          - Check existing Authors by name + aliases (case-insensitive, whitespace-normalized exact match)
          - If match found → link to existing Author
          - If no match → create new Author file with generated slug
  → Series find-or-create (if API returns series data, same logic)
  → Deduplication check:
      - ISBN match (exact):
          "This edition is already in your library. Add another copy?"
      - Title+author fuzzy match (normalized):
          "This might be the same as '[existing title]'. Attach to existing or create new?"
      - If no matches: continue to preview
  → Preview screen shows fetched data (title, author links, cover, publisher, pages, etc.)
  → User can add copy-specific info (condition, source, location) or skip
  → User confirms or corrects Author/Series links on preview
  → User taps [Confirm]
  → Author (if new) + Work + Edition + Copy created (or attached to existing)
  → User lands on Work Detail
```

### 5.2 Manual Add (No Barcode / No ISBN Found)

```
User taps [Add Manually]
  → Form: title*, author(s)*, ISBN (optional), format, publisher, condition, source, location, price
  → * required
  → If ISBN provided → trigger lookup to enrich
  → User taps [Save]
  → Work + Edition + Copy created
```

### 5.3 Enrich Later

```
User is on Work Detail, Edition Detail, or Copy Detail
  → Tap [Edit]
  → Edit any field (metadata, condition, location, etc.)
  → If ISBN added for the first time → trigger lookup
  → Save
```

### 5.4 Page Count Log (within a Read-through)

```
On Copy Detail → select or create a read-through → tap [Log page count]
  → Enter page number
  → Date defaults to today (editable)
  → Optional: a one-line note
  → Save
  → Page log table updates
  → If page == edition.page_count → prompt "Finished? Rate and add a note?"
```

### 5.5 Lend a Book

```
On Copy Detail → tap [Lend this copy]
  → Enter borrower name
  → Lent date (default today)
  → Optional expected return date
  → Save
  → Copy status → lent, loan added to loans[], badge appears on Work Detail
```

### 5.6 Start a Re-read

```
On Copy Detail (already has a finished read-through) → tap [Start new read-through]
  → New read_through created with status: reading, started_date: today
  → Ready to log page counts
```

---

## 6. Obsidian Compatibility

### 6.1 Guarantees

- All data stored as `.md` files with YAML frontmatter.
- Book, copy, and note files use `[[wikilinks]]` to reference each other.
- `aliases` in frontmatter for alternate search terms.
- `tags` in note frontmatter for Obsidian tag pane.
- Markdown body of each file renders natively in Obsidian (tables, links, formatting).
- The `attachments/` folder is Obsidian's default attachment location.
- The root `library/` folder can be opened directly as an Obsidian vault.

### 6.2 Limitations (Obsidian-only mode)

- No barcode scanning.
- No ISBN lookup (unless Obsidian has a community plugin for it).
- No computed statistics.
- No loan status badges.
- You're looking at raw markdown files — all the data is there, but it's not pretty.

That's the trade: Obsidian for raw access and portability, the web app for the polished experience.

---

## 7. Technical Decisions (Proposals)

### 7.1 Resolved Stack

**Frontend:** React (Vite SPA) + shadcn/ui + Tailwind CSS. shadcn provides accessible, polished components out of the box (cards, dialogs, tables, forms, grids) without pulling in a heavy design system. The component source lives in the project, so customization is straightforward.

**Backend:** Local Node.js server (Express or Fastify) that:
- Serves the React SPA in production
- Reads/writes markdown files directly on disk
- Parses YAML frontmatter and returns structured JSON to the frontend
- Proxies ISBN lookup and cover download requests to Open Library / Google Books
- Maintains the in-memory index (section 7.3)
- Watches the file system for external changes (nice-to-have, not v1)

**Why not:**
- **Next.js:** Overkill for a local-only SPA. No SSR needed, no routing complexity, no Vercel lock-in.
- **Laravel / Django / Rails:** Database-oriented; file-system-as-database is awkward in these frameworks.
- **Go / Rust:** Faster but more code for YAML parsing, file watching, and web serving. Node.js has mature libraries for all three.
- **T3 / tRPC / Prisma:** Database-centric. We don't have a database.
- **Static site generator:** No dynamic features (barcode scanning, ISBN lookup).

### 7.2 Build Approach

Given the feature set — three-tier entity model, barcode scanning, ISBN lookup with fallback and caching, dedup logic, read-through state machine, loan tracking, statistics, full-text search, responsive mobile, file system as database with atomic writes, Obsidian-compatible markdown generation, and a local server — this is realistically a few months of solo evening/weekend work.

**Incremental build order:**

1. **Core CRUD.** React SPA + Node backend. File I/O: create/read/update Work, Edition, Copy, Author, Series files. Grid view and detail pages. No barcode, no notes, no read-throughs yet.
2. **Barcode + ISBN lookup.** Scan integration, Open Library / Google Books proxy, cover download. Author find-or-create during Quick Add.
3. **Read-throughs + notes.** Page logging, read-through state machine, notes CRUD, body regeneration.
4. **Loans + stats.** Lending, loan history, statistics dashboard.
5. **Polish.** Search, mobile responsiveness, file watching, Obsidian testing, dark mode.

### 7.3 File System Index

Reading and parsing 500+ YAML frontmatter blocks from disk on every app start is too slow for the interactivity guarantees in 9.1. The app maintains an **in-memory index** that loads at startup and stays in sync:

- **Startup:** Walk the directory tree once, parse all frontmatter into memory. For notes, also load the markdown body text (the note content itself is the searchable field). For works, editions, and copies, frontmatter-only is sufficient since the body is auto-generated from frontmatter. For 500 books this is sub-second.
- **Writes:** When the app writes a file, it updates the in-memory index immediately (the write is the source of truth).
- **External changes:** If Obsidian edits a file while the app is running, the index becomes stale. See 7.4 for the conflict resolution strategy.
- **Memory:** Even 10,000 books with full metadata is under 50MB in memory. Not a concern for a local-only desktop app.
- **Startup time:** Acceptable up to ~1 second. If the library grows beyond that threshold, add a cache file (JSON snapshot of the index written alongside the markdown files, checked for staleness by comparing file mtimes).

The index is functionally a database, but it's a derived cache — the markdown files remain the durable source of truth.

### 7.4 Obsidian ↔ Web App Conflict Resolution

Scenario: you edit a copy's condition in Obsidian, then log a page in the web app. The web app's in-memory index has the old condition.

**Strategy: re-read before write.** Before any write operation, the web app re-reads the target file from disk and merges the in-memory changes with whatever is on disk. Since individual files are small (< 5KB), re-reading is cheap.

**Merge rules:**
- Fields the web app is about to change: overwrite with the new value.
- Fields the web app is not touching: preserve the on-disk value (including any Obsidian edits).
- If the same field was changed in both Obsidian and the web app: the web app's change wins (last writer wins, and the web app just read the Obsidian edit before applying its own).

**File watching (future):** Use `chokidar` or `fsnotify` to detect external file changes and refresh the in-memory index proactively. Nice-to-have, not required for v1.

**Documented constraint:** Simultaneous editing of the same file in Obsidian and the web app is unsupported. If you edit a file in Obsidian, save it, then perform an action in the web app on the same file, the web app will detect the Obsidian changes and merge correctly. But if both are open and saving concurrently, behavior is undefined.

### 7.5 Body Regeneration Cascade

Since the markdown body of each file is auto-generated from frontmatter, and files reference data from other files (a Copy body shows Edition data, a Work body lists Editions), some writes trigger regeneration of other files' bodies.

**Strategy: regenerate in memory on open, write to disk on save.** When the web app opens any file for display, it regenerates that file's body from the in-memory index for display purposes only — no disk write occurs. The body is written to disk only when the user performs a save operation (editing metadata, logging a page, lending a book, adding a note). This keeps reads cheap (no I/O), avoids file mtime churn (no git diff noise from navigation), and ensures the on-disk markdown body always reflects the last save state.

The trade: Obsidian may show a slightly stale body until the next web app save. This is the documented tradeoff — Obsidian is the secondary interface.

---

## 8. API Integrations

### 8.1 Open Library (Primary)

- **Endpoint:** `https://openlibrary.org/isbn/{isbn}.json`
- **Rate limit:** None documented; be respectful.
- **Returns:** title, authors (keys, need second lookup), publish_date, publishers, pagination, subjects, description, covers (image ID).
- **Cover URL:** `https://covers.openlibrary.org/b/id/{cover_id}-M.jpg`
- **Author names:** Requires a second API call to resolve author keys to names. Or use the `/api/books` endpoint which includes author names inline.

### 8.2 Google Books (Fallback / Enrichment)

- **Endpoint:** `https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}`
- **Requires:** API key (free tier: 1000 requests/day).
- **Returns:** Richer metadata (categories, maturity rating, average rating, preview link), sometimes better cover images.

### 8.3 Caching

- Cache ISBN lookup results in `.booktracker/cache/` as JSON files.
- Downloaded cover images stored in `attachments/`.
- Cache invalidation: manual "refresh metadata" button per book, or never (data is stable). Proposal: never auto-refresh; manual refresh available.

---

## 9. Non-Functional Requirements

### 9.1 Performance

- Book grid with 500+ books should load and filter without visible lag.
- Search should feel instant (client-side filtering; no server round-trip per keystroke).

### 9.2 Data Integrity

- Page count log entries must be sequential (monotonically increasing page numbers, strictly increasing dates). App enforces this; manual file editing could break it, which is fine.
- Markdown files should remain valid even if the app crashes mid-write (atomic writes: write to temp file, rename).
- UTF-8 encoding for all files.

### 9.3 Privacy

- All data lives locally. No telemetry, no analytics, no cloud sync (unless user opts into something like a git repo for backup).
- ISBN lookups go to Open Library / Google Books. This is the only external network call.

### 9.4 Accessibility

- Semantic HTML.
- Keyboard navigable (Tab, Enter, Escape for modals, arrow keys for grid navigation).
- Sufficient color contrast.
- Screen-reader friendly labels.

---

## 10. Resolved Decisions

1. **Work / Edition / Copy model.** Three-layer hierarchy: Work (abstract book) → Edition (published version with ISBN, page count, format) → Copy (physical object on shelf). This supports multiple editions/translations of the same work and re-read tracking per copy.

2. **Read-throughs for re-reads.** Each copy has a list of `read_throughs`, each with its own status (reading/finished/dnf/paused), page_log, and optional rating (0–10). Notes link to a specific read-through via `read_through: <started_date>`, not array index — `started_date` is unique per copy and stable across insertions/deletions. Only one active read-through per copy at a time.

3. **Archiving, not deleting.** Lost, given-away, or sold copies are archived (marked with status) rather than deleted. They remain visible and filterable. True delete available for mistakes.

4. **E-book / audiobook support.** Deferred. The format field already allows `ebook` and `audiobook`. Page count and cover image apply to the Edition, not the Copy, so e-books and audiobooks will plug in cleanly when the time comes.

5. **Local-only.** The app runs on localhost. No hosting, no cloud, no sync. Mobile access via same-network. Data is just files on disk.

6. **Configurable data directory.** Defaults to `~/book-tracker-data/` or a project subdirectory. Configurable in settings. Point Obsidian at the same directory.

7. **Cover image quality.** Downloaded at best available resolution. Large files (~1MB each) are acceptable. Option to configure resolution in settings.

8. **Note filenames.** `YYYY-MM-DD-HHMMSS.md` (no colons). Timestamps prevent shallow auto-titles and guarantee unique filenames.

9. **Rating system.** Per read-through, 0.0–10.0 scale (one decimal). In scope.

10. **Series membership.** Works can optionally belong to a series with a position number. In scope.

11. **Deduplication on ISBN add.** Primary check: exact ISBN match on Edition. Secondary check: fuzzy title+author match on Work (lowercased, articles stripped, whitespace collapsed) as a suggestion — user always decides. Prevents accidental duplicates while allowing intentional ones (multiple copies of same edition, multiple editions of same work).

12. **Frontmatter-canonical.** YAML frontmatter is the sole source of truth. The markdown body in every file is auto-generated by the web app on every save for human reading in Obsidian. Body edits made in Obsidian will be overwritten. Dataview queries are an alternative for Obsidian-only users.

13. **No bidirectional links in frontmatter.** Work, Edition, and Copy files use forward `[[wikilinks]]` only (Copy → Edition → Work). Reverse navigation (Work → Editions, Edition → Copies) relies on Obsidian's backlinks panel or Dataview queries — no manually-maintained `links` lists that would drift.

14. **Contributors on Editions.** `contributors: [{name, role}]` on Edition supports translator, editor, illustrator, introduction author, etc. The Work's `authors[]` is for the original author(s) only.

15. **Subtitle and original publish year on Work.** `subtitle` (optional) and `original_publish_year` (the year the work was first published, distinct from any edition's `publish_date`) are Work-level fields.

16. **Price as amount + currency.** `price_amount: 14.50` and `price_currency: "EUR"` — two fields, not a free-text string. Computable for stats, sortable, filterable by currency.

17. **No empty optional fields.** Omit keys entirely when they have no value. `series` is absent from frontmatter when a work is not in a series. `loans: []` is an empty list, not a list of empty objects. YAML parsers treat missing keys as null — explicit empty values look like data entry errors.

18. **File system index.** The app maintains an in-memory index loaded at startup from all markdown files. Startup parse time is sub-second for 500+ books. Writes update the index immediately. External changes (Obsidian edits) are handled by re-reading the file before writes (see 7.4).

19. **Obsidian ↔ Web App conflict resolution.** Before any write, the app re-reads the target file from disk and merges: fields the app is changing are overwritten, fields the app is not touching are preserved from disk (including Obsidian edits). Simultaneous editing is unsupported.

20. **Schema versioning.** Every file has `_schema: <integer>` in its frontmatter. When the schema changes in a future version, the app detects old-format files and offers migration.

21. **Scope: incremental build over months.** This is a few months of evening/weekend work, not a weekend. Build incrementally: core CRUD first, then barcode, then read-throughs and notes, then stats.

22. **Genre normalization.** Genres are free-text but normalized on write: lowercased, trimmed, spaces replaced with hyphens (`"Russian Literature"` → `"russian-literature"`). The app maintains a `genres.yaml` file in `.booktracker/` as a controlled vocabulary — autocomplete suggestions are drawn from existing genres. The file is user-editable if manual curation is desired, but the app enforces the normalization rule on every write regardless of vocabulary.

23. **Note reference denormalization.** Note files reference `copy`, `edition`, and `work` — three wikilinks for a single relationship chain (the copy already knows its edition, which knows its work). This denormalization is a conscious tradeoff for Obsidian navigability: it lets Dataview queries and the graph view surface notes under any entity without traversing the chain. The cost: if a copy is reassigned to a different edition, all notes under that copy need their `edition` and `work` links updated. The web app handles this automatically on reassignment.

24. **Body regeneration: in-memory on open, write to disk on save.** Bodies are regenerated in memory for web app display on every open, using the full in-memory index. Bodies are written to disk only on save operations (edits, page logs, lending, notes). This keeps reads cheap (no I/O), avoids file mtime churn from navigation, and ensures the on-disk body matches the last save state. See section 7.5.

25. **Slug generation and immutability.** Slugs follow a defined algorithm (lowercase, ASCII-fold, hyphens only, 80-char max). Collisions disambiguate with author surname suffix. Copy slugs use `{edition-slug}-{descriptor}`. Slugs are immutable once created. See section 3.0 for full specification.

26. **Paused is manual-only in v1.** Auto-detection (no page log for N days) is deferred. Users explicitly mark a read-through as paused.

27. **Page log entries are editable.** Individual entries can be edited or deleted. Monotonicity is checked on final state. An "undo last entry" shortcut is available.

28. **Entity deletion with orphan protection.** Works, Editions, and Copies have cascade-delete with warnings. You cannot delete an Edition that has copies (without overriding), or a Work that has editions. Section 4.13 defines the full chain.

29. **Lending pauses active read-throughs.** A copy with `status: lent` blocks new read-throughs. If a copy is lent during an active read-through, the read-through is auto-paused. On return, the user manually resumes.

30. **ISBN lookup populates contributors when available.** The API response is scanned for translator, editor, and illustrator data. Results are pre-fill suggestions; the user should review and correct.

31. **Attaching to an existing Work never modifies the Work.** Quick Add dedup that attaches to an existing Work populates the new Edition only. The Work's title, subtitle, description, and other metadata are preserved as-is — the user's curated data wins.

32. **Authors as wikilinks.** `authors[]` on Work contains `[[wikilinks]]` to Author files in `authors/`. Each Author file is a lightweight stub (name, birth/death years, aliases). This makes the Obsidian graph useful: click an author to see all their works, editions, and notes.

33. **Series as wikilinks.** `series` on Work is a `[[wikilink]]` to a Series file in `series/`, with `series_position` as a separate numeric field. Same graph benefits as authors.

34. **Contributors are structured data, not wikilinks.** Translators, editors, illustrators on Editions remain `{name, role}` objects. Creating Author pages for every translator adds noise; this can be revisited.

35. **Tech stack: React + shadcn/ui + Vite SPA + Node.js backend.** See section 7.1 for rationale. The frontend and backend run as a single process: the Node server serves the built SPA and handles API calls, file I/O, and ISBN proxy.

36. **Author matching is user-confirmed, not auto-resolved.** The app suggests Author links based on exact name/alias match (case-insensitive, whitespace-normalized). Fuzzy near-matches (transliteration variants) are not auto-resolved — the user selects the correct Author from a dropdown on the preview screen. This prevents duplicate Author files for the same person under different spellings.

37. **No `last_opened_at`.** Tracking access timestamps means writing metadata on reads — that contradicts the read-is-cheap philosophy and creates noise in git diffs. Sort options are title, author, and `created_at` only.

38. **No `created_at` on Notes.** `date` serves as the creation timestamp for notes. `modified` tracks edits. The distinction between "when the note was conceptually written" and "when the file was created" is vanishingly rare for notes and doesn't justify a separate field.

39. **Authors are minimal.** Author files contain name, sort_name, birth/death years, and aliases. No bio, description, or other prose — the rest is a Google search away. The purpose of Author files is graph navigability, not encyclopedic completeness.

40. **Author and Series Detail Pages exist.** Simple navigation hubs: list of works, copy count, read status. No stats, no bio. Sections 4.5.2 and 4.5.3.

41. **Authors are minimal — name, aliases, and created_at only.** No `sort_name`, `birth_year`, `death_year`, or bio. The purpose of Author files is graph navigability and `[[wikilink]]` connectivity. Encyclopedic completeness is a Google search away.

42. **No auto-resolution for author matching.** The app matches Author names via exact `name` or `aliases` entry (case-insensitive, whitespace-normalized). Fuzzy near-matches (transliteration variants) are never auto-resolved — if the API returns "F.M. Dostoevsky" and the library has "Fyodor Dostoevsky," the app creates a new Author. The user corrects mismatches on the preview screen by selecting the existing Author from a dropdown. This prevents silently creating link rot and protects against API data that misattributes authorship.

43. **Sort by author uses `name` directly.** With `sort_name` removed, the sort-by-author option in the Work grid sorts by the Author's display `name` field as-is. For "Fyodor Dostoevsky" this sorts under F. The user can add "Dostoevsky, Fyodor" as the Author's `name` if they prefer surname-first sorting.

44. **Author and Series support orphan-protection deletion.** Same pattern as Works/Editions/Copies. Author deletion prompts to remove the wikilink from affected Works. Series deletion clears the optional `series` + `series_position` fields from affected Works. Section 4.13.

---

## 11. Future / Maybe Later

| Feature | Priority | Notes |
|---------|----------|-------|
| Multi-user profiles | Low | Only if it falls out for free |
| Reading goals | Low | "Read 24 books this year" |
| Wishlist | Medium | Books you want to acquire |
| Quotes extraction | Low | Save and tag quotes from books |
| Book club / shared reading | None | Explicitly out of scope |
| Audiobook support | Low | Duration tracking instead of pages |
| E-book support | Low | Format = ebook, skip condition/location |
| OCR / receipt scanning | Low | Scan a receipt to auto-log purchase info |
| CSV import | Medium | Bulk import existing library from a spreadsheet |
| CSV export | Medium | Full data export |
| Dark mode | Medium | Standard toggle |
| Tags on copies (not just notes) | Medium | Tag copies with custom labels |
---

*End of v1.0*
