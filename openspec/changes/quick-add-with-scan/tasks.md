## 1. Backend: Dedup Endpoint

- [x] 1.1 Add `getEditionByISBN(isbn: string)` to the Index class — filters `getAllEditions()` by exact ISBN match, returns the first matching Edition or undefined
- [x] 1.2 Add `getWorksByTitleAndAuthor(title: string, authorName: string)` to the Index class — searches works by title substring, then filters to those sharing the given author name (case-insensitive on author names), returns up to 5 matches
- [x] 1.3 Create `GET /api/quick-add/check-dedup` endpoint accepting `isbn`, `title`, and `author` query parameters; returns `{ editionMatch, workMatches }` with nulls/empty arrays when no matches found
- [x] 1.4 Write tests for `getEditionByISBN` and `getWorksByTitleAndAuthor` in a new or existing index test file
- [x] 1.5 Write tests for the check-dedup endpoint covering: ISBN match found, title+author match found, no matches, missing all params, multiple work matches

## 2. Backend: Quick-Add Enhancements

- [x] 2.1 Add `attachToWorkSlug` handling to `POST /api/quick-add` — when provided and the Work exists, skip Work creation and author resolution, create only Edition and Copy linked to the existing Work
- [x] 2.2 Validate: reject requests with neither `title` nor `attachToWorkSlug` (400); reject requests with `attachToWorkSlug` pointing to nonexistent Work (400)
- [x] 2.3 Write tests for `POST /api/quick-add` attach-to-existing flow: successful attach, nonexistent work, missing both title and attachToWorkSlug, attach with edition/copy fields

## 3. Frontend: Scan Trigger + State Machine

- [x] 3.1 Add `BarcodeScannerLazy` import and rendering to the `/add` page — include a "Scan Barcode" button in the header that toggles the scanner
- [x] 3.2 Add manual ISBN text input and "Lookup" button near the scan button for camera-less fallback
- [x] 3.3 Implement page state machine: `idle` (shows form), `scanning` (shows BarcodeScanner), `loading` (shows spinner after ISBN captured), `preview` (shows editable metadata), `submitting` (shows spinner during POST)
- [x] 3.4 On successful scan or manual ISBN lookup, call `GET /api/lookup?isbn=...` while in `loading` state; handle 404/error by returning to `idle` with error toast
- [x] 3.5 After successful lookup, call `GET /api/quick-add/check-dedup?isbn=...&title=...&author=...` and store the dedup result alongside the lookup data

## 4. Frontend: Preview Screen

- [x] 4.1 Build preview screen layout: cover image (if available), editable fields for title/subtitle/publisher/publish_date/page_count/format/language/genres/description
- [x] 4.2 Display each author in an `AuthorSelector`-style dropdown defaulting to the resolved match; allow user to select a different existing author or create new
- [x] 4.3 Display dedup results: if `editionMatch`, show "This edition already exists — Add another copy?"; if `workMatches`, show each match with "Attach to this Work" option
- [x] 4.4 Add editable copy fields section (condition, acquisition_date, acquisition_source, price_amount, price_currency, location) — all optional
- [x] 4.5 Add "Confirm & Create" button that constructs the payload (with `attachToWorkSlug` if user chose to attach) and POSTs to `/api/quick-add`; on 201 redirect to `/works/{slug}`, on error show message
- [x] 4.6 Add "Cancel" button on preview that returns to `idle` state with manual form

## 5. Integration & Polish

- [x] 5.1 Verify the manual-only path still works unchanged — submit the manual form without scanning and confirm it creates entities as before
- [ ] 5.2 Manual test: scan a barcode → verify lookup fetches data → verify preview shows editable fields → confirm → verify entities created on disk
- [ ] 5.3 Manual test: scan a barcode for an existing ISBN → verify dedup warning appears → choose "Add another copy" → verify new copy created without new Work
- [ ] 5.4 Manual test: enter ISBN manually → verify same flow works without camera
- [ ] 5.5 Manual test: lookup failure (invalid ISBN) → verify error toast and return to manual form with ISBN preserved
- [x] 5.6 Run `npm run lint` and `npm run typecheck` and fix any issues
