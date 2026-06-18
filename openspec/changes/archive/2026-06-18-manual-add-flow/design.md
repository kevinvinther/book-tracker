## Context

The app has individual CRUD endpoints for every entity type (Author, Work, Edition, Copy), but creating a new book requires stringing them together manually. The frontend has established patterns for data hooks, modals (Base UI Dialog), and form styling. The existing Work Grid and pages provide the navigation context.

## Goals / Non-Goals

**Goals:**
- A single form that collects Work, Author(s), Edition, and Copy data in one place
- A single endpoint that creates all entities in one request
- Author find-or-create: the form shows existing authors in a dropdown and allows creating a new author inline
- Redirect to the new Work Detail page on success

**Non-Goals:**
- ISBN lookup or barcode scanning (separate changes)
- Multi-step wizard — keep it as a single-page scrollable form
- Editing or previewing after creation (handled by existing detail pages)
- Handling the `contributors` field for the quick-add (the edition contributors can be set via the Edit Edition modal afterward)

## Decisions

### Single `POST /api/quick-add` endpoint orchestrates creation

The endpoint accepts a flat payload with all fields and internally:
1. Resolves or creates authors (by name, exact match on existing authors)
2. Creates the Work with generated slug
3. Creates the Edition linked to the work
4. Creates the Copy linked to the edition and work

Returns `{ workSlug, authorSlugs }` so the frontend can redirect.

**Rationale:** A single round-trip is simpler for the frontend and avoids partial state (e.g., work created but edition fails). The endpoint is a convenience compositor over existing endpoints, not a replacement.

### Author resolution: exact name match, case-insensitive

For each author name, check all authors in the index for a case-insensitive, whitespace-normalized match on `name` or `aliases`. If found, use existing slug. If not, create a new Author. No fuzzy matching.

**Rationale:** A simple, fast version of author resolution keeps this change self-contained. The logic can be extracted into a shared utility when the dedicated Author Find-or-Create feature is built later.

### Form layout: single-page with sections, not multi-step

A scrollable page with clear visual sections (Work, Authors, Edition, Copy), each with their own heading. This avoids complexity of step navigation and makes the form easier to scan and correct before submitting.

**Rationale:** The form has ~15 fields total — not enough to justify a wizard. A single page with sections keeps the implementation simple and the user in control.

### Author input: text field with autocomplete dropdown + "create new" fallback

A text input where typing shows matching existing authors in a dropdown. If no match is found, a "Create 'X'" option appears at the bottom. Selected authors appear as chips/pills below the input. At least one author is required.

**Rationale:** Combines search and creation in one interaction. Avoids a separate "create new author" form. The chip display makes the current selection visible.

### `/add` route, not a modal

The form is a full page at `/add`, accessible via a prominent button in the Work Grid header. A full page gives the form breathing room and works well on mobile.

**Rationale:** The form has enough sections to benefit from a dedicated page. The "back to shelf" link in the header provides a natural escape hatch.

### Cover image: two-step upload-then-form-submit

The cover image field is a file picker that uploads immediately on selection to `POST /api/attachments/upload`, returning a UUID filename. When the form is submitted, that filename is included in the quick-add payload. A local preview is shown as soon as the file is selected.

**Rationale:** Uploading the image separately keeps the quick-add endpoint as a simple JSON POST rather than multipart form data. The UUID filename avoids collisions. The immediate preview gives the user feedback before they finish filling out the form.

### Attachment upload endpoint: multer, UUID filenames, image-only

`POST /api/attachments/upload` uses multer with disk storage in the library's `attachments/` directory. Files are renamed to `{uuid}.{ext}` to avoid collisions and path-traversal attacks. Only `image/*` MIME types are accepted, with a 10 MB limit.

**Rationale:** Multer is the standard Express file-upload middleware. UUID filenames are safe (no user-controlled paths) and collision-free. The 10 MB limit prevents accidental large uploads while accommodating high-res cover scans.

## Risks / Trade-offs

- **Author find-or-create is inline and simple** → no fuzzy matching or dedup warnings, which means minor typos create duplicate authors. Acceptable for a personal app; fuzzy matching can be added later.
- **No transaction rollback** → if the work creates successfully but the edition fails, the author and work persist as orphans. Mitigated by doing the API calls sequentially with early returns on failure, and the orphan protection on deletes makes cleanup possible.
- **The quick-add endpoint duplicates some validation logic** from individual endpoints → acceptable for a composited convenience endpoint; the individual CRUD endpoints remain correct.
