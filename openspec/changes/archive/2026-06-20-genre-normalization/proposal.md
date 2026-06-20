## Why

Genres are stored as raw strings with no normalization. "Science Fiction", "science fiction", and "sci-fi" are three distinct values, which breaks stats aggregation, autocomplete suggestions, and filter chips on the Work Grid. The system needs a controlled vocabulary with consistent formatting to make genre-based features reliable.

## Supersedes

None.

## What Changes

- Genre normalization utility using `limax` (same library as slug generation): lowercase, Unicode-fold, kebab-case output — so "Science Fiction" always becomes `science-fiction`
- `.booktracker/genres.yaml` as a flat curated list of normalized genre strings, seeded from existing works on first startup
- `GET /api/genres` endpoint returning the curated list merged with any additional genres found in existing works
- `PATCH /api/genres` endpoint replacing the entire curated list
- Normalization applied on write: `POST /api/works`, `PATCH /api/works/:slug`, and `POST /api/quick-add` all normalize genre values before storing
- Quick-add now passes genres from ISBN lookup data through to the created Work (currently dropped)
- Stats endpoint normalizes genres on read for `works_by_genre` computation, handling the mixed state of pre-existing non-normalized values
- **Client:** A new `GenreSelector` chip-autocomplete component (modeled on `AuthorSelector`) replaces the comma-separated text input in `EditWorkModal`
- **Client:** Settings page gains a genre curation section for bulk editing the curated list via `PATCH /api/genres`
- **Client:** `AddBook` page passes genres from lookup data through to quick-add

## Capabilities

### New Capabilities

- `genre-normalization`: Server-side genre normalization utility, `genres.yaml` file management, `GET /api/genres` and `PATCH /api/genres` endpoints, wiring normalization into work write paths and stats reads
- `genre-selector`: Client-side `GenreSelector` autocomplete chip component, integration into `EditWorkModal`, `AddBook` genre pass-through, Settings page genre curation section

### Modified Capabilities

- `work-api`: Work creation and update endpoints now normalize genre values on write
- `quick-add-endpoint`: Quick-add now accepts an optional `genres` field from the request body and normalizes it before writing
- `stats-api`: `works_by_genre` computation normalizes genres on read to prevent double-counting from pre-existing non-normalized values
- `settings-page`: Settings page gains a genre curation section with an editable text area and save button

## Impact

- **Server routes:** `works.ts`, `quick-add.ts`, `stats.ts` all get genre normalization calls
- **New server files:** `server/src/routes/genres.ts` (GET/PATCH endpoints), `server/src/lib/genres.ts` (normalize utility, genres.yaml read/write/seed)
- **Client components:** New `GenreSelector.tsx`, modified `EditWorkModal.tsx` and `AddBook.tsx`, updated `Settings.tsx`
- **File system:** New `.booktracker/genres.yaml` file; `.booktracker/` directory entry added to `LIBRARY_DIRECTORIES`
- **No breaking changes:** Existing API contracts remain compatible; unnormalized genres persist on disk until the work is next edited (lazy migration)
