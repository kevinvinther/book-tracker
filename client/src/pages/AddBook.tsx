import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthorSelector } from "@/components/AuthorSelector";
import { Button } from "@/components/ui/button";
import type { AuthorMeta } from "@/lib/types";

export default function AddBook() {
  const navigate = useNavigate();
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

  function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
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
      });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Cancel
        </Link>
      </div>

      <h1 className="font-display text-3xl text-foreground">Add a Book</h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-10">
        <section>
          <h2 className="text-sm font-semibold text-foreground">Work</h2>
          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Title *</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Subtitle</span>
              <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground">Authors *</h2>
          <div className="mt-3">
            <AuthorSelector selected={authors} onChange={setAuthors} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground">Edition</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">ISBN</span>
              <input value={isbn} onChange={(e) => setIsbn(e.target.value)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Publisher</span>
              <input value={publisher} onChange={(e) => setPublisher(e.target.value)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Publish date</span>
              <input type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Pages</span>
              <input type="number" value={pageCount} onChange={(e) => setPageCount(e.target.value)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Format</span>
              <input value={format} onChange={(e) => setFormat(e.target.value)} placeholder="hardcover, paperback" className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Language</span>
              <input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="en" className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground">Copy</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Condition</span>
              <input value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="fine, good, fair" className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Location</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Living Room" className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Acquired</span>
              <input type="date" value={acquisitionDate} onChange={(e) => setAcquisitionDate(e.target.value)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Source</span>
              <input value={acquisitionSource} onChange={(e) => setAcquisitionSource(e.target.value)} placeholder="Bookshop, Gift" className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Price</span>
              <input type="number" step="0.01" value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Currency</span>
              <input value={priceCurrency} onChange={(e) => setPriceCurrency(e.target.value)} placeholder="USD" className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
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

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Creating…" : "Add Book"}
          </Button>
        </div>
      </form>
    </div>
  );
}
