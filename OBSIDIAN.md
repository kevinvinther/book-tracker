# Obsidian Guide

Your book tracker library is a fully functional Obsidian vault. Open the data directory as a vault and browse your collection with Obsidian's graph view, backlinks, and search.

## Setup

1. Open Obsidian
2. Click "Open folder as vault"
3. Navigate to `~/book-tracker-data` (or your configured library path)
4. Click "Open"

The vault structure:

```
book-tracker-data/
├── authors/       # One file per author
├── series/        # One file per series
├── works/         # One file per Work
├── editions/      # One file per Edition
├── copies/        # One file per Copy
├── notes/         # All notes (filenames are timestamps)
└── attachments/   # Cover images
```

## Recommended Plugins

### Dataview

[Dataview](https://github.com/blacksmithgu/obsidian-dataview) lets you query your frontmatter as a database. All entity files include rich YAML frontmatter (`type`, `title`, `authors`, `genres`, `status`, `read_throughs`, etc.) that Dataview can filter and sort.

### Tag Wrangler

[Tag Wrangler](https://github.com/pjeby/tag-wrangler) adds a tag pane for browsing and renaming tags. Notes in this vault use tags like `reflection`, `analysis`, `review`, `finished` — Tag Wrangler gives you a unified view.

## Dataview Query Examples

Create a new note in your vault and paste any of these queries:

### All Books with Authors

```dataview
TABLE authors, original_publish_year, genres
FROM "works"
SORT title ASC
```

### Currently Reading

```dataview
TABLE WITHOUT ID
  file.link AS "Book",
  reading.status AS "Status",
  reading.page AS "Page"
FROM "copies"
FLATTEN read_throughs AS reading
WHERE reading.status = "reading"
SORT file.name ASC
```

### Currently Reading (alternative — scans all copies)

```dataview
TABLE WITHOUT ID
  file.link AS "Book",
  condition,
  location,
  status
FROM "copies"
WHERE status = "lent"
SORT file.name ASC
```

### Overdue Loans

```dataview
TABLE WITHOUT ID
  file.link AS "Book",
  loan.borrower_name AS "Borrower",
  loan.expected_return_date AS "Due"
FROM "copies"
FLATTEN loans AS loan
WHERE !loan.returned_date AND loan.expected_return_date
SORT loan.expected_return_date ASC
```

### Notes by Tag

```dataview
TABLE WITHOUT ID
  file.link AS "Note",
  tags,
  dateformat(date, "yyyy-MM-dd") AS "Date",
  copy AS "Copy"
FROM "notes"
WHERE tags
SORT date DESC
```

### Books in a Series (ordered)

```dataview
TABLE WITHOUT ID
  series_position AS "#",
  file.link AS "Book"
FROM "works"
WHERE series = "[[series/the-dark-tower]]"
SORT series_position ASC
```

### Reading Stats

```dataview
TABLE WITHOUT ID
  file.link AS "Book",
  length(filter(flat(read_throughs), (r) => r.status = "finished")) AS "Times Finished",
  nonnull(read_throughs.rating)[0] AS "Latest Rating"
FROM "copies"
WHERE read_throughs
SORT file.name ASC
```

## Navigation

### Forward Links (Wikilinks)

- **Work → Author**: Click `[[authors/...]]` in a Work file's metadata block
- **Work → Series**: Click `[[series/...]]` if the work belongs to a series
- **Work → Edition**: Click `[[editions/...]]` in the Editions section
- **Edition → Copy**: Click `[[copies/...]]` in the My Copies section
- **Copy → Note**: Click `[[notes/...]]` in the Notes section
- **Copy → Edition**: Click `[[editions/...]]` in the metadata block
- **Copy → Work**: Click `[[works/...]]` implicitly (or via the navigation backlink)

### Backlinks

Open any file and check Obsidian's Backlinks panel (right sidebar). Works show up on their Author's backlinks page. Copies show up on their Edition's backlinks page. Notes show up on their Copy's backlinks page.

### Graph View

Open the Graph view to see your library as a connected network. Authors connect to Works, Works connect to Editions, Editions connect to Copies, and Notes connect to Copies.

### Quick Switcher with Aliases

Files with `aliases` in their frontmatter appear in Obsidian's quick switcher (`Ctrl/Cmd+O`) under those alternate names. Use meaningful aliases for books you search for by nickname (e.g., "Dune PB" for your paperback copy of Dune).

## Known Limitations

- **Bodies are auto-generated.** The markdown body of each file is rendered by the web app on save. If you edit the body in Obsidian, your changes will be overwritten the next time the web app saves that entity. Edit frontmatter fields through the web app instead.
- **Simultaneous editing is unsupported.** Do not edit the same file in Obsidian and the web app at the same time. If you save in Obsidian, then perform a web app action, the web app re-reads the file from disk and merges correctly. But concurrent saves are undefined.
- **No barcode scanning or ISBN lookup** in Obsidian-only mode. Use the web app for data entry.
- **Series placeholders require body regeneration.** The `(not in library)` placeholders in Series files are generated when the body is written during a save. Newly seeded test data may not show them until the web app writes the files.
