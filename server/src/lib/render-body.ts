import { Index } from "./index.js";
import {
  Author,
  Edition,
  Work,
  Copy,
  Series,
  Entity,
  Note,
  ReadThrough,
  PageLog,
  Loan,
} from "./types.js";

function extractSlug(wikilink: string, prefix: string): string | null {
  const match = wikilink.match(
    new RegExp(`^\\[\\[${prefix}/(.+)\\]\\]$`),
  );
  return match ? match[1] : null;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) {
    const parts = isoString.slice(0, 10).split("-");
    if (parts.length === 3) {
      const monthIdx = parseInt(parts[1], 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${MONTHS[monthIdx]} ${parseInt(parts[2], 10)}, ${parts[0]}`;
      }
    }
    return isoString.slice(0, 10);
  }
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function toDateOnly(isoString: string): string {
  return isoString.slice(0, 10);
}

function resolveWorkTitle(workWikilink: string, index: Index): string {
  const slug = extractSlug(workWikilink, "works");
  if (!slug) return "Unknown Work";
  const work = index.getWork(slug);
  return work?.title ?? "Unknown Work";
}

function editionDisplayLabel(edition: Edition): string {
  const translators = edition.contributors?.filter(
    (c) => c.role === "translator",
  );
  if (translators && translators.length > 0) {
    return `${translators[0].name} Translation`;
  }

  if (edition.publisher) {
    return edition.publisher;
  }

  if (edition.format) {
    return edition.format;
  }

  if (edition.page_count != null) {
    return `${edition.page_count} pages`;
  }

  return edition.slug;
}

function headingSuffix(
  workWikilink: string,
  edition: Edition,
  index: Index,
): string {
  const workTitle = resolveWorkTitle(workWikilink, index);
  const label = editionDisplayLabel(edition);
  if (label === edition.slug) return workTitle;
  return `${workTitle} — ${label}`;
}

function renderReadThroughs(
  readThroughs: ReadThrough[],
  pageCount: number | undefined,
): string {
  if (!readThroughs || readThroughs.length === 0) return "";

  const sorted = [...readThroughs].reverse();

  let out = "";
  let n = sorted.length;
  for (let i = 0; i < sorted.length; i++) {
    const rt = sorted[i];
    const num = n - i;
    const heading = readThroughHeading(rt, num);

    out += heading;
    out += renderPageLogTable(rt.page_log, pageCount);
  }

  return `## Reading History\n\n${out}`;
}

function readThroughHeading(rt: ReadThrough, num: number): string {
  const start = formatDate(rt.started_date);

  if (rt.status === "finished" && rt.finished_date) {
    const end = formatDate(rt.finished_date);
    let head = `### Read-through ${num} · ${start} – ${end} · Finished`;
    if (rt.rating != null) {
      head += ` · ★ ${rt.rating.toFixed(1)}/10`;
    }
    return head + "\n\n";
  }

  if (rt.status === "dnf" && rt.finished_date) {
    const end = formatDate(rt.finished_date);
    return `### Read-through ${num} · ${start} – ${end} · DNF\n\n`;
  }

  if (rt.status === "paused") {
    return `### Read-through ${num} · Started ${start} · Paused\n\n`;
  }

  return `### Read-through ${num} · Started ${start} · Reading\n\n`;
}

function renderPageLogTable(
  pageLog: PageLog[],
  pageCount: number | undefined,
): string {
  if (!pageLog || pageLog.length === 0) return "";

  const sorted = [...pageLog].sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    return b.page - a.page;
  });

  let table = "| Date | Page | % |\n";
  table += "|------|------|---|\n";
  for (const entry of sorted) {
    const pct =
      pageCount != null && pageCount > 0
        ? `${Math.round((entry.page / pageCount) * 100)}%`
        : "—";
    table += `| ${toDateOnly(entry.date)} | ${entry.page} | ${pct} |\n`;
  }

  return table + "\n";
}

function renderLoanHistory(loans: Loan[]): string {
  if (!loans || loans.length === 0) return "";

  let table = "| Borrower | Lent | Expected | Returned |\n";
  table += "|----------|------|----------|----------|\n";
  for (const loan of loans) {
    const returned = loan.returned_date
      ? toDateOnly(loan.returned_date)
      : "—";
    const expected = loan.expected_return_date
      ? toDateOnly(loan.expected_return_date)
      : "—";
    table += `| ${loan.borrower_name} | ${toDateOnly(loan.lent_date)} | ${expected} | ${returned} |\n`;
  }
  return table + "\n";
}

function renderNotesList(copySlug: string, index: Index): string {
  const notes = index.getNotesByCopy(copySlug);
  if (notes.length === 0) return "";

  let list = "";
  const sorted = [...notes].sort(
    (a, b) => b.date.localeCompare(a.date),
  );
  for (const note of sorted) {
    list += `- [[notes/${note.slug}]]\n`;
  }
  return list;
}

