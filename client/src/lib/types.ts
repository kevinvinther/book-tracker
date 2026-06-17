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
  created_at: string;
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
