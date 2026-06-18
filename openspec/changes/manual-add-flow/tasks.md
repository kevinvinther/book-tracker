## 1. Backend: quick-add endpoint

- [x] 1.1 Create `server/src/routes/quick-add.ts` with `POST /api/quick-add` — validates title and authorNames, resolves/creates authors, creates Work, Edition, and Copy, returns `{ workSlug }`
- [x] 1.2 Register the route in `server/src/index.ts`
- [x] 1.3 Create `server/src/routes/quick-add.test.ts` with tests for: existing author, new author, multiple authors, missing title, missing authors, full fields, minimal fields

## 2. Frontend: types

- [x] 2.1 Add `QuickAddPayload` and `QuickAddResponse` types to `client/src/lib/types.ts`

## 3. Frontend: Author autocomplete component

- [x] 3.1 Create `client/src/components/AuthorSelector.tsx` — text input with dropdown of existing authors (fetched via `GET /api/authors`), case-insensitive filtering, "Create new" option when no match, selected authors as chips below input

## 4. Frontend: Add Book page

- [x] 4.1 Create `client/src/pages/AddBook.tsx` — multi-section form with Work section (title, subtitle), Author section (using AuthorSelector), Edition section (isbn, publisher, publish_date, page_count, format, language), Copy section (condition, acquisition_date, acquisition_source, price_amount, price_currency, location)
- [x] 4.2 Validate required fields (title, at least one author) before submission
- [x] 4.3 On success, redirect to `/works/{workSlug}`
- [x] 4.4 Cancel button returns to `/`

## 5. Frontend: Wire Add Manually button

- [x] 5.1 Add "Add Manually" button to `client/src/pages/WorkGrid.tsx` header, linking to `/add`

## 6. Frontend: routing

- [x] 6.1 Add `/add` route to `client/src/App.tsx`

## 7. Verification

- [x] 7.1 Run full server test suite, confirm all tests pass
- [x] 7.2 Run client TypeScript check, confirm no type errors
- [x] 7.3 Manually verify: navigate to `/add`, fill in form with existing author, submit → work is created and redirected to detail page; fill in form with new author, submit → author is created and linked; verify title and author validation
