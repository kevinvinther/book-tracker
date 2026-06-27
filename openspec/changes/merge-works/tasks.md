## 1. Index helper

- [x] 1.1 Add `getNotesByWork(workSlug: string): Note[]` to `server/src/lib/index.ts` filtering notes whose `work` wikilink is `[[works/<workSlug>]]`
- [x] 1.2 Add unit tests in `server/src/lib/index.test.ts` covering the empty case, the matching case, and notes attached to a different work

## 2. Merge route — validation

- [x] 2.1 Create `server/src/routes/merge.ts` exporting `createMergeRouter(index, libraryPath)` with a `POST /` (registered as `/api/works/merge` in `index.ts`) handler
- [x] 2.2 Reject with 400 when `winner === loser` (case-insensitive trimmed comparison)
- [x] 2.3 Reject with 404 when either slug does not resolve via `index.getWork`; include which slug was missing in the error message
- [x] 2.4 Register the router in `server/src/index.ts` at `/api/works/merge`

## 3. Merge route — re-parenting

- [x] 3.1 Implement note re-parenting: for each `getNotesByWork(loser.slug)`, re-read the note file from disk, rewrite the `work` wikilink to `[[works/<winner.slug>]]`, re-render body via `renderBody(note, index)`, write atomically, `index.upsert("note", ...)`
- [x] 3.2 Implement copy re-parenting: for each `getCopiesByWork(loser.slug)`, re-read, rewrite `work` wikilink to winner, re-render body, write atomically, upsert
- [x] 3.3 Implement edition re-parenting: for each `getEditionsByWork(loser.slug)`, re-read, rewrite `work` wikilink to winner, re-render body, write atomically, upsert
- [x] 3.4 Order operations notes → copies → editions → winner metadata → loser deletion, so no dangling references exist when the loser is removed

## 4. Merge route — metadata absorption

- [x] 4.1 Re-read winner work file from disk
- [x] 4.2 Union `authors`: merge winner's and loser's author slugs into a deduplicated array (preserve winner ordering first)
- [x] 4.3 Union `genres`: merge and pass each through `normalizeGenre`, deduplicate
- [x] 4.4 Append loser's `aliases` to winner's `aliases`, deduplicate by exact string match; append loser's `title` as an alias if not already present (omit `aliases` key entirely if result is empty)
- [x] 4.5 For scalar fields (`subtitle`, `description`, `primary_cover`, `series`, `series_position`, `original_language`, `original_publish_year`): preserve winner's value if set, otherwise adopt loser's; omit key entirely when both are unset
- [x] 4.6 Preserve winner's `title`, `slug`, `type`, `created_at`, `_schema` unchanged
- [x] 4.7 Re-render winner body via `renderBody(winner, index)`, write atomically, `index.upsert("work", winner)`

## 5. Merge route — loser deletion

- [x] 5.1 After all dependents re-parented and winner metadata absorbed, `deleteFile` the loser work file at `works/<loser.slug>.md`
- [x] 5.2 `index.remove("work", loser.slug)`
- [x] 5.3 Return HTTP 200 with the updated winner work as JSON

## 6. Merge route — error handling

- [x] 6.1 Wrap the handler body in try/catch; on any thrown error log `[merge error]` and return 500 with a generic message
- [x] 6.2 Confirm a retry after a partial failure is safe (already-reparented entities re-read with winner wikilink and are rewritten unchanged)

## 7. Merge route — tests

- [x] 7.1 Happy path: two works each with editions, copies, and notes → loser deleted, winner has unioned authors/genres, loser's title as alias, dependents reparented; edition/copy/note slugs unchanged
- [x] 7.2 Self-merge returns 400
- [x] 7.3 Missing winner returns 404; missing loser returns 404
- [x] 7.4 Loser with no dependents: winner metadata still absorbed, loser deleted
- [x] 7.5 Edition slug immutability: assert post-merge edition slug still references loser's old work slug even though its `work` wikilink points to winner
- [x] 7.6 Idempotent retry: simulate a failure mid-merge and confirm a second call completes successfully with consistent state
- [x] 7.7 Loans travel with copies: a copy with `loans[]` retains them after re-parenting

## 8. Merge modal — entry point

- [x] 8.1 Add a "Merge with another work…" button to the Work Detail page header (`client/src/pages/WorkDetail.tsx`), styled as a secondary action distinct from "Edit Work"
- [x] 8.2 Clicking opens the `MergeWorksModal` with `winnerSlug` and `winnerTitle` props pre-set to the current work

## 9. Merge modal — component scaffold

- [x] 9.1 Create `client/src/components/MergeWorksModal.tsx` accepting `winnerSlug`, `winnerTitle`, `onClose`
- [x] 9.2 Use the existing `Dialog`/`Modal` primitives from shadcn/ui used elsewhere in the app
- [x] 9.3 Render the winner's title prominently at the top so the user knows which work is the target

## 10. Merge modal — loser search

- [x] 10.1 Debounced text input that queries `GET /api/works?q=<query>` and lists results, filtering out the winner slug
- [x] 10.2 Selecting a result sets `loserSlug`/`loserTitle` state and advances to the preview step
- [x] 10.3 Disable the preview/confirm controls until a loser is selected

## 11. Merge modal — preview

- [x] 11.1 When a loser is selected, fetch in parallel: `GET /api/editions?work=<loser>`, `GET /api/copies?work=<loser>`, `GET /api/works/<loser>` (for loser metadata), and `GET /api/works/<winner>` (for winner metadata)
- [x] 11.2 Compute and display re-parent counts: editions, copies, and `GET /api/notes?work=<loser>` for notes
- [x] 11.3 Compute and display genres to add (loser's genres minus winner's, normalized)
- [x] 11.4 Compute and display aliases to add (loser's aliases plus loser's title, minus winner's existing aliases)
- [x] 11.5 Compute and display scalar fields the winner will adopt from the loser (subtitle, description, primary_cover, series, series_position, original_language, original_publish_year — only those the winner lacks)
- [x] 11.6 Loading state: skeleton in the preview section while fetches are in flight
- [x] 11.7 Error state: if any preview fetch fails, show an error with a retry button and disable the confirm button

## 12. Merge modal — confirmation

- [x] 12.1 "Confirm Merge" button issues `POST /api/works/merge` with `{ winner: winnerSlug, loser: loserSlug }`
- [x] 12.2 In-flight: button shows a loading spinner and is disabled
- [x] 12.3 On 200: close the modal, trigger Work Detail refetch, show a success toast
- [x] 12.4 On non-2xx: keep modal open, display the error message inline above the confirm button, re-enable the button
- [x] 12.5 Cancel/close without confirming sends no request and leaves the Work Detail page unchanged

## 13. Notes API — list by work

- [x] 13.1 Confirm `GET /api/notes?work=<slug>` exists (or add support for the `work` query param to the notes list endpoint) so the modal preview can fetch note counts by work
- [x] 13.2 If adding the param, follow the existing pattern used by `/api/editions?work=` and `/api/copies?work=`
- [x] 13.3 Add a test for the notes-by-work filter

## 14. Lint, typecheck, and full test run

- [x] 14.1 Run `npm run lint` (server and client) and resolve any issues
- [x] 14.2 Run `npm run typecheck` (server and client) and resolve any issues
- [x] 14.3 Run `npm test` (server and client) and confirm all green, including new merge tests
