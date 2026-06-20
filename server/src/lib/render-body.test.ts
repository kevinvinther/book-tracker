import { describe, it, expect } from "vitest";
import {
  renderBody,
  renderWorkBody,
  renderEditionBody,
  renderCopyBody,
  renderAuthorBody,
  renderSeriesBody,
} from "./render-body.js";
import { Index } from "./index.js";
import {
  Work,
  Edition,
  Copy,
  Author,
  Series,
  Entity,
} from "./types.js";

function makeIndex(): Index {
  // Create a fresh Index that won't try to read from disk
  return new Index("/tmp/nonexistent");
}

function insert(index: Index, entity: Entity) {
  index.upsert(entity.type, entity);
}

// -- Helpers for building test entities --

function makeWork(slug: string, title: string, authors: string[]): Work {
  return {
    type: "work",
    slug,
    title,
    authors,
    created_at: "2024-01-01T00:00:00.000Z",
    _schema: 1,
  };
}

function makeAuthor(slug: string, name: string): Author {
  return {
    type: "author",
    slug,
    name,
    created_at: "2024-01-01T00:00:00.000Z",
    _schema: 1,
  };
}

function makeEdition(
  slug: string,
  workSlug: string,
  overrides: Partial<Edition> = {},
): Edition {
  return {
    type: "edition",
    slug,
    work: `[[works/${workSlug}]]`,
    created_at: "2024-01-01T00:00:00.000Z",
    _schema: 1,
    ...overrides,
  } as Edition;
}

function makeCopy(
  slug: string,
  editionSlug: string,
  workSlug: string,
  overrides: Partial<Copy> = {},
): Copy {
  return {
    type: "copy",
    slug,
    edition: `[[editions/${editionSlug}]]`,
    work: `[[works/${workSlug}]]`,
    status: "owned",
    created_at: "2024-01-01T00:00:00.000Z",
    _schema: 1,
    ...overrides,
  } as Copy;
}

function makeSeries(slug: string, name: string): Series {
  return {
    type: "series",
    slug,
    name,
    created_at: "2024-01-01T00:00:00.000Z",
    _schema: 1,
  };
}

// ============================================================
// renderWorkBody
// ============================================================

describe("renderWorkBody", () => {
  it("renders a work with all fields and editions", () => {
    const index = makeIndex();
    const author = makeAuthor("fyodor-dostoevsky", "Fyodor Dostoevsky");
    insert(index, author);

    const work: Work = {
      type: "work",
      slug: "the-brothers-karamazov",
      title: "The Brothers Karamazov",
      subtitle: "A Novel in Four Parts",
      authors: ["[[authors/fyodor-dostoevsky]]"],
      original_language: "ru",
      original_publish_year: 1880,
      description: "A passionate philosophical novel.",
      created_at: "2024-01-10T12:00:00.000Z",
      _schema: 1,
    };
    insert(index, work);

    const ed = makeEdition("katz-translation", "the-brothers-karamazov", {
      publisher: "Liveright",
      publish_date: "2019-07-15",
      page_count: 796,
      format: "paperback",
      contributors: [{ name: "Michael R. Katz", role: "translator" }],
    });
    insert(index, ed);

    const result = renderWorkBody(work, index);
    expect(result).toContain("# The Brothers Karamazov");
    expect(result).toContain("[[authors/fyodor-dostoevsky|Fyodor Dostoevsky]]");
    expect(result).toContain("Originally published 1880");
    expect(result).toContain("Russian");
    expect(result).toContain("## Description");
    expect(result).toContain("A passionate philosophical novel.");
    expect(result).toContain("## Editions");
    expect(result).toContain("[[editions/katz-translation]]");
    expect(result).toContain("Liveright, 2019");
    expect(result).toContain("translated by Michael R. Katz");
    expect(result).toContain("796 pages");
  });

  it("renders a work with no optional fields", () => {
    const index = makeIndex();
    const author = makeAuthor("tester", "Test Author");
    insert(index, author);

    const work: Work = {
      type: "work",
      slug: "simple",
      title: "Simple Book",
      authors: ["[[authors/tester]]"],
      created_at: "2024-01-01T00:00:00.000Z",
      _schema: 1,
    };
    insert(index, work);

    const result = renderWorkBody(work, index);
    expect(result).toContain("# Simple Book");
    expect(result).not.toContain("## Description");
    expect(result).not.toContain("## Editions");
  });

  it("lists edition without page_count correctly", () => {
    const index = makeIndex();
    const work = makeWork("test-work", "Test Work", []);
    insert(index, work);

    const ed = makeEdition("no-pg", "test-work", {
      publisher: "Some Publisher",
    });
    insert(index, ed);

    const result = renderWorkBody(work, index);
    expect(result).toContain("[[editions/no-pg]]");
    expect(result).toContain("Some Publisher");
    expect(result).not.toContain("pages");
  });
});

