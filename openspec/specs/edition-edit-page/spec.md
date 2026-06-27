# edition-edit-page Specification

## Purpose
TBD - created by archiving change enrich-edit-pages. Update Purpose after archive.
## Requirements
### Requirement: Edition edit page route

The system SHALL render a dedicated edition edit page at `/editions/:slug/edit`, reached from the "Edit Edition" action on the edition detail page. The page SHALL load the edition (and its parent work) and present an editable form for both the Edition's own fields and the parent Work's shared fields.

#### Scenario: Opening the edit page
- **WHEN** a user clicks "Edit Edition" on `/editions/dune-chronicles-hardcover`
- **THEN** the app navigates to `/editions/dune-chronicles-hardcover/edit` and renders a form pre-filled with the edition's and parent work's current values

#### Scenario: Edition does not exist
- **WHEN** a user navigates to `/editions/nonexistent/edit`
- **THEN** the page displays a not-found state with a link back to the home page

### Requirement: Editable Work and Edition fields

The page SHALL provide editable inputs for the shared Work fields (title, subtitle, authors, genres, description, cover) and the Edition fields (isbn, publisher, publish_date, page_count, format, language, contributors). Authors SHALL be edited via the `AuthorSelector` component (name-based) and genres via the `GenreSelector` component.

#### Scenario: Editing an edition field
- **WHEN** the user changes the publisher and saves
- **THEN** the edition is updated via `PATCH /api/editions/:slug`

#### Scenario: Editing a shared work field
- **WHEN** the user changes the description and saves
- **THEN** the parent work is updated via `PATCH /api/works/:slug`

#### Scenario: Authors resolved on save
- **WHEN** the user adds an author name that does not yet exist and saves
- **THEN** the author is created (find-or-create) and linked to the work as a `[[authors/slug]]` wikilink

### Requirement: Save writes work and edition separately

On save, the page SHALL issue `PATCH /api/works/:slug` for changed Work fields and `PATCH /api/editions/:slug` for changed Edition fields. When the cover copy opt-in is selected, it SHALL additionally `PATCH /api/copies/:slug` for each copy of the edition. Genres SHALL be sent through normalization on the server as today; empty optional fields SHALL be sent as `null` to clear them.

#### Scenario: Mixed work and edition edits
- **WHEN** the user edits both the title (work field) and the page count (edition field) and saves
- **THEN** the page issues both a `PATCH /api/works/:slug` and a `PATCH /api/editions/:slug` request, and on success returns to the edition detail page

#### Scenario: Clearing an optional field
- **WHEN** the user clears the publisher and saves
- **THEN** the page sends `publisher: null` so the field is removed from the edition frontmatter

### Requirement: Cover upload

The page SHALL allow replacing the cover by uploading an image file via `POST /api/attachments/upload`, displaying a preview of the chosen image. Setting a cover by typing a raw filename SHALL NOT be the primary mechanism. By default an uploaded or selected cover SHALL set the Work's `primary_cover`. The page SHALL provide an opt-in control to also apply the cover to all copies of this edition (writing each copy's `cover_image`).

#### Scenario: Uploading a replacement cover
- **WHEN** the user uploads a new cover image
- **THEN** the file is stored via `POST /api/attachments/upload`, a preview is shown, and on save the returned filename is written to the work's `primary_cover`

#### Scenario: Applying cover to copies
- **WHEN** the user uploads a cover, ticks "also apply to this edition's copies", and saves
- **THEN** the cover filename is written to the work's `primary_cover` and to the `cover_image` of every copy of the edition

### Requirement: Enrich-from-sources panel

The page SHALL include an enrich panel that, on demand, fetches metadata from external sources via `GET /api/lookup/all` and lets the user adopt values field by field. The panel SHALL list all six sources (`google`, `openlibrary`, `goodreads`, `amazon`, `googleimages`, `kindlecovers`) each with an ephemeral, per-session checkbox; the four default sources (`google`, `openlibrary`, `goodreads`, `amazon`) SHALL be checked initially and the two cover-only image sources (`googleimages`, `kindlecovers`) SHALL be unchecked initially. The panel SHALL forward the edition's current title and author(s) as the `title` and `author` query parameters so the cover-only image sources can search by text. No external request SHALL be made until the user clicks the "Fetch metadata" button. The panel SHALL offer a skip-cache control that forwards `nocache` to the endpoint.

