#!/bin/bash
set -euo pipefail

LIB="${BOOKTRACKER_LIBRARY_PATH:-$HOME/book-tracker-data}"
echo "Seeding test data into: $LIB"

# Clean existing .md files but preserve directories
for dir in authors series works editions copies notes; do
  mkdir -p "$LIB/$dir"
  rm -f "$LIB/$dir"/*.md
done
mkdir -p "$LIB/attachments"

NOW=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

# ── Authors ────────────────────────────────────────────────────

cat > "$LIB/authors/frank-herbert.md" << END
---
type: author
slug: frank-herbert
name: Frank Herbert
aliases:
  - Frank P. Herbert
  - Herbert
created_at: "$NOW"
_schema: 1
---
END

cat > "$LIB/authors/donna-tartt.md" << END
---
type: author
slug: donna-tartt
name: Donna Tartt
aliases:
  - Tartt
created_at: "$NOW"
_schema: 1
---
END

# ── Series ─────────────────────────────────────────────────────

cat > "$LIB/series/the-dark-tower.md" << END
---
type: series
slug: the-dark-tower
name: The Dark Tower
total_works: 3
aliases:
  - Dark Tower Series
created_at: "$NOW"
_schema: 1
---
END

# ── Works ──────────────────────────────────────────────────────

cat > "$LIB/works/dune.md" << END
---
type: work
slug: dune
title: Dune
subtitle: Book One of the Dune Chronicles
authors:
  - '[[authors/frank-herbert]]'
original_language: en
original_publish_year: 1965
genres:
  - science-fiction
  - classic
description: >-
  Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides,
  heir to a noble family tasked with ruling an inhospitable world where the only
  thing of value is the "spice" melange.
aliases:
  - Dune (1965)
created_at: "$NOW"
_schema: 1
---
END

cat > "$LIB/works/the-goldfinch.md" << END
---
type: work
slug: the-goldfinch
title: The Goldfinch
subtitle: A Novel
authors:
  - '[[authors/donna-tartt]]'
original_language: en
original_publish_year: 2013
genres:
  - fiction
  - literary-fiction
description: >-
  A young boy in New York City is taken in by a wealthy Upper East Side family
  after he is orphaned in a museum explosion that kills his mother. The painting
  of a goldfinch becomes his tether to hope.
aliases:
  - Goldfinch
created_at: "$NOW"
_schema: 1
---
END

cat > "$LIB/works/the-gunslinger.md" << END
---
type: work
slug: the-gunslinger
title: The Gunslinger
subtitle: The Dark Tower I
authors:
  - '[[authors/frank-herbert]]'
series: '[[series/the-dark-tower]]'
series_position: 1
original_language: en
original_publish_year: 1982
genres:
  - fantasy
  - western
description: >-
  Roland Deschain, the last Gunslinger, pursues the Man in Black across a
  desolate, apocalyptic landscape.
created_at: "$NOW"
_schema: 1
---
END

cat > "$LIB/works/the-waste-lands.md" << END
---
type: work
slug: the-waste-lands
title: The Waste Lands
subtitle: The Dark Tower III
authors:
  - '[[authors/frank-herbert]]'
series: '[[series/the-dark-tower]]'
series_position: 3
original_language: en
original_publish_year: 1991
genres:
  - fantasy
  - western
description: >-
  Roland and his ka-tet journey toward the Dark Tower through a world that has
  moved on.
created_at: "$NOW"
_schema: 1
---
END

# ── Editions ───────────────────────────────────────────────────

cat > "$LIB/editions/dune-ace-2005.md" << END
---
type: edition
slug: dune-ace-2005
work: '[[works/dune]]'
isbn: '978-0441013593'
publisher: Ace Books
publish_date: '2005-08-02'
page_count: 704
format: paperback
language: en
aliases:
  - Ace Dune Paperback
created_at: "$NOW"
_schema: 1
---
END

cat > "$LIB/editions/the-goldfinch-little-brown.md" << END
---
type: edition
slug: the-goldfinch-little-brown
work: '[[works/the-goldfinch]]'
isbn: '978-0316055444'
publisher: Little, Brown and Company
publish_date: '2013-09-23'
page_count: 771
format: hardcover
language: en
contributors:
  - name: Carel Fabritius
    role: illustrator
aliases:
  - Goldfinch HC
created_at: "$NOW"
_schema: 1
---
END

cat > "$LIB/editions/the-goldfinch-dutch.md" << END
---
type: edition
slug: the-goldfinch-dutch
work: '[[works/the-goldfinch]]'
isbn: '978-9023489733'
publisher: De Bezige Bij
publish_date: '2014-06-15'
page_count: 928
format: paperback
language: nl
contributors:
  - name: Paul Bruijn
    role: translator
created_at: "$NOW"
_schema: 1
---
END

cat > "$LIB/editions/the-gunslinger-grant.md" << END
---
type: edition
slug: the-gunslinger-grant
work: '[[works/the-gunslinger]]'
publisher: Donald M. Grant
publish_date: '1982-06-10'
page_count: 224
format: hardcover
language: en
created_at: "$NOW"
_schema: 1
---
END

cat > "$LIB/editions/the-waste-lands-grant.md" << END
---
type: edition
slug: the-waste-lands-grant
work: '[[works/the-waste-lands]]'
publisher: Donald M. Grant
publish_date: '1991-08-01'
page_count: 512
format: hardcover
language: en
created_at: "$NOW"
_schema: 1
---
END

# ── Copies ─────────────────────────────────────────────────────

cat > "$LIB/copies/dune-ace-2005.md" << END
---
type: copy
slug: dune-ace-2005
edition: '[[editions/dune-ace-2005]]'
work: '[[works/dune]]'
condition: like new
status: owned
acquisition_date: '2024-01-15'
acquisition_source: bought at Powell's Books, Portland
price_amount: 10.99
price_currency: USD
location: living room shelf
aliases:
  - My Dune
  - Dune PB
read_throughs:
  - started_date: '2024-02-01T00:00:00.000Z'
    finished_date: '2024-03-15T00:00:00.000Z'
    status: finished
    rating: 9.5
    page_log:
      - date: '2024-02-01T00:00:00.000Z'
        page: 0
      - date: '2024-02-10T00:00:00.000Z'
        page: 150
      - date: '2024-02-28T00:00:00.000Z'
        page: 400
      - date: '2024-03-15T00:00:00.000Z'
        page: 704
  - started_date: '2025-06-01T00:00:00.000Z'
    status: reading
    page_log:
      - date: '2025-06-01T00:00:00.000Z'
        page: 0
      - date: '2025-06-18T00:00:00.000Z'
        page: 120
loans:
  - borrower_name: Sarah
    lent_date: '2024-08-01'
    expected_return_date: '2024-09-01'
    returned_date: '2024-08-25'
  - borrower_name: Mike
    lent_date: '2025-12-01'
    expected_return_date: '2026-01-01'
created_at: "$NOW"
_schema: 1
---
END

cat > "$LIB/copies/the-goldfinch-little-brown.md" << END
---
type: copy
slug: the-goldfinch-little-brown
edition: '[[editions/the-goldfinch-little-brown]]'
work: '[[works/the-goldfinch]]'
condition: good
status: owned
acquisition_date: '2023-06-01'
acquisition_source: gift from Mom
location: bedroom nightstand
read_throughs:
  - started_date: '2023-06-15T00:00:00.000Z'
    status: paused
    page_log:
      - date: '2023-06-15T00:00:00.000Z'
        page: 0
      - date: '2023-07-01T00:00:00.000Z'
        page: 85
      - date: '2023-08-01T00:00:00.000Z'
        page: 200
created_at: "$NOW"
_schema: 1
---
END

cat > "$LIB/copies/the-goldfinch-dutch.md" << END
---
type: copy
slug: the-goldfinch-dutch
edition: '[[editions/the-goldfinch-dutch]]'
work: '[[works/the-goldfinch]]'
condition: new
status: lent
acquisition_date: '2025-01-10'
acquisition_source: Amazon Netherlands
price_amount: 19.99
price_currency: EUR
aliases:
  - Het Puttertje
loans:
  - borrower_name: Anna
    lent_date: '2025-02-01'
    expected_return_date: '2025-04-01'
created_at: "$NOW"
_schema: 1
---
END

cat > "$LIB/copies/the-gunslinger-grant.md" << END
---
type: copy
slug: the-gunslinger-grant
edition: '[[editions/the-gunslinger-grant]]'
work: '[[works/the-gunslinger]]'
condition: worn
status: owned
acquisition_date: '2022-03-10'
acquisition_source: found at a garage sale
location: office bookshelf
created_at: "$NOW"
_schema: 1
---
END

cat > "$LIB/copies/the-waste-lands-grant.md" << END
---
type: copy
slug: the-waste-lands-grant
edition: '[[editions/the-waste-lands-grant]]'
work: '[[works/the-waste-lands]]'
condition: good
status: owned
acquisition_date: '2022-06-01'
acquisition_source: bought from eBay
location: office bookshelf
created_at: "$NOW"
_schema: 1
---
END

# ── Notes ──────────────────────────────────────────────────────

cat > "$LIB/notes/2024-02-15-143000.md" << END
---
type: note
slug: '2024-02-15-143000'
date: '2024-02-15T14:30:00.000Z'
modified: '2024-02-15T14:30:00.000Z'
copy: '[[copies/dune-ace-2005]]'
edition: '[[editions/dune-ace-2005]]'
work: '[[works/dune]]'
read_through: '2024-02-01'
context_page: 150
tags:
  - reflection
  - dune
_schema: 1
---

The worldbuilding in Dune is incredible. The attention to ecological detail — the water discipline, the stillsuits, the spice cycle — makes Arrakis feel like a real place. Herbert was way ahead of his time.

I'm noticing how the Fremen culture mirrors real desert peoples but without being reductive. The reverence for water is portrayed as a rational adaptation, not superstition.
END

cat > "$LIB/notes/2024-03-02-091500.md" << END
---
type: note
slug: '2024-03-02-091500'
date: '2024-03-02T09:15:00.000Z'
modified: '2024-03-02T09:15:00.000Z'
copy: '[[copies/dune-ace-2005]]'
edition: '[[editions/dune-ace-2005]]'
work: '[[works/dune]]'
read_through: '2024-02-01'
context_page: 400
tags:
  - analysis
  - dune
_schema: 1
---

About halfway through now. The Paul Atreides arc is shifting from reluctant heir to something more messianic. I'm uneasy about the white savior overtones, but I've read that Herbert intended this as a critique. Let's see how it plays out.

The dinner party scene was masterful — every line of dialogue advancing the political tension.
END

cat > "$LIB/notes/2024-03-16-200000.md" << END
---
type: note
slug: '2024-03-16-200000'
date: '2024-03-16T20:00:00.000Z'
modified: '2024-03-16T20:00:00.000Z'
copy: '[[copies/dune-ace-2005]]'
edition: '[[editions/dune-ace-2005]]'
work: '[[works/dune]]'
tags:
  - review
  - dune
  - finished
_schema: 1
---

Finished. 9.5/10.

This is one of those books where every reread reveals new layers. The political intrigue, the ecology, the mysticism — it all holds together in a way that very few novels manage.

I can see why some readers bounce off the dense prose and the glossary, but for me the immersion is the point. The appendix at the end made me want to immediately start Dune Messiah.
END

cat > "$LIB/notes/2023-07-02-103000.md" << END
---
type: note
slug: '2023-07-02-103000'
date: '2023-07-02T10:30:00.000Z'
modified: '2023-07-02T10:30:00.000Z'
copy: '[[copies/the-goldfinch-little-brown]]'
edition: '[[editions/the-goldfinch-little-brown]]'
work: '[[works/the-goldfinch]]'
read_through: '2023-06-15'
context_page: 85
tags:
  - reflection
  - goldfinch
_schema: 1
---

The prose in this is something else. Tartt writes sentences you want to read twice. The explosion scene at the Met was terrifying and beautiful at the same time.

I'm starting to feel the weight of Theo's grief. It's not melodramatic — it feels earned. The way ordinary objects become charged with meaning after loss... that resonates.
END

echo "Done! Seeded 2 authors, 1 series, 4 works, 5 editions, 5 copies, 4 notes into $LIB"
