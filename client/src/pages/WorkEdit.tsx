import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AuthorSelector } from "@/components/AuthorSelector";
import { GenreSelector } from "@/components/GenreSelector";
import { CoverField } from "@/components/CoverField";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/Skeleton";
import { resolveAuthorWikilinks } from "@/lib/authors";
import { uploadAttachment } from "@/lib/attachments";
import type { AuthorMeta, Work } from "@/lib/types";

const inputClass =
  "mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function WorkEdit() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [authors, setAuthors] = useState<AuthorMeta[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [seriesSlug, setSeriesSlug] = useState("");
  const [seriesPosition, setSeriesPosition] = useState("");
  const [originalLanguage, setOriginalLanguage] = useState("");
  const [originalPublishYear, setOriginalPublishYear] = useState("");
  const [aliases, setAliases] = useState("");

  const [coverFilename, setCoverFilename] = useState("");
  const [uploading, setUploading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setLoadError("");

    fetch(`/api/works/${slug}`)
      .then((res) => {
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return null;
        }
        if (!res.ok) throw new Error("Failed to load work");
        return res.json();
      })
      .then((w: Work | null) => {
        if (cancelled || !w) return;
        setTitle(w.title ?? "");
        setSubtitle(w.subtitle ?? "");
        setAuthors((w.authors_meta ?? []).map((a) => ({ slug: a.slug, name: a.name })));
        setGenres(w.genres ?? []);
        setDescription(w.description ?? "");
        setSeriesSlug(w.series_meta?.slug ?? "");
        setSeriesPosition(w.series_position?.toString() ?? "");
        setOriginalLanguage(w.original_language ?? "");
        setOriginalPublishYear(w.original_publish_year?.toString() ?? "");
        setAliases((w.aliases ?? []).join(", "));
        setCoverFilename(w.primary_cover ?? "");
      })
      .catch(() => {
        if (!cancelled) setLoadError("Failed to load work");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const coverPreview = coverFilename ? `/api/attachments/${coverFilename}` : null;

  function handleCoverUpload(file: File) {
    setUploading(true);
    setError("");
    uploadAttachment(file)
      .then((filename) => setCoverFilename(filename))
      .catch(() => setError("Cover upload failed"))
      .finally(() => setUploading(false));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const authorWikilinks = await resolveAuthorWikilinks(authors);
      const aliasList = aliases.split(",").map((s) => s.trim()).filter(Boolean);

      const body: Record<string, unknown> = {
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        authors: authorWikilinks,
        genres: genres.length > 0 ? genres : null,
        description: description.trim() || null,
        series: seriesSlug.trim() ? `[[series/${seriesSlug.trim()}]]` : null,
        series_position: seriesPosition ? Number(seriesPosition) : null,
        original_language: originalLanguage.trim() || null,
        original_publish_year: originalPublishYear ? Number(originalPublishYear) : null,
        aliases: aliasList.length > 0 ? aliasList : null,
        primary_cover: coverFilename || null,
      };

      const res = await fetch(`/api/works/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save");
      navigate(`/works/${slug}`);
    } catch {
      setError("Failed to save changes");
      setSaving(false);
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="font-display text-2xl text-foreground">No such work.</p>
        <Link to="/" className="mt-6 inline-block text-sm text-primary underline-offset-4 hover:underline">
          Back to the shelf
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Skeleton className="h-9 w-1/2" />
        <div className="mt-8 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <div className="mb-6 flex items-center justify-between">
        <Link to={`/works/${slug}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Cancel
        </Link>
      </div>

      <h1 className="font-display text-3xl text-foreground">Edit Work</h1>

      {(error || loadError) && (
        <div role="alert" className="mt-4 rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">{error || loadError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Title *</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Subtitle</span>
          <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className={inputClass} />
        </label>
        <div className="block">
          <span className="text-xs font-medium text-muted-foreground">Authors</span>
          <div className="mt-1">
            <AuthorSelector selected={authors} onChange={setAuthors} />
          </div>
        </div>
        <div className="block">
          <span className="text-xs font-medium text-muted-foreground">Genres</span>
          <div className="mt-1">
            <GenreSelector selected={genres} onChange={setGenres} />
          </div>
        </div>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputClass} />
        </label>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 [&>*]:min-w-0">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Series slug</span>
            <input value={seriesSlug} onChange={(e) => setSeriesSlug(e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Series position</span>
            <input type="number" value={seriesPosition} onChange={(e) => setSeriesPosition(e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Original language (ISO code)</span>
            <input value={originalLanguage} onChange={(e) => setOriginalLanguage(e.target.value)} placeholder="en, fr, ru…" className={inputClass} />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Original publish year</span>
            <input type="number" value={originalPublishYear} onChange={(e) => setOriginalPublishYear(e.target.value)} className={inputClass} />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Aliases (comma-separated)</span>
          <input value={aliases} onChange={(e) => setAliases(e.target.value)} className={inputClass} />
        </label>

        <div className="block">
          <span className="text-xs font-medium text-muted-foreground">Cover</span>
          <div className="mt-1">
            <CoverField
              previewSrc={coverPreview}
              alt={`Cover of ${title || "book"}`}
              uploading={uploading}
              onFileSelected={handleCoverUpload}
              onRemove={() => setCoverFilename("")}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Link to={`/works/${slug}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            Cancel
          </Link>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </div>
      </form>
    </div>
  );
}
