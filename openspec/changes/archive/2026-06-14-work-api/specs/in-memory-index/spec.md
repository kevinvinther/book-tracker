## MODIFIED Requirements

### Requirement: Index provides work search
The Index SHALL provide a `searchWorks(query)` method that filters works by a query string matching against title, author names, genres, and aliases. The search SHALL be case-insensitive and match on partial substrings.

#### Scenario: Search by title substring
- **WHEN** `index.searchWorks("brothers")` is called
- **THEN** the method returns all works whose title contains "brothers" (case-insensitive)

#### Scenario: Search by author name
- **WHEN** `index.searchWorks("dostoevsky")` is called
- **THEN** the method returns all works linked to authors whose name or aliases contain "dostoevsky"

#### Scenario: Search by genre
- **WHEN** `index.searchWorks("classic")` is called
- **THEN** the method returns all works whose `genres[]` includes a genre containing "classic"

#### Scenario: Search by work alias
- **WHEN** `index.searchWorks("TBK")` is called on an index containing a work with aliases `["TBK", "Karamazov"]`
- **THEN** the method returns works whose `aliases[]` contains "TBK"

#### Scenario: Search with no matches
- **WHEN** `index.searchWorks("xxxxx")` is called with a query matching nothing
- **THEN** the method returns an empty array

#### Scenario: Empty query
- **WHEN** `index.searchWorks("")` is called with an empty string
- **THEN** the method returns all works (unfiltered)
