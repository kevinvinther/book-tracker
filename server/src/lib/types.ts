export interface Author {
  type: "author";
  slug: string;
  name: string;
  aliases?: string[];
  created_at: string;
  _schema: number;
}

export interface Series {
  type: "series";
  slug: string;
  name: string;
  total_works?: number;
  aliases?: string[];
  created_at: string;
  _schema: number;
}

export interface Work {
  type: "work";
  slug: string;
  title: string;
  subtitle?: string;
  authors: string[];
  original_language?: string;
  original_publish_year?: number;
  genres?: string[];
  description?: string;
  series?: string;
  series_position?: number;
  primary_cover?: string;
  aliases?: string[];
  created_at: string;
  _schema: number;
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
  aliases?: string[];
  created_at: string;
  _schema: number;
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
  aliases?: string[];
  loans?: Loan[];
  read_throughs?: ReadThrough[];
  created_at: string;
  _schema: number;
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
  body?: string;
  _schema: number;
}

export type EntityType = "author" | "series" | "work" | "edition" | "copy" | "note";

export type Entity = Author | Series | Work | Edition | Copy | Note;
