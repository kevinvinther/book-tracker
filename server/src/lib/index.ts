import { readFile, listFiles, resolveLibraryPath } from "./io.js";
import { Author, Series, Work, Edition, Copy, Note, Entity, EntityType } from "./types.js";

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