// ============================================================
// renderEditionBody
// ============================================================

describe("renderEditionBody", () => {
  it("renders edition with translator heading", () => {
    const index = makeIndex();
    const work = makeWork("karamazov", "The Brothers Karamazov", []);
    insert(index, work);

    const edition: Edition = {
      type: "edition",
      slug: "katz-translation",
      work: "[[works/karamazov]]",
      publisher: "Liveright",
      publish_date: "2019-07-15",
      page_count: 796,
      format: "paperback",
      language: "en",
      isbn: "9781631498233",
      contributors: [
        { name: "Michael R. Katz", role: "translator" },
        { name: "Susan McReynolds", role: "introduction" },
      ],
      created_at: "2024-01-10T12:05:00.000Z",
      _schema: 1,
    };
    insert(index, edition);

    const result = renderEditionBody(edition, index);
    expect(result).toContain("# The Brothers Karamazov — Michael R. Katz Translation");
    expect(result).toContain("**Publisher:** Liveright");
    expect(result).toContain("**Published:** 2019-07-15");
    expect(result).toContain("**Pages:** 796");
    expect(result).toContain("**Format:** paperback");
    expect(result).toContain("**Language:** English");
    expect(result).toContain("**ISBN:** 9781631498233");
    expect(result).toContain("**Translator:** Michael R. Katz");
    expect(result).toContain("**Introduction:** Susan McReynolds");
  });

  it("uses publisher as heading when no translator", () => {
    const index = makeIndex();
    const work = makeWork("dune", "Dune", []);
    insert(index, work);

    const edition = makeEdition("ace-2005", "dune", {
      publisher: "Ace Books",
    });
    insert(index, edition);

    const result = renderEditionBody(edition, index);
    expect(result).toContain("# Dune — Ace Books");
  });

  it("renders copies list", () => {
    const index = makeIndex();
    const work = makeWork("dune", "Dune", []);
    insert(index, work);

    const edition = makeEdition("ace-2005", "dune", { publisher: "Ace Books" });
    insert(index, edition);

    const copy1 = makeCopy("dune-pb", "ace-2005", "dune", {
      condition: "good",
      status: "owned",
    });
    const copy2 = makeCopy("dune-hc", "ace-2005", "dune", {
      condition: "worn",
      status: "lent",
    });
    insert(index, copy1);
    insert(index, copy2);

    const result = renderEditionBody(edition, index);
    expect(result).toContain("## My Copies");
    expect(result).toContain("[[copies/dune-pb]] — good, owned");
    expect(result).toContain("[[copies/dune-hc]] — worn, lent");
  });

  it("omits copies section when no copies", () => {
    const index = makeIndex();
    const work = makeWork("dune", "Dune", []);
    insert(index, work);

    const edition = makeEdition("ace-2005", "dune", {});
    insert(index, edition);

    const result = renderEditionBody(edition, index);
    expect(result).not.toContain("## My Copies");
  });
});

// ============================================================
// renderCopyBody
// ============================================================

