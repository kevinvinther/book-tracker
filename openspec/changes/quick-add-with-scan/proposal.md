## Why

The barcode scanner, ISBN lookup service, and author find-or-create logic are all built but disconnected. A user can scan a barcode but the ISBN goes nowhere; they can look up an ISBN via `/api/lookup` but the result doesn't feed the add form. This change wires them into one seamless flow: scan a book barcode, get its metadata from Open Library, preview and correct the data, then create the entities in one step — eliminating the need to manually type title, author, publisher, or other metadata.

## What Changes

- **Frontend scan trigger**: The `/add` page gains a "Scan Barcode" button that opens the existing `<BarcodeScanner>` component
- **ISBN lookups from the client**: After scanning, the client calls `GET /api/lookup?isbn=...` to fetch book metadata
- **Deduplication checks**: After lookup, the client checks whether the ISBN or a title+author combination already exists. If the edition already exists, the user is offered to add another copy. If a similar work exists, the user is offered to attach to it
- **Preview & edit screen**: Fetched metadata is displayed in a preview screen where all fields are editable before confirmation. Author links from the lookup can be corrected via dropdown
- **Attach to existing Work**: When the user confirms a match to an existing Work, only an Edition and Copy are created (the Work's metadata is never modified)
- **Backend dedup endpoint**: A new backend endpoint or enriched `POST /api/quick-add` behavior checks for duplicate Editions via ISBN and supports attaching to an existing Work by work slug rather than creating one

## Capabilities

### New Capabilities

- `quick-add-scan-flow`: The end-to-end client-side flow — scan a barcode, call the ISBN lookup API, run deduplication checks, show a preview screen with editable fields, confirm creation. Includes the "Scan Barcode" button integration on the `/add` page, the dedup checks against existing editions and works, and the preview/edit step before final submission.

### Modified Capabilities

- `quick-add-endpoint`: The `POST /api/quick-add` endpoint gains deduplication support. When an ISBN is provided, the endpoint checks whether an existing Edition has the same ISBN and returns a conflict response. When `attachToWorkSlug` is provided, the endpoint creates only the Edition and Copy, linking them to the existing Work without modifying its metadata.
- `manual-add-form`: The `/add` page (manual add form) gains a "Scan Barcode" button in the header that opens the barcode scanner. After a successful scan, the lookup result flows into the preview screen instead of the manual fields. The page now handles three states: manual entry, loading/lookup, and preview/edit.

## Impact

- **Client pages/components**: `client/src/pages/AddBook.tsx` — adds scan trigger, lookup call, dedup logic, preview/edit screen; `client/src/components/BarcodeScanner.tsx` / `BarcodeScannerLazy.tsx` — already built, now imported and used
- **Server routes**: `server/src/routes/quick-add.ts` — adds ISBN dedup check and attach-to-existing-Work logic
- **API**: `POST /api/quick-add` accepts new optional field `attachToWorkSlug`; returns 409 Conflict when ISBN matches existing Edition
- **No new dependencies**: All required libraries (`html5-qrcode`) are already installed
