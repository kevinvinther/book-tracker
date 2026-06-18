## Why

The barcode scanner, ISBN lookup service, and author find-or-create logic are all built but disconnected. A user can scan a barcode but the ISBN goes nowhere; they can look up an ISBN via `/api/lookup` but the result doesn't feed the add form. This change wires them into one seamless flow: scan a book barcode, get its metadata from Google Books or Open Library, preview and correct the data, then create the entities in one step — eliminating the need to manually type title, author, publisher, or other metadata.

## What Changes

- **Frontend scan trigger**: The `/add` page gains a "Scan Barcode" button that opens the existing `<BarcodeScanner>` component, and a "Skip cache" checkbox for testing
- **ISBN normalization**: Scanner output is cleaned — non-digit characters stripped, UPC-A converted to EAN-13, price add-on segments truncated — before calling the lookup API
- **ISBN lookups from the client**: After scanning, the client calls `GET /api/lookup?isbn=...` (with optional `&nocache=1`) to fetch book metadata from Google Books (primary, requires API key) or Open Library (fallback, no key needed)
- **Deduplication checks**: After lookup, the client checks whether the ISBN or a title+author combination already exists. If the edition already exists, the user is offered to add another copy. If a similar work exists, the user is offered to attach to it
- **Preview & edit screen**: Fetched metadata is displayed in a preview screen where all fields are editable before confirmation. Publish dates are normalized to `YYYY-MM-DD` for the date input. Author links from the lookup can be corrected via dropdown. Copy fields are optional
- **Attach to existing Work**: When the user confirms a match to an existing Work, only an Edition and Copy are created (the Work's metadata is never modified)
- **Backend dedup endpoint**: `GET /api/quick-add/check-dedup` checks for duplicate Editions via ISBN and similar Works by title+author
- **Lookup service improvements**: Google Books tried first (cleaner publisher data), User-Agent header added (prevents Google 503s), publisher filtering against author names (fixes Open Library putting authors in the publisher list), cache write failures are non-fatal
- **Server request logging**: All `/api/*` requests log method, path, and response time for debugging on mobile devices without browser console

## Capabilities

### New Capabilities

- `quick-add-scan-flow`: The end-to-end client-side flow — scan a barcode, call the ISBN lookup API, run deduplication checks, show a preview screen with editable fields, confirm creation. Includes the "Scan Barcode" button integration on the `/add` page, ISBN normalization, date normalization, "Skip cache" checkbox, error auto-dismissal on input change, and the preview/edit step before final submission.

### Modified Capabilities

- `quick-add-endpoint`: The `POST /api/quick-add` endpoint gains deduplication support. When `attachToWorkSlug` is provided, the endpoint creates only the Edition and Copy, linking them to the existing Work without modifying its metadata. The `GET /api/quick-add/check-dedup` endpoint provides structured dedup results. The `GET /api/lookup` endpoint supports `?nocache=1` for bypassing the cache, tries Google Books first with User-Agent header, and filters publisher names against resolved authors.
- `manual-add-form`: The `/add` page gains a "Scan Barcode" button, manual ISBN input with "Lookup" button, "Skip cache" checkbox, and a 5-state machine (idle/scanning/loading/preview/submitting). The WorkGrid "+ Add Manually" button is renamed to "+ Add Book".

## Impact

- **Client pages/components**: `client/src/pages/AddBook.tsx` — 5-state machine, scan trigger, ISBN normalization, date normalization, lookup/dedup/preview flow, error management; `client/src/components/CopyCard.tsx` — publisher fallback and acquisition_date display; `client/src/pages/WorkGrid.tsx` — button rename
- **Server routes**: `server/src/routes/quick-add.ts` — `GET /check-dedup` endpoint, `attachToWorkSlug` support on POST; `server/src/routes/lookup.ts` — `nocache` query parameter
- **Server lookup**: `server/src/lib/lookup.ts` — Google-first ordering, User-Agent header, publisher-author filtering, non-fatal cache writes, `nocache` skip parameter; `server/src/lib/index.ts` — `getEditionByISBN` and `getWorksByTitleAndAuthor` lookup helpers
- **Server logging**: `server/src/index.ts` — request logger middleware for all `/api/*` calls
- **Docker**: HTTPS cert generation, volume mount fix, `dev:https` compose target
- **No new dependencies**: All required libraries (`html5-qrcode`) are already installed