describe("renderCopyBody", () => {
  it("renders full copy with read-throughs, loans, and notes", () => {
    const index = makeIndex();
    const author = makeAuthor("fyodor-dostoevsky", "Fyodor Dostoevsky");
    insert(index, author);

    const work: Work = {
      type: "work",
      slug: "the-brothers-karamazov",
      title: "The Brothers Karamazov",
      authors: ["[[authors/fyodor-dostoevsky]]"],
      created_at: "2024-01-01T00:00:00.000Z",
      _schema: 1,
    };
    insert(index, work);

    const edition: Edition = {
      type: "edition",
      slug: "katz-translation",
      work: "[[works/the-brothers-karamazov]]",
      publisher: "Liveright",
      publish_date: "2019-07-15",
      page_count: 796,
      contributors: [
        { name: "Michael R. Katz", role: "translator" },
      ],
      created_at: "2024-01-01T00:00:00.000Z",
      _schema: 1,
    };
    insert(index, edition);

    const copy: Copy = {
      type: "copy",
      slug: "karamazov-pb",
      edition: "[[editions/katz-translation]]",
      work: "[[works/the-brothers-karamazov]]",
      condition: "good",
      status: "owned",
      cover_image: "attachments/cover.jpg",
      acquisition_date: "2015-07-12",
      acquisition_source: "Bought in Italy",
      price_amount: 14.5,
      price_currency: "EUR",
      location: "living room shelf",
      read_throughs: [
        {
          started_date: "2024-01-10T00:00:00.000Z",
          finished_date: "2024-03-02T00:00:00.000Z",
          status: "finished",
          rating: 9.0,
          page_log: [
            { date: "2024-01-10T00:00:00.000Z", page: 0 },
            { date: "2024-01-15T00:00:00.000Z", page: 147 },
            { date: "2024-03-02T00:00:00.000Z", page: 796 },
          ],
        },
      ],
      loans: [
        {
          borrower_name: "Sarah",
          lent_date: "2024-05-10",
          expected_return_date: "2024-07-01",
        },
      ],
      created_at: "2024-01-01T00:00:00.000Z",
      _schema: 1,
    };
    insert(index, copy);

    const note: Entity = {
      type: "note",
      slug: "2024-01-15-143000",
      date: "2024-01-15T14:30:00.000Z",
      modified: "2024-01-15T14:30:00.000Z",
      copy: "[[copies/karamazov-pb]]",
      _schema: 1,
    };
    insert(index, note);

    const result = renderCopyBody(copy, index);

    // Heading
    expect(result).toContain("# The Brothers Karamazov — Michael R. Katz Translation");

    // Metadata block
    expect(result).toContain("**Edition:**");
    expect(result).toContain("[[editions/katz-translation|katz-translation]]");
    expect(result).toContain("Liveright, 2019");
    expect(result).toContain("**Author:**");
    expect(result).toContain("[[authors/fyodor-dostoevsky|Fyodor Dostoevsky]]");
    expect(result).toContain("**Translator:** Michael R. Katz");
    expect(result).toContain("**Condition:** good");
    expect(result).toContain("**Status:** owned");
    expect(result).toContain("**Cover:** ![cover](attachments/cover.jpg)");
    expect(result).toContain("**Acquired:** 2015-07-12 — Bought in Italy");
    expect(result).toContain("**Location:** living room shelf");
    expect(result).toContain("**Price:** 14.5 EUR");

    // Reading History
    expect(result).toContain("## Reading History");
    expect(result).toContain("### Read-through 1");
    expect(result).toContain("Finished");
    expect(result).toContain("★ 9.0/10");
    expect(result).toContain("| Date | Page | % |");
    expect(result).toContain("| 2024-03-02 | 796 | 100% |");
    expect(result).toContain("| 2024-01-15 | 147 | 18% |");
    expect(result).toContain("| 2024-01-10 | 0 | 0% |");

    // Loan History
    expect(result).toContain("## Loan History");
    expect(result).toContain("| Borrower | Lent | Expected | Returned |");
    expect(result).toContain("| Sarah | 2024-05-10 | 2024-07-01 | — |");

    // Notes
    expect(result).toContain("## Notes");
    expect(result).toContain("[[notes/2024-01-15-143000]]");
  });

  it("handles DNF read-through without rating", () => {
    const index = makeIndex();
    const work = makeWork("test", "Test Book", []);
    insert(index, work);

    const edition = makeEdition("test-ed", "test", { page_count: 500 });
    insert(index, edition);

    const copy: Copy = {
      type: "copy",
      slug: "test-copy",
      edition: "[[editions/test-ed]]",
      work: "[[works/test]]",
      status: "owned",
      read_throughs: [
        {
          started_date: "2024-06-01T00:00:00.000Z",
          finished_date: "2024-06-15T00:00:00.000Z",
          status: "dnf",
          page_log: [
            { date: "2024-06-01T00:00:00.000Z", page: 0 },
            { date: "2024-06-10T00:00:00.000Z", page: 50 },
          ],
        },
      ],
      created_at: "2024-01-01T00:00:00.000Z",
      _schema: 1,
    };
    insert(index, copy);

    const result = renderCopyBody(copy, index);
    expect(result).toContain("DNF");
    expect(result).not.toContain("★");
  });

  it("shows — for % when no page_count", () => {
    const index = makeIndex();
    const work = makeWork("test", "Test Book", []);
    insert(index, work);

    const edition = makeEdition("test-ed", "test", {});
    insert(index, edition);

    const copy: Copy = {
      type: "copy",
      slug: "test-copy",
      edition: "[[editions/test-ed]]",
      work: "[[works/test]]",
      status: "owned",
      read_throughs: [
        {
          started_date: "2024-01-01T00:00:00.000Z",
          status: "reading",
          page_log: [
            { date: "2024-01-05T00:00:00.000Z", page: 104 },
          ],
        },
      ],
      created_at: "2024-01-01T00:00:00.000Z",
      _schema: 1,
    };
    insert(index, copy);

    const result = renderCopyBody(copy, index);
    expect(result).toContain("| 2024-01-05 | 104 | — |");
  });

  it("omits sections when no data", () => {
    const index = makeIndex();
    const work = makeWork("test", "Test Book", []);
    insert(index, work);

    const edition = makeEdition("test-ed", "test", {});
    insert(index, edition);

    const copy = makeCopy("test-copy", "test-ed", "test");
    insert(index, copy);

    const result = renderCopyBody(copy, index);
    expect(result).not.toContain("## Reading History");
    expect(result).not.toContain("## Loan History");
    expect(result).not.toContain("## Notes");
  });

  it("heading priority: format over page_count, page_count over bare", () => {
    const index = makeIndex();
    const work = makeWork("test", "Test Book", []);
    insert(index, work);

    // Edition with format only
    const edFormat = makeEdition("ed-fmt", "test", { format: "paperback" });
    insert(index, edFormat);
    const cpFmt = makeCopy("cp-fmt", "ed-fmt", "test");
    insert(index, cpFmt);
    const resultFmt = renderCopyBody(cpFmt, index);
    expect(resultFmt).toContain("# Test Book — paperback");

    // Edition with page_count only
    const edPages = makeEdition("ed-pg", "test", { page_count: 300 });
    insert(index, edPages);
    const cpPages = makeCopy("cp-pg", "ed-pg", "test");
    insert(index, cpPages);
    const resultPages = renderCopyBody(cpPages, index);

    expect(resultPages).toContain("# Test Book — 300 pages");

    // Edition with nothing
    const edBare = makeEdition("ed-bare", "test", {});
    insert(index, edBare);
    const cpBare = makeCopy("cp-bare", "ed-bare", "test");
    insert(index, cpBare);
    const resultBare = renderCopyBody(cpBare, index);
    expect(resultBare).toContain("# Test Book");
  });
});

