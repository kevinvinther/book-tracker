import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AuthorSelector } from "@/components/AuthorSelector";
import { GenreSelector } from "@/components/GenreSelector";
import { CoverField } from "@/components/CoverField";
import { EnrichPanel, type EnrichField } from "@/components/EnrichPanel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/Skeleton";
import { resolveAuthorWikilinks } from "@/lib/authors";
import { uploadAttachment, downloadAttachment } from "@/lib/attachments";
import { toDateInputValue } from "@/lib/dates";
import type { AuthorMeta, EditionFull, Work } from "@/lib/types";

const inputClass =
  "mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function EditionEdit() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [workSlug, setWorkSlug] = useState("");
  const [workTitle, setWorkTitle] = useState("");

  // Work-level fields
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [authors, setAuthors] = useState<AuthorMeta[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  // Edition-level fields
  const [isbn, setIsbn] = useState("");
  const [publisher, setPublisher] = useState("");
  const [publishDate, setPublishDate] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [format, setFormat] = useState("");
  const [language, setLanguage] = useState("");
  const [contributors, setContributors] = useState("");

  // Cover
  const [coverFilename, setCoverFilename] = useState("");
  const [coverRemoteUrl, setCoverRemoteUrl] = useState<string | null>(null);
  const [applyCoverToCopies, setApplyCoverToCopies] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [copyCount, setCopyCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setLoadError("");

    fetch(`/api/editions/${slug}`)
      .then((res) => {
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return null;
        }
        if (!res.ok) throw new Error("Failed to load edition");
        return res.json();
      })
      .then((ed: EditionFull | null) => {
        if (cancelled || !ed) return null;
        setIsbn(ed.isbn ?? "");
        setPublisher(ed.publisher ?? "");
        setPublishDate(toDateInputValue(ed.publish_date));
        setPageCount(ed.page_count?.toString() ?? "");
        setFormat(ed.format ?? "");
        setLanguage(ed.language ?? "");
        setContributors((ed.contributors ?? []).map((c) => `${c.name}${c.role ? `:${c.role}` : ""}`).join(", "));
        setCopyCount(ed.copy_count ?? 0);
        const ws = ed.work_meta?.slug ?? "";
        setWorkSlug(ws);
        setWorkTitle(ed.work_meta?.title ?? "");
        return ws ? fetch(`/api/works/${ws}`).then((r) => (r.ok ? r.json() : null)) : null;
      })
      .then((w: Work | null) => {
        if (cancelled || !w) return;
        setTitle(w.title ?? "");
        setSubtitle(w.subtitle ?? "");
        setAuthors((w.authors_meta ?? []).map((a) => ({ slug: a.slug, name: a.name })));
        setGenres(w.genres ?? []);
        setDescription(w.description ?? "");
        setCoverFilename(w.primary_cover ?? "");
      })
      .catch(() => {
        if (!cancelled) setLoadError("Failed to load edition");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const coverPreview = coverRemoteUrl
    ? coverRemoteUrl
    : coverFilename
      ? `/api/attachments/${coverFilename}`
      : null;

  function handleCoverUpload(file: File) {
    setUploading(true);
    setError("");
    uploadAttachment(file)
      .then((filename) => {
        setCoverFilename(filename);
        setCoverRemoteUrl(null);
      })
      .catch(() => setError("Cover upload failed"))
      .finally(() => setUploading(false));
  }

  function handleAdopt(field: EnrichField, value: unknown, mode: "replace" | "merge" = "replace") {
    switch (field) {
      case "title": setTitle(String(value)); break;
      case "subtitle": setSubtitle(String(value)); break;
      case "description": setDescription(String(value)); break;
      case "publisher": setPublisher(String(value)); break;
      case "publish_date": setPublishDate(toDateInputValue(String(value))); break;
      case "page_count": setPageCount(String(value)); break;
      case "format": setFormat(String(value)); break;
      case "language": setLanguage(String(value)); break;
      case "authors": setAuthors((value as string[]).map((n) => ({ slug: `new:${n}`, name: n }))); break;
      case "genres":
        setGenres((prev) =>
          mode === "merge"
            ? Array.from(new Set([...prev, ...(value as string[])]))
            : (value as string[]),
        );
        break;
    }
  }

  function parseContributors() {
    return contributors
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const colonIdx = s.indexOf(":");
        if (colonIdx === -1) return { name: s };
        return { name: s.slice(0, colonIdx).trim(), role: s.slice(colonIdx + 1).trim() };
      });
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
      // Materialize a chosen remote cover only now, on save.
      let finalCover = coverFilename;
      if (coverRemoteUrl) {
        finalCover = await downloadAttachment(coverRemoteUrl);
      }

      const authorWikilinks = await resolveAuthorWikilinks(authors);

      const workBody: Record<string, unknown> = {
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        authors: authorWikilinks,
        genres: genres.length > 0 ? genres : null,
        description: description.trim() || null,
        primary_cover: finalCover || null,
      };

      const editionBody: Record<string, unknown> = {
        isbn: isbn.trim() || null,
        publisher: publisher.trim() || null,
        publish_date: publishDate || null,
        page_count: pageCount ? Number(pageCount) : null,
        format: format.trim() || null,
        language: language.trim() || null,
        contributors: (() => {
          const list = parseContributors();
          return list.length > 0 ? list : null;
        })(),
      };

      const [workRes, editionRes] = await Promise.all([
        workSlug
          ? fetch(`/api/works/${workSlug}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(workBody),
            })
          : Promise.resolve(new Response(null, { status: 200 })),
        fetch(`/api/editions/${slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editionBody),
        }),
      ]);

      if (!workRes.ok || !editionRes.ok) throw new Error("Failed to save changes");

      if (applyCoverToCopies && finalCover) {
        const copiesRes = await fetch(`/api/copies?edition=${encodeURIComponent(slug)}`);
        if (copiesRes.ok) {
          const copies: { slug: string }[] = await copiesRes.json();
          await Promise.all(
            copies.map((c) =>
              fetch(`/api/copies/${c.slug}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cover_image: finalCover }),
              }),
            ),
          );
        }
      }

      navigate(`/editions/${slug}`);
    } catch {
      setError("Failed to save changes");
      setSaving(false);
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="font-display text-2xl text-foreground">No such edition.</p>
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
        <Link to={`/editions/${slug}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Cancel
        </Link>
      </div>

      <h1 className="font-display text-3xl text-foreground">Edit Edition</h1>
      {workTitle && <p className="mt-1 text-sm text-muted-foreground">{workTitle}</p>}

      {(error || loadError) && (
        <div role="alert" className="mt-4 rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">{error || loadError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-10">
        <EnrichPanel
          isbn={isbn}
          current={{
            title,
            subtitle,
            authors: authors.map((a) => a.name).join(", "),
            publisher,
            publish_date: publishDate,
            page_count: pageCount,
            format,
            language,
            genres: genres.join(", "),
            description,
          }}
          onAdopt={handleAdopt}
          onAdoptCover={(url) => setCoverRemoteUrl(url)}
        />

        <section>
          <h2 className="text-sm font-semibold text-foreground">Work</h2>
          <div className="mt-3 space-y-3">
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
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground">Edition</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 [&>*]:min-w-0">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">ISBN</span>
              <input value={isbn} onChange={(e) => setIsbn(e.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Publisher</span>
              <input value={publisher} onChange={(e) => setPublisher(e.target.value)} className={inputClass} />
            </label>
            <label className="block min-w-0">
              <span className="text-xs font-medium text-muted-foreground">Publish date</span>
              <input type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Pages</span>
              <input type="number" value={pageCount} onChange={(e) => setPageCount(e.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Format</span>
              <input value={format} onChange={(e) => setFormat(e.target.value)} placeholder="hardcover, paperback" className={inputClass} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Language</span>
              <input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="en" className={inputClass} />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Contributors (Name:Role, comma-separated)</span>
              <input value={contributors} onChange={(e) => setContributors(e.target.value)} className={inputClass} />
            </label>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground">Cover</h2>
          <div className="mt-3">
            <CoverField
              previewSrc={coverPreview}
              alt={`Cover of ${title || "book"}`}
              uploading={uploading}
              onFileSelected={handleCoverUpload}
              onRemove={() => { setCoverFilename(""); setCoverRemoteUrl(null); }}
            />
            {copyCount > 0 && (
              <label className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={applyCoverToCopies}
                  onChange={(e) => setApplyCoverToCopies(e.target.checked)}
                  className="size-3 accent-primary"
                />
                Use this cover for {copyCount === 1 ? "this edition’s 1 copy" : `this edition’s ${copyCount} copies`} too
              </label>
            )}
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <Link to={`/editions/${slug}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            Cancel
          </Link>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </div>
      </form>
    </div>
  );
}
