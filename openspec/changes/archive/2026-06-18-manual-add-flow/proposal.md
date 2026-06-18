## Why

Adding a book currently requires three or four separate API calls to create the author, work, edition, and copy. There's no form to do this in the UI. The "Add Manually" flow is the primary way users will add books to their library, and without it the app can't grow beyond seeded test data.

## What Changes

- New "Add Manually" button in the Work Grid header
- Single-page multi-section form with fields for Work, Authors, Edition, and Copy
- Cover image file upload with preview — replaces plain text filename field
- New `POST /api/attachments/upload` endpoint that saves uploaded images with UUID filenames
- New `POST /api/quick-add` endpoint that orchestrates creation of Author(s), Work, Edition, and Copy in one transaction
- Author find-or-create logic: dropdown of existing authors plus inline "create new" option
- Redirect to the new Work Detail page on success

## Capabilities

### New Capabilities
- `manual-add-form`: Single-page form for manual book entry with sections for work metadata, author selection/creation, edition details, and copy details
- `quick-add-endpoint`: `POST /api/quick-add` that atomically creates author(s), work, edition, and copy in one request, returning the work slug

### Modified Capabilities
None.

## Impact

- New file: `client/src/pages/AddBook.tsx` — the multi-section form
- New file: `server/src/routes/quick-add.ts` — the orchestration endpoint
- `server/src/index.ts` — register `/api/quick-add` route, add `/api/attachments/upload` multer endpoint
- `client/src/pages/WorkGrid.tsx` — add "Add Manually" button in header
- `client/src/App.tsx` — add `/add` route
- `server/src/index.ts` — register `/api/quick-add` route
- New client types for the form payload and quick-add response
