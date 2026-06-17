## 1. Backend: resolved work relations

- [x] 1.1 In `server/src/routes/works.ts`, extend `GET /:slug` to resolve `authors_meta` (`{ slug, name }[]`, one per author wikilink, via `index.getAuthor`) and `series_meta` (`{ slug, name } | null`, via `index.getSeries` and a slug-from-wikilink helper)
- [x] 1.2 Add/update tests in `server/src/routes/works.test.ts` for `authors_meta` and `series_meta` (with and without a series, multiple authors)
- [x] 1.3 Extend `GET /` (list endpoint) to also resolve `authors_meta` per work — the Work Grid card requires the first author's name, which the list endpoint never resolved (caught in code review: `WorkCard` reads `authors_meta` but only `GET /:slug` populated it)
- [x] 1.4 Add a test in `server/src/routes/works.test.ts` confirming `authors_meta` is present on `GET /` list results

## 2. Backend: copies list endpoint

- [x] 2.1 In `server/src/routes/copies.ts`, add `GET /` returning `index.getAllCopies()`, or `index.getCopiesByWork(work)` if `?work=` is set, or `index.getCopiesByEdition(edition)` if `?edition=` is set (work takes precedence if both given)
- [x] 2.2 Add tests in `server/src/routes/copies.test.ts` for list (all, `?work=`, `?edition=`, no-match)

## 3. Backend: attachment serving

- [x] 3.1 In `server/src/index.ts`, mount `express.static(resolveLibraryPath("attachments", config.library_path))` at `/api/attachments`
- [x] 3.2 Add a test (or manual verification step) confirming an existing file under `attachments/` is served and a missing one 404s

## 4. Frontend: visual foundation

- [x] 4.1 Add the Fraunces variable font (`@fontsource-variable/fraunces` or equivalent) and wire `--font-display` in `client/src/index.css`
- [x] 4.2 Add the warm-paper / oxblood-accent color palette as CSS custom properties in `client/src/index.css` (light + dark), repointing existing shadcn variables (`--background`, `--foreground`, `--primary`, etc.) rather than replacing the variable names
- [x] 4.3 Add the subtle paper-grain background texture (CSS-only) as a reusable utility/class
- [x] 4.4 Update `client/src/App.tsx` nav: wordmark in the display font, add `/works/:slug` route

## 5. Frontend: data hooks

- [x] 5.1 `useWorks({ q, sort, order })` hook wrapping `GET /api/works`
- [x] 5.2 `useWork(slug)` hook wrapping `GET /api/works/:slug`
- [x] 5.3 `useEditionsByWork(slug)` hook wrapping `GET /api/editions?work=`
- [x] 5.4 `useCopiesByWork(slug)` hook wrapping `GET /api/copies?work=`

## 6. Frontend: Work Grid page

- [x] 6.1 Build the WorkCard component: cover (natural aspect ratio, placeholder if missing via `/api/attachments/:filename`), title, first author, copy count, staggered fade-in animation, hover lift
- [x] 6.2 Build the Work Grid page: responsive grid (2 cols mobile, 3–4 desktop), search bar wired to `useWorks` with 300ms debounce, sort control, genre filter chips derived client-side from loaded works
- [x] 6.3 Sync search/sort/genre state to URL search params via `useSearchParams`
- [x] 6.4 Empty state: "No books yet. Add your first book." when the library has zero works and no filter is active
- [x] 6.5 Wire `/` route in `App.tsx` to the new Work Grid page (replacing the health-check placeholder)

## 7. Frontend: Work Detail page

- [x] 7.1 Build the metadata section: cover, title, subtitle, `authors_meta` as links to `/authors/:slug`, original language, genres, description
- [x] 7.2 Build the series link section (rendered only if `series_meta` is non-null), linking to `/series/:slug`
- [x] 7.3 Build the editions + copy cards section: render each edition from `useEditionsByWork`, group copies from `useCopiesByWork` by matching `copy.edition` to each edition's wikilink, render a CopyCard per copy (format, condition, status badge, location, acquisition source) with an empty/add-copy state when an edition has zero copies
- [x] 7.4 Build the Edit Work modal (Base UI dialog): form for title, subtitle, authors, genres, description, series, series_position, primary_cover; submits `PATCH /api/works/:slug`
- [x] 7.5 Not-found state for an unknown work slug
- [x] 7.6 Wire `/works/:slug` route in `App.tsx`

## 8. Verification

- [x] 8.1 Run full server test suite, confirm all tests pass
- [x] 8.2 Start the dev server + client, manually verify: grid loads/searches/sorts/filters, empty state, navigating to a work, series link presence/absence, editions+copies grouping, cover images rendering via `/api/attachments`, edit modal round-trip

## 9. Code review fixes

- [x] 9.1 Fix `EditWorkModal`/`PATCH /api/works/:slug`: clearing a field in the modal now sends an explicit `null`, and the PATCH handler deletes the frontmatter key on `null` instead of silently ignoring the dropped-`undefined` key (previously clearing a field appeared to save but the old value persisted)
- [x] 9.2 Fix `useWork`: guard against a stale in-flight fetch overwriting state after the slug changes (rapid navigation between work pages could otherwise show the wrong work's data)
- [x] 9.3 Add `maxAge` caching and a JSON `{ error }` 404 fallback to the `/api/attachments` static mount, consistent with every other route's error shape
