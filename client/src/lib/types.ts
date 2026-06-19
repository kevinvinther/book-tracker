export interface AuthorMeta {
  slug: string;
  name: string;
}

export interface SeriesMeta {
  slug: string;
  name: string;
}

export interface Work {
  type: "work";
  slug: string;
  title: string;
  subtitle?: string;
  authors: string[];
  authors_meta?: AuthorMeta[];
  original_language?: string;
  original_publish_year?: number;
  genres?: string[];
  description?: string;
  series?: string;
  series_meta?: SeriesMeta | null;
  series_position?: number;
  primary_cover?: string;
  created_at: string;
  edition_count?: number;
  copy_count?: number;
}

export interface Contributor {
  name: string;
  role: string;
}

export interface Edition {
  type: "edition";
  slug: string;
  work: string;
  isbn?: string;
  publisher?: string;
  publish_date?: string;
  page_count?: number;
  format?: string;
  language?: string;
  contributors?: Contributor[];
  created_at: string;
  copy_count?: number;
}

export interface EditionWorkMeta {
  slug: string;
  title: string;
  authors: string[];
}

export interface EditionFull extends Edition {
  work_meta: EditionWorkMeta | null;
}

export interface PageLog {
  date: string;
  page: number;
}

export interface ReadThrough {
  started_date: string;
  finished_date?: string | null;
  status: "reading" | "finished" | "dnf" | "paused";
  rating?: number;
  page_log: PageLog[];
}

export interface Loan {
  borrower_name: string;
  lent_date: string;
  expected_return_date?: string;
  returned_date?: string | null;
}

export interface Copy {
  type: "copy";
  slug: string;
  edition: string;
  work: string;
  cover_image?: string;
  release_date?: string;
  condition?: string;
  acquisition_date?: string;
  acquisition_source?: string;
  price_amount?: number;
  price_currency?: string;
  location?: string;
  status: "owned" | "lent" | "lost" | "given-away" | "sold";
  read_throughs?: ReadThrough[];
  loans?: Loan[];
  created_at: string;
}

export interface CopyEditionMeta {
  slug: string;
  publisher?: string;
  format?: string;
  page_count?: number;
  isbn?: string;
}

export interface CopyWorkMeta {
  slug: string;
  title: string;
  authors: string[];
}

export interface CopyFull extends Copy {
  edition_meta: CopyEditionMeta | null;
  work_meta: CopyWorkMeta | null;
}

export interface EnrichedWorkInAuthor {
  slug: string;
  title: string;
  primary_cover: string | null;
  edition_count: number;
  copy_count: number;
}

export interface EnrichedWorkInSeries {
  slug: string;
  title: string;
  series_position?: number;
  authors_meta: AuthorMeta[];
  primary_cover: string | null;
  edition_count: number;
  copy_count: number;
}

export interface Author {
  type: "author";
  slug: string;
  name: string;
  aliases?: string[];
  created_at: string;
  works: EnrichedWorkInAuthor[];
}

export interface Series {
  type: "series";
  slug: string;
  name: string;
  total_works?: number;
  aliases?: string[];
  created_at: string;
  works: EnrichedWorkInSeries[];
}

export interface NoteCopyMeta {
  slug: string;
  condition?: string;
  location?: string;
}

export interface NoteEditionMeta {
  slug: string;
  publisher?: string;
  format?: string;
  page_count?: number;
}

export interface NoteWorkMeta {
  slug: string;
  title: string;
  authors: string[];
}

export interface NoteReadThroughMeta {
  started_date: string;
  status: string;
  rating?: number;
}

export interface Note {
  type: "note";
  slug: string;
  date: string;
  modified: string;
  work?: string;
  edition?: string;
  copy?: string;
  read_through?: string;
  context_page?: number;
  tags?: string[];
  body: string;
  copy_meta: NoteCopyMeta | null;
  edition_meta: NoteEditionMeta | null;
  work_meta: NoteWorkMeta | null;
  read_through_meta: NoteReadThroughMeta | null;
}

export interface QuickAddPayload {
  title: string;
  subtitle?: string;
  authorNames: string[];
  isbn?: string;
  publisher?: string;
  publish_date?: string;
  page_count?: string;
  format?: string;
  language?: string;
  condition?: string;
  acquisition_date?: string;
  acquisition_source?: string;
  price_amount?: string;
  price_currency?: string;
  location?: string;
  cover_image?: string;
}

export interface QuickAddResponse {
  workSlug: string;
}
