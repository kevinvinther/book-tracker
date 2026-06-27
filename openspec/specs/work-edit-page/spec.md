# work-edit-page Specification

## Purpose
TBD - created by archiving change enrich-edit-pages. Update Purpose after archive.
## Requirements
### Requirement: Work edit page route

The system SHALL render a dedicated work edit page at `/works/:slug/edit`, reached from the "Edit Work" action on the work detail page. The page SHALL load the work and present an editable form for the work's mutable fields. This page SHALL NOT include an enrich-from-sources panel (enrichment is ISBN-driven and lives on the edition edit page).

#### Scenario: Opening the work edit page
- **WHEN** a user clicks "Edit Work" on `/works/dune`
- **THEN** the app navigates to `/works/dune/edit` and renders a form pre-filled with the work's current values

#### Scenario: Work does not exist
- **WHEN** a user navigates to `/works/nonexistent/edit`
- **THEN** the page displays a not-found state with a link back to the home page

### Requirement: Editable Work fields

The page SHALL provide editable inputs for the work's mutable fields: title, subtitle, authors, genres, description, series, series_position, original_language, original_publish_year, and aliases. Authors SHALL be edited via the `AuthorSelector` component and genres via the `GenreSelector` component. Title SHALL be required.

#### Scenario: Editing a work field
- **WHEN** the user changes the title and saves
- **THEN** the work is updated via `PATCH /api/works/:slug` and the app returns to the work detail page

#### Scenario: Empty title rejected
- **WHEN** the user clears the title and attempts to save
- **THEN** the page shows a validation error and does not submit

#### Scenario: Authors resolved on save
- **WHEN** the user adds an author name that does not yet exist and saves
- **THEN** the author is created (find-or-create) and linked as a `[[authors/slug]]` wikilink

### Requirement: Cover upload on the work edit page

The page SHALL allow replacing the work's cover by uploading an image file via `POST /api/attachments/upload`, showing a preview. On save the uploaded filename SHALL be written to the work's `primary_cover`. Setting the cover by typing a raw filename SHALL NOT be the primary mechanism.

#### Scenario: Uploading a work cover
- **WHEN** the user uploads a new cover image and saves
- **THEN** the file is stored via `POST /api/attachments/upload` and its filename is written to the work's `primary_cover`

