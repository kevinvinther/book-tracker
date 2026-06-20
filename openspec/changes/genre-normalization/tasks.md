## 1. Server: Genre normalization utility and genres.yaml management

- [x] 1.1 Create `server/src/lib/genres.ts` with `normalizeGenre(s: string): string` using `limax`
- [x] 1.2 Add `readGenresYaml(libraryPath): string[]` and `writeGenresYaml(libraryPath, genres: string[])` to the module (atomic write via temp file + rename)
- [x] 1.3 Add `seedGenresYaml(index, libraryPath)` — collects all genres from existing works, normalizes, deduplicates, sorts, writes to `genres.yaml` if it doesn't exist
- [x] 1.4 Add `loadAllGenres(index, libraryPath): string[]` — merges curated list from `genres.yaml` with normalized genres discovered from existing works, deduplicated and sorted

## 2. Server: Genre API endpoints

- [x] 2.1 Create `server/src/routes/genres.ts` with `createGenresRouter(index, libraryPath)` factory function
- [x] 2.2 Implement `GET /api/genres` — returns `loadAllGenres(index, libraryPath)`
- [x] 2.3 Implement `PATCH /api/genres` — validates `{ genres: string[] }`, normalizes each, deduplicates, sorts, writes via `writeGenresYaml`, returns the normalized list
- [x] 2.4 Register the genres router in `server/src/index.ts`
- [x] 2.5 Add `.booktracker` (without trailing `/cache`) to `LIBRARY_DIRECTORIES` in `server/src/config.ts` so the directory is created on startup

## 3. Server: Wire normalization into existing endpoints

- [x] 3.1 Apply `normalizeGenre` to `genres` in `POST /api/works` (in `server/src/routes/works.ts`)
- [x] 3.2 Apply `normalizeGenre` to `genres` in `PATCH /api/works/:slug` (same file)
- [x] 3.3 Accept and normalize `genres` in `POST /api/quick-add` (in `server/src/routes/quick-add.ts`)
- [x] 3.4 Normalize genres on read in `works_by_genre` computation in `GET /api/stats` (in `server/src/routes/stats.ts`)
- [x] 3.5 Call `seedGenresYaml(index, libraryPath)` during server startup (in `server/src/index.ts`)

## 4. Client: GenreSelector component

- [x] 4.1 Create `client/src/components/GenreSelector.tsx` modeled on `AuthorSelector.tsx`: text input, dropdown autocomplete from `GET /api/genres`, selected items as removable chip badges, "Create" button for free-text new genres, click-outside-to-close, Enter to select/create, dedup on add
- [x] 4.2 Add `GenreSelector` props: `selected: string[]`, `onChange: (genres: string[]) => void`

## 5. Client: Integrate GenreSelector into EditWorkModal

- [x] 5.1 Replace the comma-separated text input for genres in `client/src/components/EditWorkModal.tsx` with the `GenreSelector` component
- [x] 5.2 Update genre state management: `const [genres, setGenres] = useState<string[]>((work.genres ?? []))`
- [x] 5.3 Update form submission: pass `genres` array directly (no longer split/join)

## 6. Client: AddBook page genre pass-through

- [x] 6.1 In `client/src/pages/AddBook.tsx`, store genres from lookup data in component state
- [x] 6.2 Include genres in the `POST /api/quick-add` request body when submitting

## 7. Client: Settings page genre curation

- [x] 7.1 Add a "Genres" section to `client/src/pages/Settings.tsx` with a textarea (one genre per line)
- [x] 7.2 Fetch `GET /api/genres` on mount and populate the textarea
- [x] 7.3 Add a "Save Genres" button that parses the textarea, trims blank lines, and sends `PATCH /api/genres`
- [x] 7.4 Show success/error feedback on save
