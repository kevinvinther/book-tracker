import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthorSelector } from "@/components/AuthorSelector";
import { BarcodeScannerLazy } from "@/components/BarcodeScannerLazy";
import { Button } from "@/components/ui/button";
import type { AuthorMeta } from "@/lib/types";

type PageState = "idle" | "scanning" | "loading" | "preview" | "submitting";

interface LookupData {
  title: string;
  subtitle?: string;
  authors: string[];
  publisher?: string;
  publish_date?: string;
  page_count?: number;
  format?: string;
  language?: string;
  genres?: string[];
  description?: string;
  cover_image?: string;
  cover_url?: string;
}

interface DedupMatch {
  workSlug: string;
  workTitle: string;
  authorNames: string[];
}

interface DedupResult {
  editionMatch: {
    editionSlug: string;
    workSlug: string;
    workTitle: string;
    copyCount: number;
  } | null;
  workMatches: DedupMatch[];
}

export default function AddBook() {
  const navigate = useNavigate();
  const isbnInputRef = useRef<HTMLInputElement>(null);

  // Page state
  const [pageState, setPageState] = useState<PageState>("idle");

  // Lookup + dedup data
  const [lookupData, setLookupData] = useState<LookupData | null>(null);
  const [dedupResult, setDedupResult] = useState<DedupResult | null>(null);

  // Flow state
  const [statusMessage, setStatusMessage] = useState("");
  const [attachToWorkSlug, setAttachToWorkSlug] = useState<string | null>(null);

  // Form fields (used in both idle and preview modes)
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [authors, setAuthors] = useState<AuthorMeta[]>([]);
  const [isbn, setIsbn] = useState("");
  const [publisher, setPublisher] = useState("");
  const [publishDate, setPublishDate] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [format, setFormat] = useState("");
  const [language, setLanguage] = useState("");
  const [condition, setCondition] = useState("");
  const [acquisitionDate, setAcquisitionDate] = useState("");
  const [acquisitionSource, setAcquisitionSource] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [priceCurrency, setPriceCurrency] = useState("");
  const [location, setLocation] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function clearError() {
    setError("");
  }

  function onChange<T>(setter: (v: T) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value as T);
      setError("");
    };
  }

  function cleanIsbn(raw: string): string {
    return raw.replace(/[^0-9-]/g, "");
  }

  function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setCoverPreview(previewUrl);

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    fetch("/api/attachments/upload", { method: "POST", body: formData })
      .then((res) => {
        if (!res.ok) throw new Error("Upload failed");
        return res.json();
      })
      .then((data) => {
        setCoverImage(data.filename);
        setUploading(false);
      })
      .catch(() => {
        setUploading(false);
        setCoverPreview(null);
      });
  }

  // --- Scan / Lookup flow ---

  function handleScan(isbnString: string) {
    clearError();
    setPageState("loading");
    setStatusMessage("Looking up ISBN…");
    doLookup(cleanIsbn(isbnString));
  }

  function handleCancelScan() {
    setPageState("idle");
  }

  function handleManualLookup() {
    const raw = isbnInputRef.current?.value?.trim();
    if (!raw) return;
    clearError();
    setPageState("loading");
    setStatusMessage("Looking up ISBN…");
    const cleaned = cleanIsbn(raw);
    if (isbnInputRef.current) isbnInputRef.current.value = cleaned;
    doLookup(cleaned);
  }

  function doLookup(isbnString: string) {
    fetch(`/api/lookup?isbn=${encodeURIComponent(isbnString)}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error(`Couldn't find ISBN ${isbnString}. Please enter details manually.`);
          }
          return res.json().then((d) => {
            throw new Error(d.error || `Lookup failed (${res.status})`);
          });
        }
        return res.json();
      })
      .then((data: LookupData) => {
        setLookupData(data);

        // Pre-fill form fields from lookup
        setTitle(data.title || "");
        setSubtitle(data.subtitle || "");
        setIsbn(isbnString);
        setPublisher(data.publisher || "");
        setPublishDate(data.publish_date || "");
        setPageCount(data.page_count != null ? String(data.page_count) : "");
        setFormat(data.format || "");
        setLanguage(data.language || "");
        setCoverImage(data.cover_image || "");
        if (data.cover_url) {
          setCoverPreview(data.cover_url);
        }

        // Find or create authors — call the same API to get resolved author data
        if (data.authors.length > 0) {
          populateAuthorsFromLookup(data.authors);
        }

        // Check dedup
        const firstAuthor = data.authors[0] || "";
        const dedupUrl = `/api/quick-add/check-dedup?isbn=${encodeURIComponent(isbnString)}&title=${encodeURIComponent(data.title)}&author=${encodeURIComponent(firstAuthor)}`;

        fetch(dedupUrl)
          .then((r) => r.json())
          .then((dedup: DedupResult) => {
            setDedupResult(dedup);
            setPageState("preview");
          })
          .catch(() => {
            setDedupResult(null);
            setPageState("preview");
          });
      })
      .catch((err) => {
        const msg = err.message || "Lookup failed";
        if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
          setError("Couldn't reach the server. Make sure the backend is running.");
        } else {
          setError(msg);
        }
        setPageState("idle");
        setStatusMessage("");
      });
  }

  function populateAuthorsFromLookup(authorNames: string[]) {
    setStatusMessage("Resolving authors…");

    fetch("/api/authors")
      .then((r) => r.json())
      .then((allAuthors: AuthorMeta[]) => {
        const resolved: AuthorMeta[] = [];
        for (const name of authorNames) {
          const normalized = name.trim().toLowerCase();
          const match = allAuthors.find(
            (a) => a.name.toLowerCase() === normalized || a.name.startsWith(normalized)
          );
          if (match) {
            resolved.push({ slug: match.slug, name: match.name });
          } else {
            resolved.push({ slug: "", name: name.trim() });
          }
        }
        setAuthors(resolved);
        setStatusMessage("");
      })
      .catch(() => {
        // Fallback: mark all as new authors
        setAuthors(authorNames.map((n) => ({ slug: "", name: n.trim() })));
        setStatusMessage("");
      });
  }

  function handleAttachToWork(slug: string) {
    setAttachToWorkSlug(slug);
  }

  function handleCreateNew() {
    setAttachToWorkSlug(null);
  }

  // --- Form submission ---

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (authors.length === 0) {
      setError("At least one author is required.");
      return;
    }
    setSaving(true);
    setPageState("submitting");
    setError("");

    const body: Record<string, unknown> = {
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      authorNames: authors.map((a) => a.name),
      isbn: isbn.trim() || undefined,
      publisher: publisher.trim() || undefined,
      publish_date: publishDate || undefined,
      page_count: pageCount || undefined,
      format: format.trim() || undefined,
      language: language.trim() || undefined,
      condition: condition.trim() || undefined,
      acquisition_date: acquisitionDate || undefined,
      acquisition_source: acquisitionSource.trim() || undefined,
      price_amount: priceAmount || undefined,
      price_currency: priceCurrency.trim() || undefined,
      location: location.trim() || undefined,
      cover_image: coverImage.trim() || undefined,
    };

    if (attachToWorkSlug) {
      body.attachToWorkSlug = attachToWorkSlug;
      delete body.title;
      delete body.authorNames;
    }

    fetch("/api/quick-add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => { throw new Error(d.error || "Failed to create book"); });
        return res.json();
      })
      .then((data) => {
        navigate(`/works/${data.workSlug}`);
      })
      .catch((err) => {
        setError(err.message || "Failed to create book");
        setSaving(false);
        setPageState("preview");
      });
  }

  function handleCancelPreview() {
    setPageState("idle");
    setLookupData(null);
    setDedupResult(null);
    setAttachToWorkSlug(null);
    // Keep form fields as-is for manual editing after cancel
  }

  // --- Render helpers ---

  function renderScanButton() {
    return (
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setPageState("scanning")}
          size="sm"
        >
          Scan Barcode
        </Button>
        <div className="flex items-center gap-2">
          <input
            ref={isbnInputRef}
            type="text"
            placeholder="Enter ISBN manually…"
            className="w-44 rounded-sm border border-rule bg-background px-2.5 py-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleManualLookup(); } }}
          />
          <Button type="button" variant="ghost" size="sm" onClick={handleManualLookup}>
            Lookup
          </Button>
        </div>
      </div>
    );
  }

  function renderPreviewBanner() {
    if (!dedupResult) return null;

    return (
      <div className="space-y-2 rounded-sm border border-rule bg-muted/50 p-3">
        {dedupResult.editionMatch && !attachToWorkSlug && (
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                This edition already exists — &ldquo;{dedupResult.editionMatch.workTitle}&rdquo;
              </p>
              <p className="text-xs text-muted-foreground">
                {dedupResult.editionMatch.copyCount} cop{dedupResult.editionMatch.copyCount === 1 ? "y" : "ies"} in library
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAttachToWork(dedupResult.editionMatch!.workSlug)}
            >
              Add another copy
            </Button>
          </div>
        )}
        {dedupResult.workMatches.length > 0 && !attachToWorkSlug && (
          <div className="border-t border-rule pt-2">
            <p className="text-sm font-medium text-foreground">
              Possible match{dedupResult.workMatches.length > 1 ? "es" : ""}:
            </p>
            {dedupResult.workMatches.map((m) => (
              <div key={m.workSlug} className="mt-1 flex items-center justify-between">
                <span className="text-sm">
                  &ldquo;{m.workTitle}&rdquo; by {m.authorNames.join(", ")}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAttachToWork(m.workSlug)}
                >
                  Attach to this
                </Button>
              </div>
            ))}
          </div>
        )}
        {attachToWorkSlug && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Will add edition &amp; copy to existing Work.
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={handleCreateNew}>
              Create new instead
            </Button>
          </div>
        )}
      </div>
    );
  }

  function renderFormFields() {
    return (
      <>
        <section>
          <h2 className="text-sm font-semibold text-foreground">Work</h2>
          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Title *</span>
              <input value={title} onChange={onChange(setTitle)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Subtitle</span>
              <input value={subtitle} onChange={onChange(setSubtitle)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground">Authors *</h2>
          <div className="mt-3">
            <AuthorSelector selected={authors} onChange={(a) => { setAuthors(a); setError(""); }} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground">Edition</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">ISBN</span>
              <input value={isbn} onChange={onChange(setIsbn)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Publisher</span>
              <input value={publisher} onChange={onChange(setPublisher)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Publish date</span>
              <input type="date" value={publishDate} onChange={onChange(setPublishDate)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Pages</span>
              <input type="number" value={pageCount} onChange={onChange(setPageCount)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Format</span>
              <input value={format} onChange={onChange(setFormat)} placeholder="hardcover, paperback" className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Language</span>
              <input value={language} onChange={onChange(setLanguage)} placeholder="en" className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground">Copy</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Condition</span>
              <input value={condition} onChange={onChange(setCondition)} placeholder="fine, good, fair" className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Location</span>
              <input value={location} onChange={onChange(setLocation)} placeholder="Living Room" className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Acquired</span>
              <input type="date" value={acquisitionDate} onChange={onChange(setAcquisitionDate)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Source</span>
              <input value={acquisitionSource} onChange={onChange(setAcquisitionSource)} placeholder="Bookshop, Gift" className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Price</span>
              <input type="number" step="0.01" value={priceAmount} onChange={onChange(setPriceAmount)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Currency</span>
              <input value={priceCurrency} onChange={onChange(setPriceCurrency)} placeholder="USD" className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Cover image</span>
              <div className="mt-1">
                {coverPreview ? (
                  <div className="relative mb-2 inline-block">
                    <img
                      src={coverPreview}
                      alt="Cover preview"
                      className="h-40 rounded-sm border border-rule object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => { setCoverPreview(null); setCoverImage(""); }}
                      className="absolute top-1 right-1 rounded-full bg-background/80 px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="flex aspect-[2/3] h-40 items-center justify-center rounded-sm border border-dashed border-rule bg-muted/50">
                    <span className="text-xs text-muted-foreground">No cover</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="mt-1.5 block w-full text-xs text-muted-foreground file:mr-3 file:rounded-sm file:border-0 file:bg-secondary file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
                />
                {uploading && <p className="mt-1 text-xs text-muted-foreground">Uploading…</p>}
              </div>
            </label>
          </div>
        </section>
      </>
    );
  }

  // --- Render ---

  if (pageState === "scanning") {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCancelScan}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Cancel Scan
          </button>
        </div>
        <BarcodeScannerLazy onScan={handleScan} onCancel={handleCancelScan} />
      </div>
    );
  }

  if (pageState === "loading") {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="flex flex-col items-center justify-center py-20">
          <span className="mb-4 size-8 animate-spin rounded-full border-2 border-stone-600 border-t-emerald-400" />
          <p className="text-sm text-muted-foreground">{statusMessage || "Loading…"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Cancel
        </Link>
        {pageState === "idle" && renderScanButton()}
        {pageState === "preview" && (
          <button
            type="button"
            onClick={handleCancelPreview}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel Preview
          </button>
        )}
      </div>

      <h1 className="font-display text-3xl text-foreground">
        {pageState === "preview" ? "Preview & Confirm" : "Add a Book"}
      </h1>

      {error && (
        <div className="mt-4 rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {pageState === "preview" && lookupData && (
        <div className="mt-6">
          {renderPreviewBanner()}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-10">
        {renderFormFields()}

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Creating…" : pageState === "preview" ? "Confirm & Create" : "Add Book"}
          </Button>
        </div>
      </form>
    </div>
  );
}
