# scraper-metadata-sources Specification

## Purpose
TBD - created by archiving change add-scraper-metadata-sources. Update Purpose after archive.
## Requirements

### Requirement: Goodreads scraper source

The system SHALL provide a `goodreads` source that fetches a Goodreads book page server-side (located by searching Goodreads for the ISBN) and parses its HTML with `cheerio` to produce a normalized lookup result. It SHALL extract, best-effort, every field the page exposes: title, subtitle, authors, publisher, publish_date, page_count, format, language, description, genres (from the book's shelves/genre listing), and cover URL. Fields absent from the page SHALL be omitted from the result rather than emitted empty.

#### Scenario: Goodreads page parsed for an ISBN
- **WHEN** the `goodreads` source is queried for an ISBN whose Goodreads page lists a title, authors, description, and cover
- **THEN** the system returns a normalized result tagged `source: "goodreads"` carrying those fields and the raw cover URL

#### Scenario: Best-effort partial fields
- **WHEN** the Goodreads page exposes a title and cover but no page count
- **THEN** the result includes title and cover and omits `page_count` rather than emitting a placeholder

### Requirement: Amazon scraper source

The system SHALL provide an `amazon` source that fetches an Amazon (amazon.com, US marketplace) product page server-side and parses it with `cheerio`. Because Amazon book detail pages are addressed by ISBN-10, the system SHALL derive the ISBN-10 from a 13-digit ISBN (drop the `978` prefix and recompute the check digit) when needed to locate the page. It SHALL extract, best-effort, every field the page exposes: title, subtitle, authors, publisher, publish_date, page_count, format, language, description, and cover URL.

#### Scenario: ISBN-13 resolved to ISBN-10
- **WHEN** the `amazon` source is queried with a 13-digit ISBN beginning `978`
- **THEN** the system derives the corresponding ISBN-10 (recomputing the check digit) and uses it to locate the Amazon product page

#### Scenario: Amazon product page parsed
- **WHEN** the Amazon product page for the book is reachable and lists product details
- **THEN** the system returns a normalized result tagged `source: "amazon"` with the exposed fields and the raw cover URL

### Requirement: Cover-only image sources

The system SHALL provide two cover-only sources, `googleimages` and `kindlecovers`, each located by an image search using the book's **title and author** (not its ISBN): `googleimages` from a Google image search for the title + author book cover, and `kindlecovers` from an Amazon Kindle-store image search for the title + author. Each SHALL return a result containing only a cover URL (`cover_url`); it SHALL NOT populate title, authors, genres, or any other fielded metadata.

#### Scenario: Cover-only result shape
- **WHEN** the `googleimages` source finds a cover image for the given title and author
- **THEN** the system returns a result tagged `source: "googleimages"` whose only populated metadata is `cover_url`, with title/authors/genres empty

#### Scenario: Title and author required for image sources
- **WHEN** a cover-only source is queried without a usable title
- **THEN** the source returns no result (it cannot build a search query) and is treated as yielding nothing

### Requirement: Scrape request behavior

Scrape requests SHALL be issued with a browser-like `User-Agent` header and the existing fetch timeout. A scraper SHALL classify its outcome: a response indicating bot-blocking or unavailability (e.g. CAPTCHA interstitial, HTTP 403/429/503) or an HTML-parse failure SHALL be reported as an error; a successful response that simply contains no matching book SHALL be treated as "no result" (yielding nothing without an error).

#### Scenario: Blocked request reported as error
- **WHEN** Amazon responds with a CAPTCHA interstitial or HTTP 503 for a scrape request
- **THEN** the `amazon` source reports an error (it does not return a result and does not write a cache entry)

#### Scenario: Clean no-match yields nothing
- **WHEN** Goodreads returns a normal search page with no matching book for the ISBN
- **THEN** the `goodreads` source yields no result and reports no error
