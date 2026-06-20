## ADDED Requirements

### Requirement: CLI unresolved links check
The system SHALL provide a verification step that runs `obsidian unresolved vault="book-tracker-data"` and expects the output `"No unresolved links found."`. This confirms every `[[wikilink]]` in the vault resolves to an existing file.

#### Scenario: No unresolved links
- **WHEN** the CLI unresolved check is run against the test data vault
- **THEN** zero unresolved links are reported

### Requirement: CLI backlinks check
The system SHALL provide a verification step that runs `obsidian backlinks` for key entity files and confirms expected incoming links exist. Backlinks from works to authors, from copies to editions, and from works to series SHALL be verified.

#### Scenario: Author has backlinks from works
- **WHEN** `obsidian backlinks file="frank-herbert"` is run
- **THEN** backlinks from at least one work file are listed

#### Scenario: Edition has backlinks from copies
- **WHEN** backlinks are checked for an edition with copies
- **THEN** backlinks from copy files are listed

### Requirement: CLI aliases check
The system SHALL provide a verification step that runs `obsidian aliases vault="book-tracker-data"` and expects non-empty output, confirming that aliases frontmatter is present on at least some entities and detectable by Obsidian.

#### Scenario: Aliases are detectable
- **WHEN** the CLI aliases check is run against the test data vault
- **THEN** at least one alias entry is listed

### Requirement: CLI tags check
The system SHALL provide a verification step that runs `obsidian tags vault="book-tracker-data"` and expects non-empty output, confirming that note tags are present and detectable by Obsidian's tag pane.

#### Scenario: Tags are detectable
- **WHEN** the CLI tags check is run against the test data vault
- **THEN** at least one tag entry is listed

### Requirement: CLI properties check
The system SHALL provide a verification step that runs `obsidian properties vault="book-tracker-data"` and confirms that frontmatter properties exist across entity files.

#### Scenario: Properties exist
- **WHEN** the CLI properties check is run against the test data vault
- **THEN** properties including `type`, `slug`, `title`, `created_at`, and `_schema` are listed

### Requirement: OBSIDIAN.md documentation
The project SHALL include an `OBSIDIAN.md` file in the repository root that documents how to open the library as an Obsidian vault, recommends plugins that improve the experience, provides example Dataview queries, and lists known limitations.

#### Scenario: File exists with required sections
- **WHEN** a user reads `OBSIDIAN.md`
- **THEN** they find sections covering: vault setup, recommended plugins (Dataview at minimum), Dataview query examples (list books by author, show currently reading, show overdue loans, show notes by tag), and known limitations (bodies are auto-generated, simultaneous editing unsupported)
