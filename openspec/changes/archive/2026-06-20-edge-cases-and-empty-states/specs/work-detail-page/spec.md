## ADDED Requirements

### Requirement: Retry button on error
When the work detail fetch fails with an error, the error message SHALL be accompanied by a "Retry" button that re-triggers the data fetch.

#### Scenario: Error with retry action
- **WHEN** `GET /api/works/:slug` fails and an error message is displayed
- **THEN** a "Retry" button is displayed alongside the error message
- **AND WHEN** the user clicks "Retry"
- **THEN** the data fetch is re-triggered

### Requirement: Skeleton loading state
While the work data is loading, the page SHALL display a skeleton layout matching the page structure instead of "Loading…" text.

#### Scenario: Work detail loading shows skeleton
- **WHEN** the user navigates to `/works/:slug` and data is loading
- **THEN** skeleton blocks are displayed matching the cover image area, title, subtitle, author lines, metadata chips, description block, and editions section

### Requirement: Broken cover image fallback
The cover image SHALL display the "No cover" placeholder when the image URL fails to load (e.g., missing file, network error).

#### Scenario: Cover image fails to load
- **WHEN** the work's cover image `<img>` element fires an `onError` event
- **THEN** the image is replaced by the existing "No cover" placeholder div

#### Scenario: Valid cover image loads normally
- **WHEN** the work's cover image loads successfully
- **THEN** the `<img>` element is displayed without the placeholder

### Requirement: Unknown author fallback
When a work has zero authors in its `authors_meta` array, the metadata section SHALL display "Unknown author" in place of the missing author links.

#### Scenario: Work with empty author list on detail page
- **WHEN** a work has `authors_meta` as an empty array or `null`
- **THEN** the author section displays "Unknown author" styled with `text-muted-foreground`
