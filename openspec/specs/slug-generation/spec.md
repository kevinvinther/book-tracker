# slug-generation Specification

## Purpose
TBD - created by archiving change file-io-in-memory-index. Update Purpose after archive.
## Requirements
### Requirement: Generate a slug from a title string
The system SHALL provide a `generateSlug` function that converts a human-readable title into a URL-safe slug by applying the following steps in order: (1) transliterate Unicode characters to ASCII equivalents, (2) lowercase the result, (3) replace any character that is not a lowercase letter, digit, or hyphen with a single hyphen, (4) collapse consecutive hyphens into one, (5) strip leading and trailing hyphens, and (6) truncate the result to 80 characters.

#### Scenario: Simple English title
- **WHEN** `generateSlug` is called with `"The Brothers Karamazov"` and an empty set of existing slugs
- **THEN** the function returns `"the-brothers-karamazov"`

#### Scenario: Title with non-ASCII characters
- **WHEN** `generateSlug` is called with `"Cien años de soledad"` and an empty existing slugs set
- **THEN** the function returns `"cien-anos-de-soledad"` (ñ → n, accented vowels → unaccented)

#### Scenario: Title with punctuation and special characters
- **WHEN** `generateSlug` is called with `"Čapek's War"` and an empty existing slugs set
- **THEN** the function returns `"capeks-war"` (Č→c, apostrophe removed, all lowercase)

#### Scenario: Title produces slug longer than 80 characters
- **WHEN** `generateSlug` is called with a very long title whose normalized slug exceeds 80 characters
- **THEN** the returned slug is truncated to exactly 80 characters with no trailing hyphen

#### Scenario: Title with consecutive special characters
- **WHEN** `generateSlug` is called with `"Hello!!!---World"` and an empty existing slugs set
- **THEN** the function returns `"hello-world"` (multiple non-alphanumeric characters collapsed to a single hyphen)

#### Scenario: Title that is all special characters or empty
- **WHEN** `generateSlug` is called with `"!@#$%"` or an empty string
- **THEN** the function returns a non-empty fallback slug (e.g., a timestamp-based string or "untitled") rather than an empty string

### Requirement: Handle slug collisions with disambiguating suffix
When the generated slug already exists in the provided set of existing slugs, the system SHALL append a disambiguating suffix derived from the first author's last name, separated by a hyphen. If the suffix also collides, an incrementing number SHALL be appended. `generateSlug` is the sole authority for slug creation — entity creation code SHALL NOT accept user-provided slugs.

#### Scenario: No collision
- **WHEN** `generateSlug` is called with `"Dune"`, author `"Frank Herbert"`, and existing slugs `["foundation", "hyperion"]`
- **THEN** the function returns `"dune"` without any suffix

#### Scenario: Collision resolved with author surname suffix
- **WHEN** `generateSlug` is called with `"Dune"`, author `"Frank Herbert"`, and existing slugs `["dune"]`
- **THEN** the function returns `"dune-herbert"` (appends first author's last name, lowercased and slugified)

#### Scenario: Collision where author suffix is also taken
- **WHEN** `generateSlug` is called with `"Dune"`, author `"Frank Herbert"`, and existing slugs `["dune", "dune-herbert"]`
- **THEN** the function returns `"dune-herbert-2"` (appends incrementing number)

#### Scenario: Collision without author provided
- **WHEN** `generateSlug` is called with `"Dune"`, no author string, and existing slugs `["dune"]`
- **THEN** the function appends a numeric disambiguator (e.g., `"dune-2"`)

### Requirement: Slugs are immutable once created
The `generateSlug` function SHALL only be called during entity creation. Once a slug is assigned to a file, it SHALL never be regenerated — even if the entity's title changes later.

#### Scenario: Title changes after creation
- **WHEN** a Work with slug `"dune"` has its title changed from `"Dune"` to `"Dune: The Heirloom Edition"`
- **THEN** the slug remains `"dune"` — it is not regenerated

