import { readFile, listFiles, resolveLibraryPath } from "./io.js";
import { Author, Series, Work, Edition, Copy, Note, Entity, EntityType, SearchResult, SearchResults } from "./types.js";

const LIBRARY_DIRECTORIES: { dir: string; type: EntityType }[] = [
  { dir: "authors", type: "author" },
  { dir: "series", type: "series" },
  { dir: "works", type: "work" },
  { dir: "editions", type: "edition" },
  { dir: "copies", type: "copy" },
  { dir: "notes", type: "note" },
];

function extractSlugFromWikilink(wikilink: string): string | null {
  const match = wikilink.match(/^\[\[(?:authors|series|works|editions|copies|notes)\/(.+)\]\]$/);
  return match ? match[1] : null;
}

export class Index {
  private authors = new Map<string, Author>();
  private series = new Map<string, Series>();
  private works = new Map<string, Work>();
  private editions = new Map<string, Edition>();
  private copies = new Map<string, Copy>();
  private notes = new Map<string, Note>();

  private libraryPath: string;

  constructor(libraryPath: string) {
    this.libraryPath = libraryPath;
  }

  load(): void {
    const start = performance.now();

    for (const { dir, type } of LIBRARY_DIRECTORIES) {
      const dirPath = resolveLibraryPath(dir, this.libraryPath);
      const files = listFiles(dirPath);

      for (const filename of files) {
        const filePath = resolveLibraryPath(`${dir}/${filename}.md`, this.libraryPath);
        try {
          const { frontmatter, body } = readFile(filePath);
          const entity = { ...frontmatter, slug: frontmatter.slug || filename } as Entity;

          if (type === "note") {
            (entity as Note).body = body;
          }

          this.upsert(type, entity);
        } catch (err) {
          console.warn(`[index] Skipping ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    const elapsed = Math.round(performance.now() - start);
    console.log(`[index] Loaded ${this.count()} entities in ${elapsed}ms`);
  }

  getAuthor(slug: string): Author | undefined {
    return this.authors.get(slug);
  }

  getSeries(slug: string): Series | undefined {
    return this.series.get(slug);
  }

  getWork(slug: string): Work | undefined {
    return this.works.get(slug);
  }

  getEdition(slug: string): Edition | undefined {
    return this.editions.get(slug);
  }

  getCopy(slug: string): Copy | undefined {
    return this.copies.get(slug);
  }

  getNote(filename: string): Note | undefined {
    return this.notes.get(filename);
  }

  getAllAuthors(): Author[] {
    return Array.from(this.authors.values());
  }

  getAllSeries(): Series[] {
    return Array.from(this.series.values());
  }

  getAllWorks(): Work[] {
    return Array.from(this.works.values());
  }

  getAllEditions(): Edition[] {
    return Array.from(this.editions.values());
  }

  getAllCopies(): Copy[] {
    return Array.from(this.copies.values());
  }

  getAllNoteSlugs(): string[] {
    return Array.from(this.notes.keys());
  }

  getAllNotes(): Note[] {
    return Array.from(this.notes.values());
  }

  getWorksByAuthor(authorSlug: string): Work[] {
    const wikilink = `[[authors/${authorSlug}]]`;
    return this.getAllWorks().filter((w) => w.authors.includes(wikilink));
  }

  getWorksBySeries(seriesSlug: string): Work[] {
    const wikilink = `[[series/${seriesSlug}]]`;
    return this.getAllWorks().filter((w) => w.series === wikilink);
  }

  getEditionsByWork(workSlug: string): Edition[] {
    const wikilink = `[[works/${workSlug}]]`;
    return this.getAllEditions().filter((e) => e.work === wikilink);
  }

  getCopiesByEdition(editionSlug: string): Copy[] {
    const wikilink = `[[editions/${editionSlug}]]`;
    return this.getAllCopies().filter((c) => c.edition === wikilink);
  }

  getCopiesByWork(workSlug: string): Copy[] {
    const wikilink = `[[works/${workSlug}]]`;
    return this.getAllCopies().filter((c) => c.work === wikilink);
  }

  getNotesByCopy(copySlug: string): Note[] {
    const wikilink = `[[copies/${copySlug}]]`;
    return Array.from(this.notes.values()).filter((n) => n.copy === wikilink);
  }

  getEditionByISBN(isbn: string): Edition | undefined {
    return this.getAllEditions().find((e) => e.isbn === isbn);
  }

  getWorksByTitleAndAuthor(title: string, authorName: string): Work[] {
    const titleLower = title.toLowerCase().trim();
    const authorLower = authorName.toLowerCase().trim();

    return this.getAllWorks()
      .filter((w) => w.title.toLowerCase().includes(titleLower))
      .filter((w) =>
        w.authors.some((a) => {
          const slug = extractSlugFromWikilink(a);
          if (!slug) return false;
          const author = this.authors.get(slug);
          if (!author) return false;
          if (author.name.toLowerCase() === authorLower) return true;
          if (author.aliases?.some((alias) => alias.toLowerCase() === authorLower)) return true;
          return false;
        })
      )
      .slice(0, 5);
  }

  searchWorks(query: string): Work[] {
    if (!query.trim()) {
      return this.getAllWorks();
    }

    const q = query.toLowerCase();
    return this.getAllWorks().filter((w) => {
      if (w.title.toLowerCase().includes(q)) return true;

      const authorMatches = w.authors.some((a) => {
        const slug = extractSlugFromWikilink(a);
        if (!slug) return false;
        const author = this.authors.get(slug);
        if (!author) return false;
        if (author.name.toLowerCase().includes(q)) return true;
        if (author.aliases?.some((alias) => alias.toLowerCase().includes(q))) return true;
        return false;
      });
      if (authorMatches) return true;

      if (w.genres?.some((g) => g.toLowerCase().includes(q))) return true;

      if (w.aliases?.some((a) => a.toLowerCase().includes(q))) return true;

      return false;
    });
  }

  searchAll(query: string): SearchResults {
    const empty: SearchResults = {
      work: [], author: [], series: [], edition: [], copy: [], note: [], loan: [],
    };

    if (!query.trim()) return empty;

    const q = query.toLowerCase().trim();

    const works = this.searchAllWorks(q);
    const authors = this.searchAllAuthors(q);
    const series = this.searchAllSeries(q);
    const editions = this.searchAllEditions(q);
    const copies = this.searchAllCopies(q);
    const notes = this.searchAllNotes(q);
    const loans = this.searchAllLoans(q);

    return { work: works, author: authors, series, edition: editions, copy: copies, note: notes, loan: loans };
  }

  private getPrimaryAuthorName(work: Work): string {
    if (work.authors.length === 0) return "";
    const slug = extractSlugFromWikilink(work.authors[0]);
    if (!slug) return "";
    const author = this.authors.get(slug);
    return author ? author.name : "";
  }

  private getCopyLabel(copy: Copy): string {
    const work = this.works.get(extractSlugFromWikilink(copy.work) || "");
    return work ? work.title : copy.slug;
  }

  private extractNoteParentLink(note: Note): string {
    const copySlug = note.copy ? extractSlugFromWikilink(note.copy) : null;
    if (copySlug && this.copies.has(copySlug)) return `/copies/${copySlug}`;

    const editionSlug = note.edition ? extractSlugFromWikilink(note.edition) : null;
    if (editionSlug && this.editions.has(editionSlug)) return `/editions/${editionSlug}`;

    const workSlug = note.work ? extractSlugFromWikilink(note.work) : null;
    if (workSlug && this.works.has(workSlug)) return `/works/${workSlug}`;

    return "";
  }

  private getNoteParentLabel(note: Note): string {
    const copySlug = note.copy ? extractSlugFromWikilink(note.copy) : null;
    if (copySlug) {
      const copy = this.copies.get(copySlug);
      if (copy) return this.getCopyLabel(copy);
    }

    const editionSlug = note.edition ? extractSlugFromWikilink(note.edition) : null;
    if (editionSlug) {
      const edition = this.editions.get(editionSlug);
      if (edition) return edition.slug;
    }

    const workSlug = note.work ? extractSlugFromWikilink(note.work) : null;
    if (workSlug) {
      const work = this.works.get(workSlug);
      if (work) return work.title;
    }

    return "";
  }

  private rankResults<T>(
    items: T[],
    field: (item: T) => string,
    query: string,
  ): T[] {
    const scored = items.map((item) => {
      const val = field(item);
      const lower = val.toLowerCase();
      let score: number;
      if (lower === query) {
        score = 0;
      } else if (lower.startsWith(query)) {
        score = 1;
      } else {
        score = 2;
      }
      return { item, score, text: lower };
    });

    scored.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return a.text.localeCompare(b.text);
    });

    return scored.map((s) => s.item);
  }

  private generateSnippet(body: string, query: string, maxLen: number = 120): string {
    const lowerBody = body.toLowerCase();
    const idx = lowerBody.indexOf(query);
    if (idx === -1) return body.slice(0, maxLen);

    const start = Math.max(0, idx - 40);
    const end = Math.min(body.length, idx + query.length + maxLen - 40);
    let snippet = body.slice(start, end);

    if (start > 0) snippet = "..." + snippet;
    if (end < body.length) snippet = snippet + "...";

    return snippet;
  }

  private searchAllWorks(q: string): SearchResult[] {
    const matches: { work: Work; field: string }[] = [];

    for (const w of this.getAllWorks()) {
      let primaryField = w.title;
      if (w.title.toLowerCase() === q) {
        matches.push({ work: w, field: w.title });
        continue;
      }
      if (w.title.toLowerCase().includes(q)) {
        matches.push({ work: w, field: w.title });
        continue;
      }

      const authorMatched = w.authors.some((a) => {
        const slug = extractSlugFromWikilink(a);
        if (!slug) return false;
        const author = this.authors.get(slug);
        if (!author) return false;
        if (author.name.toLowerCase().includes(q)) {
          matches.push({ work: w, field: author.name });
          return true;
        }
        if (author.aliases?.some((alias) => alias.toLowerCase().includes(q))) {
          matches.push({ work: w, field: author.name });
          return true;
        }
        return false;
      });
      if (authorMatched) continue;

      if (w.genres?.some((g) => g.toLowerCase().includes(q))) {
        matches.push({ work: w, field: w.title });
        continue;
      }
      if (w.description?.toLowerCase().includes(q)) {
        matches.push({ work: w, field: w.title });
        continue;
      }
      if (w.aliases?.some((a) => a.toLowerCase().includes(q))) {
        matches.push({ work: w, field: w.title });
      }
    }

    const ranked = this.rankResults(matches, (m) => m.field, q);
    return ranked.slice(0, 5).map(({ work }) => ({
      type: "work" as const,
      slug: work.slug,
      title: work.title,
      subtitle: this.getPrimaryAuthorName(work),
      link: `/works/${work.slug}`,
    }));
  }

  private searchAllAuthors(q: string): SearchResult[] {
    const matches: { author: Author; field: string }[] = [];

    for (const a of this.getAllAuthors()) {
      if (a.name.toLowerCase() === q) {
        matches.push({ author: a, field: a.name });
      } else if (a.name.toLowerCase().includes(q)) {
        matches.push({ author: a, field: a.name });
      } else if (a.aliases?.some((alias) => alias.toLowerCase().includes(q))) {
        matches.push({ author: a, field: a.name });
      }
    }

    const ranked = this.rankResults(matches, (m) => m.field, q);
    return ranked.slice(0, 5).map(({ author }) => ({
      type: "author" as const,
      slug: author.slug,
      title: author.name,
      subtitle: "",
      link: `/authors/${author.slug}`,
    }));
  }

  private searchAllSeries(q: string): SearchResult[] {
    const matches: { series: Series; field: string }[] = [];

    for (const s of this.getAllSeries()) {
      if (s.name.toLowerCase() === q) {
        matches.push({ series: s, field: s.name });
      } else if (s.name.toLowerCase().includes(q)) {
        matches.push({ series: s, field: s.name });
      } else if (s.aliases?.some((alias) => alias.toLowerCase().includes(q))) {
        matches.push({ series: s, field: s.name });
      }
    }

    const ranked = this.rankResults(matches, (m) => m.field, q);
    return ranked.slice(0, 5).map(({ series: s }) => ({
      type: "series" as const,
      slug: s.slug,
      title: s.name,
      subtitle: "",
      link: `/series/${s.slug}`,
    }));
  }

  private searchAllEditions(q: string): SearchResult[] {
    const matches: { edition: Edition; field: string }[] = [];

    for (const e of this.getAllEditions()) {
      if (e.isbn && e.isbn.toLowerCase().includes(q)) {
        matches.push({ edition: e, field: e.isbn });
      } else if (e.publisher && e.publisher.toLowerCase().includes(q)) {
        matches.push({ edition: e, field: e.publisher });
      }
    }

    const ranked = this.rankResults(matches, (m) => m.field, q);
    return ranked.slice(0, 5).map(({ edition }) => {
      const work = this.works.get(extractSlugFromWikilink(edition.work) || "");
      const title = work ? `${work.title} — ${edition.slug}` : edition.slug;
      const subtitle = edition.isbn
        ? `ISBN: ${edition.isbn}`
        : edition.publisher
          ? `Publisher: ${edition.publisher}`
          : "";
      return {
        type: "edition" as const,
        slug: edition.slug,
        title,
        subtitle,
        link: `/editions/${edition.slug}`,
      };
    });
  }

  private searchAllCopies(q: string): SearchResult[] {
    const matches: { copy: Copy; field: string }[] = [];

    for (const c of this.getAllCopies()) {
      if (c.acquisition_source?.toLowerCase().includes(q)) {
        matches.push({ copy: c, field: c.acquisition_source! });
      } else if (c.location?.toLowerCase().includes(q)) {
        matches.push({ copy: c, field: c.location! });
      }
    }

    const ranked = this.rankResults(matches, (m) => m.field, q);
    return ranked.slice(0, 5).map(({ copy }) => {
      const workLabel = this.getCopyLabel(copy);
      const subtitle = copy.location || copy.acquisition_source || "";
      return {
        type: "copy" as const,
        slug: copy.slug,
        title: workLabel,
        subtitle,
        link: `/copies/${copy.slug}`,
      };
    });
  }

  private searchAllNotes(q: string): SearchResult[] {
    const matches: { note: Note; field: string }[] = [];

    for (const n of this.getAllNotes()) {
      if (n.body?.toLowerCase().includes(q)) {
        matches.push({ note: n, field: n.body! });
      }
    }

    const ranked = this.rankResults(matches, (m) => m.field, q);
    return ranked.slice(0, 5).map(({ note }) => {
      const parentLabel = this.getNoteParentLabel(note);
      const formattedDate = note.date
        ? new Date(note.date).toLocaleDateString()
        : note.slug;
      return {
        type: "note" as const,
        slug: note.slug,
        title: formattedDate,
        subtitle: parentLabel,
        snippet: this.generateSnippet(note.body || "", q),
        link: this.extractNoteParentLink(note),
      };
    });
  }

  private searchAllLoans(q: string): SearchResult[] {
    const matches: { copy: Copy; loan: { borrower_name: string }; field: string }[] = [];

    for (const c of this.getAllCopies()) {
      if (c.loans) {
        for (const loan of c.loans) {
          if (loan.borrower_name.toLowerCase().includes(q)) {
            matches.push({ copy: c, loan, field: loan.borrower_name });
          }
        }
      }
    }

    const ranked = this.rankResults(matches, (m) => m.field, q);
    return ranked.slice(0, 5).map(({ copy, loan }) => ({
      type: "loan" as const,
      slug: copy.slug,
      title: loan.borrower_name,
      subtitle: `Lent: ${this.getCopyLabel(copy)}`,
      link: `/copies/${copy.slug}`,
    }));
  }

  upsert(type: EntityType, entity: Entity): void {
    switch (type) {
      case "author":
        this.authors.set(entity.slug, entity as Author);
        break;
      case "series":
        this.series.set(entity.slug, entity as Series);
        break;
      case "work":
        this.works.set(entity.slug, entity as Work);
        break;
      case "edition":
        this.editions.set(entity.slug, entity as Edition);
        break;
      case "copy":
        this.copies.set(entity.slug, entity as Copy);
        break;
      case "note":
        this.notes.set(entity.slug, entity as Note);
        break;
    }
  }

  remove(type: EntityType, slug: string): void {
    switch (type) {
      case "author":
        this.authors.delete(slug);
        break;
      case "series":
        this.series.delete(slug);
        break;
      case "work":
        this.works.delete(slug);
        break;
      case "edition":
        this.editions.delete(slug);
        break;
      case "copy":
        this.copies.delete(slug);
        break;
      case "note":
        this.notes.delete(slug);
        break;
    }
  }

  handleFileChange(type: EntityType, slug: string): void {
    const dirMap: Record<EntityType, string> = {
      author: "authors",
      series: "series",
      work: "works",
      edition: "editions",
      copy: "copies",
      note: "notes",
    };
    const dir = dirMap[type];
    const filePath = resolveLibraryPath(`${dir}/${slug}.md`, this.libraryPath);

    try {
      const { frontmatter, body } = readFile(filePath);
      const entity = { ...frontmatter, slug: frontmatter.slug || slug } as Entity;

      if (type === "note") {
        (entity as Note).body = body;
      }

      this.upsert(type, entity);
    } catch {
      this.remove(type, slug);
    }
  }

  private count(): number {
    return (
      this.authors.size +
      this.series.size +
      this.works.size +
      this.editions.size +
      this.copies.size +
      this.notes.size
    );
  }
}
