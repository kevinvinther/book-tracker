## ADDED Requirements

### Requirement: Author find-or-create utility
The system SHALL provide a `findOrCreateAuthors` function in `server/src/lib/authors.ts` that accepts an array of author name strings and returns an array of objects with `slug`, `name`, and `isNew` fields per author.

#### Scenario: All authors exist
- **WHEN** `findOrCreateAuthors` is called with `["Fyodor Dostoevsky"]` and an Author with `name: "Fyodor Dostoevsky"` already exists in the index
- **THEN** the result SHALL contain `{ slug: "fyodor-dostoevsky", name: "Fyodor Dostoevsky", isNew: false }`

#### Scenario: Author matched via alias
- **WHEN** `findOrCreateAuthors` is called with `["Dostoevsky"]` and an Author exists with `aliases: ["Dostoevsky"]` but a different `name`
- **THEN** the result SHALL contain that author's slug with `isNew: false`

#### Scenario: Some authors new, some existing
- **WHEN** `findOrCreateAuthors` is called with `["Fyodor Dostoevsky", "New Author"]` where only Dostoevsky exists
- **THEN** the result SHALL have two entries: one for Dostoevsky with `isNew: false` and one for "New Author" with `isNew: true`

#### Scenario: All authors new
- **WHEN** `findOrCreateAuthors` is called with `["Completely New Author"]` and no matching author exists
- **THEN** a new Author file SHALL be created at `authors/{slug}.md` with `name: "Completely New Author"`, `type: author`, `_schema: 1`, and a generated `created_at`
- **AND** the result SHALL contain `{ slug: <generated>, name: "Completely New Author", isNew: true }`

#### Scenario: Empty input array
- **WHEN** `findOrCreateAuthors` is called with an empty array `[]`
- **THEN** the result SHALL be an empty array `[]`

### Requirement: Case-insensitive whitespace-normalized matching
The `findOrCreateAuthors` function SHALL match author name strings against existing authors' `name` and `aliases` fields using case-insensitive, whitespace-normalized comparison. Exact character content SHALL match; fuzzy or transliteration-based matching SHALL NOT be performed.

#### Scenario: Case insensitive match
- **WHEN** `findOrCreateAuthors` is called with `["fyodor dostoevsky"]` and an Author exists with `name: "Fyodor Dostoevsky"`
- **THEN** the existing author SHALL be matched (not a new author created)

#### Scenario: Extra whitespace normalization
- **WHEN** `findOrCreateAuthors` is called with `["  Fyodor   Dostoevsky  "]` and an Author exists with `name: "Fyodor Dostoevsky"`
- **THEN** the existing author SHALL be matched after normalization

#### Scenario: No fuzzy match
- **WHEN** `findOrCreateAuthors` is called with `["Fyodor Dostoyevsky"]` and an Author exists with `name: "Fyodor Dostoevsky"` and no matching alias
- **THEN** a new Author SHALL be created (characters differ: "o" vs "oy")

### Requirement: New Author file creation
When no matching author is found, `findOrCreateAuthors` SHALL create a new Author file on disk at `authors/{slug}.md` using atomic write, add the author to the in-memory index, and return the result with `isNew: true`. The generated slug SHALL use the project's `generateSlug` function.

#### Scenario: File written to correct location
- **WHEN** a new author "New Author" is created with library path `/data`
- **THEN** a file SHALL exist at `/data/authors/{slug}.md` with frontmatter containing `type: author`, `name: "New Author"`, `slug: <generated>`, `created_at: <ISO datetime>`, and `_schema: 1`

#### Scenario: Index updated after creation
- **WHEN** a new author is created
- **THEN** calling `index.getAuthor(slug)` SHALL return the newly created author

### Requirement: Quick-add refactored to use shared utility
The `quick-add` route handler SHALL use `findOrCreateAuthors` from `server/src/lib/authors.ts` instead of its inline `findOrCreateAuthor` function. Behavior SHALL remain identical: author names from the request body are resolved to slugs, and the same Author entity files are produced.

#### Scenario: Quick-add still resolves authors correctly
- **WHEN** `POST /api/quick-add` is called with `{ title: "Test", authorNames: ["Existing Author"] }` and "Existing Author" is already in the index
- **THEN** the resulting Work's `authors` field SHALL contain `[[authors/existing-author]]` (existing author's slug)
- **AND** no new Author file SHALL be created

#### Scenario: Quick-add creates new author when needed
- **WHEN** `POST /api/quick-add` is called with `{ title: "Test", authorNames: ["Brand New Author"] }` and no matching author exists
- **THEN** the resulting Work's `authors` field SHALL contain `[[authors/brand-new-author]]` (newly generated slug)
- **AND** a new Author file SHALL exist on disk