#### Scenario: Default selection on open
- **WHEN** the enrich panel first renders for an edition with an ISBN
- **THEN** Google Books, Open Library, Goodreads, and Amazon are checked, and Google Images and Kindle covers are unchecked

#### Scenario: Fetching from selected sources with title and author
- **WHEN** the user enables Google Images and clicks "Fetch metadata"
- **THEN** the panel calls `GET /api/lookup/all` with the chosen `sources` plus the current `title` and `author`, and shows the returned values for comparison

#### Scenario: No fetch on page load
- **WHEN** the edit page first renders
- **THEN** no request to `GET /api/lookup/all` is made until the user clicks "Fetch metadata"

### Requirement: Field-by-field adoption

For each enrichable field, the panel SHALL display the value(s) offered by each source alongside the current editable value, and allow the user to adopt a source's value into that field. Adopting a value SHALL replace the field's current contents (including for array fields such as authors and genres); the user MAY then edit further before saving. Adoption SHALL NOT save by itself — changes take effect only on save.

#### Scenario: Adopting a scalar field
- **WHEN** the user clicks to adopt Open Library's description
- **THEN** the description input is replaced with Open Library's value, and nothing is persisted until the user saves

#### Scenario: Adopting an array field replaces it
- **WHEN** the user adopts a source's genres
- **THEN** the genre selector's contents are replaced by that source's genres (not merged), and the user can still add or remove genres before saving

### Requirement: Cover adoption from sources

The enrich panel SHALL show each source's cover as a remote thumbnail (from `cover_url`) that the user can select as the pending cover. The selected remote cover SHALL only be downloaded to `attachments/` on save (for the chosen cover only), then written to `primary_cover` (and copies if the opt-in is set). Covers that are previewed but not chosen SHALL NOT be downloaded.

#### Scenario: Choosing a source cover
- **WHEN** the user selects Google Books' cover thumbnail and saves
- **THEN** that single cover image is downloaded to `attachments/` and its filename is written to the work's `primary_cover`

#### Scenario: Rejected covers are not downloaded
- **WHEN** the user previews both sources' covers but selects neither and saves
- **THEN** no cover is downloaded and the existing cover is unchanged

### Requirement: Enrich disabled without an ISBN

When the edition has no ISBN, the enrich panel SHALL be disabled (or hidden) with a hint indicating that an ISBN is required to fetch metadata. Manual editing and cover upload SHALL remain fully available.

#### Scenario: Edition without ISBN
- **WHEN** the edition has no ISBN
- **THEN** the enrich panel shows a hint such as "Add an ISBN to fetch metadata" and the "Fetch metadata" button is disabled, while the rest of the form works normally

### Requirement: Per-source failure notes

The enrich panel SHALL read the `errors` array returned by `GET /api/lookup/all` and display a per-source note for each source that was blocked or errored, distinct from a source that simply returned no values. This lets the user tell "the source was blocked" apart from "the source found nothing" and decide whether to retry (e.g. with skip-cache).

#### Scenario: Blocked source shown as failed
- **WHEN** the response includes `errors: [{ source: "amazon", reason: "blocked" }]`
- **THEN** the panel shows a note such as "Amazon — blocked" for that source, separate from the field comparison rows

#### Scenario: No error note for a clean empty source
- **WHEN** a selected source is in neither `results` nor `errors`
- **THEN** the panel shows no failure note for that source

### Requirement: Merging genres from a source

For the genres field specifically (where multiple sources contribute complementary values), the enrich panel SHALL offer an "Add" action alongside "Use". "Use" replaces the current genres with the source's genres (existing behaviour); "Add" merges the source's genres into the current set as a de-duplicated union, leaving genres already present untouched. Other fields keep replace-only adoption.

#### Scenario: Adding genres merges into the current set
- **WHEN** the current genres are `["fantasy"]` and the user clicks "Add" on a source offering `["fantasy", "space opera"]`
- **THEN** the genre selector contains `["fantasy", "space opera"]` (the duplicate is not repeated), and nothing is persisted until save

#### Scenario: Using genres still replaces
- **WHEN** the user clicks "Use" on a source's genres
- **THEN** the current genres are replaced by that source's genres, as before