function renderEditionNotesList(
  editionSlug: string,
  index: Index,
): string {
  const wikilink = `[[editions/${editionSlug}]]`;
  const notes = index.getAllNotes().filter((n) => n.edition === wikilink);
  if (notes.length === 0) return "";

  let list = "";
  const sorted = [...notes].sort(
    (a, b) => b.date.localeCompare(a.date),
  );
  for (const note of sorted) {
    list += `- [[notes/${note.slug}]]\n`;
  }
  return list;
}

export function renderWorkBody(work: Work, index: Index): string {
  let body = `# ${work.title}\n\n`;

  if (work.subtitle) {
    body += `*${work.subtitle}*\n\n`;
  }

  const authorLinks: string[] = [];
  if (work.authors && work.authors.length > 0) {
    for (const wikilink of work.authors) {
      const slug = extractSlug(wikilink, "authors");
      const author = slug ? index.getAuthor(slug) : undefined;
      if (author) {
        authorLinks.push(
          `[[authors/${author.slug}|${author.name}]]`,
        );
      }
    }
  }

  const metaParts: string[] = [];
  if (authorLinks.length > 0) {
    metaParts.push(`**${authorLinks.join(", ")}**`);
  }
  if (work.original_publish_year != null) {
    metaParts.push(`Originally published ${work.original_publish_year}`);
  }
  if (work.original_language) {
    const langUpper = work.original_language.toUpperCase();
    const langMap: Record<string, string> = {
      EN: "English",
      RU: "Russian",
      FR: "French",
      DE: "German",
      ES: "Spanish",
      IT: "Italian",
      JA: "Japanese",
      ZH: "Chinese",
      PT: "Portuguese",
      AR: "Arabic",
    };
    metaParts.push(langMap[langUpper] ?? langUpper);
  }
  if (metaParts.length > 0) {
    body += metaParts.join(" · ") + "\n\n";
  }

  if (work.description) {
    body += `## Description\n\n${work.description}\n\n`;
  }

  const editions = index.getEditionsByWork(work.slug);
  if (editions.length > 0) {
    body += "## Editions\n\n";
    for (const edition of editions) {
      const parts: string[] = [];
      if (edition.publisher) parts.push(edition.publisher);
      if (edition.publish_date) {
        const year = edition.publish_date.slice(0, 4);
        parts.push(year);
      }
      const translator = edition.contributors?.find(
        (c) => c.role === "translator",
      );
      if (translator) {
        parts.push(`translated by ${translator.name}`);
      }
      if (edition.page_count != null) {
        parts.push(`${edition.page_count} pages`);
      }
      const detail = parts.length > 0 ? ` — ${parts.join(", ")}` : "";
      body += `- [[editions/${edition.slug}]]${detail}\n`;
    }
    body += "\n";
  }

  return body;
}

export function renderEditionBody(
  edition: Edition,
  index: Index,
): string {
  const workWikilink = edition.work || "";
  const heading = headingSuffix(workWikilink, edition, index);
  let body = `# ${heading}\n\n`;

  const metaLines: string[] = [];
  if (edition.publisher) {
    metaLines.push(`**Publisher:** ${edition.publisher}`);
  }
  if (edition.publish_date) {
    metaLines.push(
      `**Published:** ${toDateOnly(edition.publish_date)}`,
    );
  }
  if (metaLines.length > 0) {
    body += metaLines.join(" · ") + "  \n";
  }

  const detailLines: string[] = [];
  if (edition.page_count != null) {
    detailLines.push(`**Pages:** ${edition.page_count}`);
  }
  if (edition.format) {
    detailLines.push(`**Format:** ${edition.format}`);
  }
  if (edition.language) {
    const langUpper = edition.language.toUpperCase();
    const langMap: Record<string, string> = {
      EN: "English",
      RU: "Russian",
      FR: "French",
      DE: "German",
      ES: "Spanish",
      IT: "Italian",
      JA: "Japanese",
      ZH: "Chinese",
      PT: "Portuguese",
      AR: "Arabic",
    };
    detailLines.push(`**Language:** ${langMap[langUpper] ?? langUpper}`);
  }
  if (detailLines.length > 0) {
    body += detailLines.join(" · ") + "  \n";
  }

  if (edition.isbn) {
    body += `**ISBN:** ${edition.isbn}  \n`;
  }

  if (edition.contributors && edition.contributors.length > 0) {
    for (const c of edition.contributors) {
      const label =
        c.role.charAt(0).toUpperCase() + c.role.slice(1);
      body += `**${label}:** ${c.name}  \n`;
    }
  }

  const copies = index.getCopiesByEdition(edition.slug);
  if (copies.length > 0) {
    body += "\n";
    body += "## My Copies\n\n";
    for (const copy of copies) {
      const parts: string[] = [];
      if (copy.condition) parts.push(copy.condition);
      if (copy.status) parts.push(copy.status);
      const detail =
        parts.length > 0 ? ` — ${parts.join(", ")}` : "";
      body += `- [[copies/${copy.slug}]]${detail}\n`;
    }
    body += "\n";
  }

  const editionNotes = renderEditionNotesList(edition.slug, index);
  if (editionNotes) {
    body += "\n## Notes\n\n" + editionNotes + "\n";
  }

  return body;
}

