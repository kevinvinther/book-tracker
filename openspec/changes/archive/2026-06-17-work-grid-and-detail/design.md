## Context

The client is currently a bare scaffold: `Home.tsx` just pings `/api/health`, `Settings.tsx` is a single form. React Router, Tailwind v4, shadcn/ui (button only), Base UI (headless primitives), and the Geist Variable font are already wired up. There is no data-fetching library — both existing pages use raw `fetch` in `useEffect`.

All backend CRUD (Work, Author, Edition, Copy, Series) exists. Read-throughs, notes, and loans do not exist yet, so Copy cards and Work Detail can only show ownership/bibliographic data for now.

## Goals / Non-Goals

**Goals:**
- Work Grid as the app's home page: live search, sort, genre filter, responsive cover grid
- Work Detail page: metadata, series link, editions grouped with their copies, inline edit
- A visual identity for the app established here that later pages will follow
- Cover images actually render, which requires a way to serve files from the (configurable, outside-the-client) library path

**Non-Goals:**
- Reading-status badges/filtering, note counts, loan badges — their backends don't exist yet
- Author Detail / Series Detail pages (separate future change)
- A generic asset upload flow — covers are just read from whatever `primary_cover`/`cover_image` already points to
- A `/api/genres` endpoint — genre filter options are derived from whatever works are currently loaded

## Decisions

### Visual design direction: literary archive / card catalog

Committing to a specific, bookish aesthetic rather than a generic dashboard look:

- **Typography**: pair a distinctive serif display font for titles and headings with the existing Geist Variable for UI chrome (buttons, labels, metadata, form inputs). Proposed: **Fraunces** (variable, characterful soft-serif with ink-trap detailing) for work titles, page headings, and the nav wordmark. Geist stays for everything functional — this is the "distinctive display + refined body" pairing.
- **Color**: warm paper background (off-white, warm hue, not pure white) and near-black ink text, with a single bold accent — a deep oxblood/burgundy (library due-date-stamp red) for primary actions, active filters, and focus rings. Dark mode: warm charcoal "reading room at night" background, same oxblood accent slightly desaturated. Both themes defined as new CSS custom properties alongside the existing shadcn variables in `index.css`, not a wholesale replacement of them (buttons etc. still resolve through `--primary` etc., just repointed to the new palette).
- **Motion**: one orchestrated reveal on grid load — cards fade/scale in with staggered `animation-delay` by index (CSS only, no JS animation library needed). Hover lift (translateY + shadow growth) on cards. No scattered micro-interactions beyond that.
- **Spatial composition**: grid cards keep each cover's natural aspect ratio instead of force-cropping to a uniform box — book covers are not uniform, and that variation is part of the "shelf" feel. Work Detail uses an asymmetric two-column layout: a large cover on the left with a deliberate drop shadow (a "shelved book" effect, slight overlap into the metadata column), metadata + editions on the right, an oxblood vertical rule between them.
- **Texture**: a faint paper-grain overlay (CSS-only, layered radial-gradients or an inline SVG noise filter — no image asset) on page backgrounds for depth, kept subtle so it doesn't fight readability.

Implementation complexity is restrained to match: this is not a maximalist design, so animations stay to the one load sequence and hover states, and the grain/texture stays subtle.

### No new data-fetching library

Keep raw `fetch` + small custom hooks (`useWorks`, `useWork`), consistent with the existing `Home.tsx`/`Settings.tsx` style and the small current API surface. Considered TanStack Query — rejected for now; the revalidation needs are simple (refetch after a mutation) and adding a dependency isn't justified yet. Revisit if/when Read-throughs/Notes/Loans add enough concurrent fetching to justify it.

### Grid state lives in the URL

Search query, sort, and genre filter are stored as URL search params (`useSearchParams`) rather than component state. Makes the grid view bookmarkable/shareable and survives browser back/forward. Search input is debounced (300ms) client-side before it updates the URL and triggers a refetch.

### Genre filter is derived client-side

The grid filters its currently-loaded works list by genre client-side; there's no new backend endpoint for a canonical genre list (that's the eventual genre-normalization change's job). Filter chips are built from the union of genres on the loaded works.

### Work Detail fetches copies once per work, not once per edition

`GET /api/copies?work=:slug` is called once and the result is grouped client-side by each copy's `edition` wikilink, rather than calling `GET /api/copies?edition=:slug` once per edition. Avoids N+1 requests.

### `authors_meta`/`series_meta` follow the existing inline-meta convention

`copies.ts` already inlines `edition_meta`/`work_meta` on `GET /api/copies/:slug`, and `series.ts` inlines a resolved `works` array on `GET /api/series/:slug`. `works.ts`'s `GET /:slug` handler gets the same treatment: resolve `authors_meta` (`{ slug, name }[]`) and `series_meta` (`{ slug, name } | null`) from the index inline, rather than the frontend doing N+1 fetches per author/series.

### Cover images served via `express.static`

New route mounts `express.static(resolveLibraryPath("attachments", libraryPath))` at `/api/attachments`. Simpler than a hand-rolled streaming handler — `express.static` gives correct content-types, caching headers, range requests, and 404s for free, and normalizes paths so `..` traversal is rejected by default.

### Edit Work via modal dialog

Per the build plan's "inline or modal form" choice: a modal (Base UI dialog primitive, already a dependency) keeps the Work Detail page itself uncluttered. Submits a `PATCH /api/works/:slug`.

## Risks / Trade-offs

- **Copy cards look sparse compared to the long-term vision** (no read-through status, note count, or loan badge yet) → mitigated by being explicit in the proposal that this is deferred, not forgotten; later changes modify these same cards once their backends exist.
- **`express.static` on `/api/attachments` exposes the whole attachments directory by filename** → acceptable for a local single-user app with no auth model anywhere yet; flagging here so it's a conscious choice, not an oversight.
- **Genre filter options depend on what's currently loaded/searched**, not a global list → acceptable stopgap; revisit once genre normalization ships a canonical list.