// ============================================================
// renderAuthorBody
// ============================================================

describe("renderAuthorBody", () => {
  it("renders author with works", () => {
    const index = makeIndex();
    const author = makeAuthor("fyodor-dostoevsky", "Fyodor Dostoevsky");
    insert(index, author);

    const work1: Work = {
      type: "work",
      slug: "karamazov",
      title: "The Brothers Karamazov",
      authors: ["[[authors/fyodor-dostoevsky]]"],
      created_at: "2024-01-01T00:00:00.000Z",
      _schema: 1,
    };
    const work2: Work = {
      type: "work",
      slug: "crime-and-punishment",
      title: "Crime and Punishment",
      authors: ["[[authors/fyodor-dostoevsky]]"],
      created_at: "2024-01-01T00:00:00.000Z",
      _schema: 1,
    };
    insert(index, work1);
    insert(index, work2);

    const result = renderAuthorBody(author, index);
    expect(result).toContain("# Fyodor Dostoevsky");
    expect(result).toContain("## My Works");
    expect(result).toContain("[[works/karamazov]]");
    expect(result).toContain("[[works/crime-and-punishment]]");
  });

  it("renders author with no works", () => {
    const index = makeIndex();
    const author = makeAuthor("empty-author", "Empty Author");
    insert(index, author);

    const result = renderAuthorBody(author, index);
    expect(result).toContain("# Empty Author");
    expect(result).not.toContain("## My Works");
  });
});