export function renderCopyBody(copy: Copy, index: Index): string {
  const workWikilink = copy.work || "";
  const edition = index.getEdition(
    extractSlug(copy.edition, "editions") ?? "",
  );
  const heading = edition
    ? headingSuffix(workWikilink, edition, index)
    : resolveWorkTitle(workWikilink, index);
  let body = `# ${heading}\n\n`;

  const metaLines: string[] = [];

  if (edition) {
    const editionParts: string[] = [];
    if (edition.publisher) editionParts.push(edition.publisher);
    if (edition.publish_date) {
      editionParts.push(edition.publish_date.slice(0, 4));
    }
    if (edition.page_count != null) {
      editionParts.push(`${edition.page_count} pages`);
    }
    const detail =
      editionParts.length > 0
        ? ` · ${editionParts.join(", ")}`
        : "";
    metaLines.push(
      `**Edition:** [[editions/${edition.slug}|${editionDisplayLabel(edition)}]]${detail}`,
    );
  }

  const workSlug = extractSlug(copy.work, "works");
  const work = workSlug ? index.getWork(workSlug) : undefined;
  if (work) {
    const authorLinks: string[] = [];
    for (const wikilink of work.authors || []) {
      const aSlug = extractSlug(wikilink, "authors");
      const author = aSlug ? index.getAuthor(aSlug) : undefined;
      if (author) {
        authorLinks.push(
          `[[authors/${author.slug}|${author.name}]]`,
        );
      }
    }
    if (authorLinks.length > 0) {
      metaLines.push(`**Author:** ${authorLinks.join(", ")}`);
    }
  }

  const translator = edition?.contributors?.find(
    (c) => c.role === "translator",
  );
  if (translator) {
    metaLines.push(`**Translator:** ${translator.name}`);
  }

  const statusLine: string[] = [];
  if (copy.condition) statusLine.push(`**Condition:** ${copy.condition}`);
  statusLine.push(`**Status:** ${copy.status}`);
  metaLines.push(statusLine.join(" · "));

  if (copy.cover_image) {
    metaLines.push(
      `**Cover:** ![cover](${copy.cover_image})`,
    );
  }

  if (copy.acquisition_date) {
    const src = copy.acquisition_source
      ? ` — ${copy.acquisition_source}`
      : "";
    metaLines.push(
      `**Acquired:** ${toDateOnly(copy.acquisition_date)}${src}`,
    );
  }

  const locPrice: string[] = [];
  if (copy.location) {
    locPrice.push(`**Location:** ${copy.location}`);
  }
  if (
    copy.price_amount != null &&
    copy.price_currency
  ) {
    locPrice.push(
      `**Price:** ${copy.price_amount} ${copy.price_currency}`,
    );
  }
  if (locPrice.length > 0) {
    metaLines.push(locPrice.join(" · "));
  }

  body += metaLines.join("  \n") + "\n\n";

  if (copy.read_throughs && copy.read_throughs.length > 0) {
    const pageCount = edition?.page_count;
    body += renderReadThroughs(copy.read_throughs, pageCount);
  }

  if (copy.loans && copy.loans.length > 0) {
    body += "## Loan History\n\n";
    body += renderLoanHistory(copy.loans);
  }

  const notesSection = renderNotesList(copy.slug, index);
  if (notesSection) {
    body += "\n## Notes\n\n" + notesSection + "\n";
  }

  return body;
}

export function renderAuthorBody(
  author: Author,
  index: Index,
): string {
  let body = `# ${author.name}\n\n`;

  const works = index.getWorksByAuthor(author.slug);
  if (works.length > 0) {
    body += "## My Works\n\n";
    for (const work of works) {
      body += `- [[works/${work.slug}]]\n`;
    }
    body += "\n";
  }

  return body;
}

export function renderSeriesBody(
  series: Series,
  index: Index,
): string {
  let body = `# ${series.name}\n\n`;

  const works = index.getWorksBySeries(series.slug);

  if (works.length > 0 || (series.total_works != null && series.total_works > 0)) {
    body += "## Books in Series\n\n";

    if (works.length > 0) {
      const sorted = [...works].sort((a, b) => {
        const posA = a.series_position;
        const posB = b.series_position;
        if (posA != null && posB != null) return posA - posB;
        if (posA != null) return -1;
        if (posB != null) return 1;
        return 0;
      });

      let i = 1;
      for (const work of sorted) {
        body += `${i}. [[works/${work.slug}]]\n`;
        i++;
      }
    }

    if (series.total_works != null && series.total_works > works.length) {
      for (let i = works.length + 1; i <= series.total_works; i++) {
        body += `${i}. — (not in library)\n`;
      }
    }

    body += "\n";
  }

  return body;
}

export function renderBody(entity: Entity, index: Index): string {
  switch (entity.type) {
    case "work":
      return renderWorkBody(entity as Work, index);
    case "edition":
      return renderEditionBody(entity as Edition, index);
    case "copy":
      return renderCopyBody(entity as Copy, index);
    case "author":
      return renderAuthorBody(entity as Author, index);
    case "series":
      return renderSeriesBody(entity as Series, index);
    default:
      throw new Error(
        `Unknown entity type for body rendering: ${(entity as Entity).type}`,
      );
  }
}
