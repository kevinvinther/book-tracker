# attachment-serving Specification

## Purpose
Serve the library's `attachments/` directory over HTTP so cover images and other binary assets referenced by entity frontmatter can be rendered directly by the client.

## Requirements

### Requirement: Attachments are served over HTTP
The system SHALL expose the library's `attachments/` directory over HTTP at `/api/attachments/:filename`, so cover images referenced by `primary_cover` or `cover_image` can be rendered by `<img>` tags.

#### Scenario: Existing attachment file
- **WHEN** a GET request is made to `/api/attachments/dune-cover.jpg` and that file exists in the library's `attachments/` directory
- **THEN** the response has status 200 and serves the file's bytes with an appropriate content-type

#### Scenario: Missing attachment file
- **WHEN** a GET request is made to `/api/attachments/nonexistent.jpg`
- **THEN** the response has status 404 with a JSON `{ error: ... }` body, consistent with every other API route

#### Scenario: Path traversal attempt
- **WHEN** a GET request is made to `/api/attachments/..%2F..%2Fconfig.yaml` or similar traversal pattern
- **THEN** the response does not serve any file outside the `attachments/` directory