// ============================================================
// renderSeriesBody
// ============================================================

describe("renderSeriesBody", () => {
  it("renders series with positioned works", () => {
    const index = makeIndex();
    const series = makeSeries("dune-chronicles", "Dune Chronicles");
    insert(index, series);

    const work1: Work = {
      type: "work",
      slug: "dune",
      title: "Dune",
      authors: [],
      series: "[[series/dune-chronicles]]",
      series_position: 1,
      created_at: "2024-01-01T00:00:00.000Z",
      _schema: 1,
    };
    const work2: Work = {
      type: "work",
      slug: "dune-messiah",
      title: "Dune Messiah",
      authors: [],
      series: "[[series/dune-chronicles]]",
      series_position: 2,
      created_at: "2024-01-01T00:00:00.000Z",
      _schema: 1,
    };
    insert(index, work1);
    insert(index, work2);

    const result = renderSeriesBody(series, index);
    expect(result).toContain("# Dune Chronicles");
    expect(result).toContain("## Books in Series");
    expect(result).toContain("1. [[works/dune]]");
    expect(result).toContain("2. [[works/dune-messiah]]");
  });

  it("sorts unpositioned works last", () => {
    const index = makeIndex();
    const series = makeSeries("test-series", "Test Series");
    insert(index, series);

    const work1: Work = {
      type: "work",
      slug: "positioned",
      title: "Positioned",
      authors: [],
      series: "[[series/test-series]]",
      series_position: 1,
      created_at: "2024-01-01T00:00:00.000Z",
      _schema: 1,
    };
    const work2: Work = {
      type: "work",
      slug: "unpositioned",
      title: "Unpositioned",
      authors: [],
      series: "[[series/test-series]]",
      created_at: "2024-01-01T00:00:00.000Z",
      _schema: 1,
    };
    insert(index, work1);
    insert(index, work2);

    const result = renderSeriesBody(series, index);
    const posIdx = result.indexOf("[[works/positioned]]");
    const unposIdx = result.indexOf("[[works/unpositioned]]");
    expect(posIdx).toBeLessThan(unposIdx);
  });

  it("renders empty series", () => {
    const index = makeIndex();
    const series = makeSeries("empty-series", "Empty Series");
    insert(index, series);

    const result = renderSeriesBody(series, index);
    expect(result).toContain("# Empty Series");
    expect(result).not.toContain("## Books in Series");
  });
});

// ============================================================
// renderBody dispatcher
// ============================================================

describe("renderBody dispatcher", () => {
  it("dispatches to correct renderer per entity type", () => {
    const index = makeIndex();
    const author = makeAuthor("test-author", "Test Author");
    insert(index, author);

    const work: Work = {
      type: "work",
      slug: "test-work",
      title: "Test Work",
      authors: ["[[authors/test-author]]"],
      created_at: "2024-01-01T00:00:00.000Z",
      _schema: 1,
    };
    insert(index, work);

    const series = makeSeries("test-series", "Test Series");
    insert(index, series);

    expect(renderBody(author, index)).toContain("# Test Author");
    expect(renderBody(work, index)).toContain("# Test Work");
    expect(renderBody(series, index)).toContain("# Test Series");
  });

  it("throws on unknown entity type", () => {
    const index = makeIndex();
    const note: Entity = {
      type: "note",
      slug: "test-note",
      date: "2024-01-01T00:00:00.000Z",
      modified: "2024-01-01T00:00:00.000Z",
      _schema: 1,
    };
    expect(() => renderBody(note, index)).toThrow(
      "Unknown entity type for body rendering: note",
    );
  });
});
