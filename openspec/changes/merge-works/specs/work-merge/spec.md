## ADDED Requirements

### Requirement: Merge endpoint contract
The system SHALL expose `POST /api/works/merge` accepting a JSON body `{ winner: string, loser: string }` containing two existing Work slugs. The endpoint SHALL reject with HTTP 400 when `winner` and `loser` are the same slug, and with HTTP 404 when either slug does not resolve to a Work in the index. On success the endpoint SHALL return HTTP 200 with the updated winner Work as the JSON body.

#### Scenario: Successful merge returns updated winner
- **WHEN** the client sends `POST /api/works/merge` with `{ "winner": "the-hobbit", "loser": "the-hobbit-dup" }` and both Works exist
- **THEN** the server returns 200 with the updated `the-hobbit` Work as JSON

#### Scenario: Self-merge rejected
- **WHEN** the client sends `POST /api/works/merge` with `{ "winner": "the-hobbit", "loser": "the-hobbit" }`
- **THEN** the server returns 400 with an error message indicating winner and loser must differ

#### Scenario: Missing winner
- **WHEN** the client sends `POST /api/works/merge` with a `winner` slug that does not exist in the index
- **THEN** the server returns 404 with an error message indicating the winner Work was not found

#### Scenario: Missing loser
- **WHEN** the client sends `POST /api/works/merge` with a `loser` slug that does not exist in the index
- **THEN** the server returns 404 with an error message indicating the loser Work was not found

### Requirement: Re-parenting of dependent entities
The merge handler SHALL rewrite the `work` wikilink of every dependent entity of the loser to point at the winner. Dependents are: every Edition whose `work` is `[[works/<loser>]]`, every Copy whose `work` is `[[works/<loser>]]`, and every Note whose `work` is `[[works/<loser>]]`. Each rewritten file SHALL be re-read from disk before writing, have only its `work` wikilink changed, have its body re-rendered via `renderBody`, and be written atomically (temp file + rename). The in-memory index SHALL be upserted for each rewritten entity.

#### Scenario: Edition re-parented onto winner
- **WHEN** the loser Work has an edition whose `work` is `[[works/the-hobbit-dup]]`
- **THEN** after merge that edition's `work` wikilink is `[[works/the-hobbit]]` on disk and in the index

#### Scenario: Copy re-parented onto winner
- **WHEN** the loser Work has a copy whose `work` is `[[works/the-hobbit-dup]]`
- **THEN** after merge that copy's `work` wikilink is `[[works/the-hobbit]]` on disk and in the index

#### Scenario: Note re-parented onto winner
- **WHEN** the loser Work has a note whose `work` is `[[works/the-hobbit-dup]]`
- **THEN** after merge that note's `work` wikilink is `[[works/the-hobbit]]` on disk and in the index

#### Scenario: Copy nested under re-parented edition still resolves
- **WHEN** an edition was re-parented from loser to winner and a copy references that edition via its `edition` wikilink
- **THEN** the copy's `edition` wikilink is unchanged and `getCopiesByEdition` still returns that copy

### Requirement: Slugs remain immutable during merge
The merge handler SHALL NOT regenerate the slug of any Edition, Copy, or Note during re-parenting. Edition, Copy, and Note slugs retain their original values even when their parent Work slug changes. The loser Work's slug is freed for reuse only after the loser Work file is deleted.

#### Scenario: Edition slug unchanged after re-parenting
- **WHEN** an edition with slug `the-hobbit-dup-houghton-1937` is re-parented from loser `the-hobbit-dup` to winner `the-hobbit`
- **THEN** the edition's slug remains `the-hobbit-dup-houghton-1937` on disk and in the index

### Requirement: Winner absorbs loser metadata
After all dependents are re-parented, the merge handler SHALL re-read the winner Work from disk and absorb the loser's metadata using these rules:
- **authors** — union of winner's and loser's author slugs, deduplicated by slug
- **genres** — union, deduplicated by normalized value (each value passed through `normalizeGenre`)
- **aliases** — loser's aliases appended to winner's aliases, deduplicated by exact string match; the loser's `title` SHALL be appended as an alias on the winner if not already present
- **title** — winner's title is preserved unchanged
- **subtitle, description, primary_cover, series, series_position, original_language, original_publish_year** — winner's value is preserved if set; otherwise the loser's value is adopted (omitted entirely if both are unset, per the no-empty-optional-fields convention)

The winner file SHALL be written atomically with a re-rendered body, and the in-memory index SHALL be upserted.

#### Scenario: Authors unioned
- **WHEN** the winner has authors `[a-1]` and the loser has authors `[a-1, a-2]`
- **THEN** after merge the winner has authors `[a-1, a-2]` (deduplicated)

#### Scenario: Genres unioned and normalized
- **WHEN** the winner has genres `[sci-fi]` and the loser has genres `[Science Fiction, fantasy]`
- **THEN** after merge the winner has genres `[sci-fi, science-fiction, fantasy]`

#### Scenario: Loser title becomes alias
- **WHEN** the winner's title is "The Hobbit" and the loser's title is "The Hobbit: An Unexpected Journey"
- **THEN** after merge the winner's aliases include "The Hobbit: An Unexpected Journey"

#### Scenario: Winner scalar field kept when set
- **WHEN** the winner has `primary_cover` set and the loser also has `primary_cover` set
- **THEN** after merge the winner's `primary_cover` is unchanged

#### Scenario: Loser scalar adopted when winner empty
- **WHEN** the winner has no `description` and the loser has `description: "A burglar goes on an adventure."`
- **THEN** after merge the winner's `description` is "A burglar goes on an adventure."

### Requirement: Loser Work deleted after successful re-parenting
After all dependents are re-parented and the winner's metadata is absorbed, the merge handler SHALL delete the loser Work file from disk and remove it from the in-memory index. The loser's slug SHALL no longer resolve via `GET /api/works/:slug` or appear in `GET /api/works`.

#### Scenario: Loser Work file removed
- **WHEN** a merge completes successfully
- **THEN** the file `works/<loser-slug>.md` no longer exists on disk

#### Scenario: Loser no longer in index
- **WHEN** a merge completes successfully
- **THEN** `GET /api/works/<loser-slug>` returns 404

### Requirement: Notes by work lookup helper
The `Index` SHALL expose `getNotesByWork(workSlug: string): Note[]` returning all notes whose `work` wikilink is `[[works/<workSlug>]]`. This helper is used by the merge handler to discover notes that must be re-parented.

#### Scenario: Notes filtered by work
- **WHEN** `getNotesByWork("the-hobbit-dup")` is called and three notes have `work: "[[works/the-hobbit-dup]]"`
- **THEN** all three notes are returned

#### Scenario: No matching notes
- **WHEN** `getNotesByWork("nonexistent")` is called
- **THEN** an empty array is returned

### Requirement: Merge order guarantees no dangling references
The merge handler SHALL re-parent all dependent entities (notes, copies, editions) and absorb winner metadata BEFORE deleting the loser Work file, so that at no point does the loser exist on disk with inbound references already severed. If any file write fails mid-merge, the handler SHALL return HTTP 500 with the error and leave the partial state in place; a subsequent retry is safe because re-read-before-write reconciles already-reparented entities.

#### Scenario: Loser deleted only after dependents re-parented
- **WHEN** a merge is in progress
- **THEN** no dependent entity on disk references the loser's slug by the time the loser file is deleted

#### Scenario: Partial-failure retry is idempotent
- **WHEN** a merge fails after re-parenting two of three editions and the user retries the same merge
- **THEN** the already-reparented editions are re-read (their `work` already points to winner) and rewritten unchanged, and the third edition is re-parented
