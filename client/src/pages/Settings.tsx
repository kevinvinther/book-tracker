import { useEffect, useState } from "react";
import { useTheme } from "../components/ThemeProvider";

const THEME_OPTIONS = [
  { value: "light" as const, label: "Light" },
  { value: "dark" as const, label: "Dark" },
  { value: "system" as const, label: "System" },
];

export default function Settings() {
  const [libraryPath, setLibraryPath] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [genresText, setGenresText] = useState("");
  const [genresSaved, setGenresSaved] = useState(false);
  const [genresError, setGenresError] = useState("");
  const [genresSaving, setGenresSaving] = useState(false);

  const { theme, setTheme } = useTheme();

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setLibraryPath(data.library_path || ""))
      .catch(() => setError("Failed to load config"));

    fetch("/api/genres")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setGenresText(data.join("\n"));
        }
      })
      .catch(() => setGenresError("Failed to load genres"));
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = libraryPath.trim();
    if (!trimmed) {
      setError("Library path cannot be empty");
      return;
    }
    setError("");
    fetch("/api/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ library_path: trimmed }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to save");
        return res.json();
      })
      .then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      })
      .catch(() => setError("Failed to save config"));
  }

  function handleGenresSave() {
    setGenresError("");
    setGenresSaving(true);
    const genreList = genresText
      .split("\n")
      .map((g) => g.trim())
      .filter(Boolean);

    fetch("/api/genres", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ genres: genreList }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to save");
        return res.json();
      })
      .then((data) => {
        setGenresText(Array.isArray(data) ? data.join("\n") : genresText);
        setGenresSaved(true);
        setTimeout(() => setGenresSaved(false), 2000);
      })
      .catch(() => setGenresError("Failed to save genres"))
      .finally(() => setGenresSaving(false));
  }

  return (
    <main className="mx-auto max-w-lg p-8 pt-20">
      <h1 className="mb-6 text-2xl font-semibold">Settings</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Library Path</span>
          <input
            type="text"
            value={libraryPath}
            onChange={(e) => setLibraryPath(e.target.value)}
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
            placeholder="~/book-tracker-data/"
          />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {saved && <p role="status" className="text-sm text-green-600">Saved. Restart the server for changes to take effect.</p>}
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
        >
          Save
        </button>
      </form>

      <section className="mt-10 border-t border-rule pt-8">
        <h2 className="text-lg font-semibold">Genres</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One genre per line. Edit and save to curate the controlled vocabulary.
        </p>
        <label className="block">
          <span className="text-sm font-medium">Genre vocabulary</span>
          <textarea
            value={genresText}
            onChange={(e) => setGenresText(e.target.value)}
            rows={10}
            className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-2 text-sm font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={"fiction\nscience-fiction\nmystery"}
          />
        </label>
        {genresError && <p role="alert" className="mt-2 text-sm text-destructive">{genresError}</p>}
        {genresSaved && <p role="status" className="mt-2 text-sm text-green-600">Genres saved.</p>}
        <button
          type="button"
          onClick={handleGenresSave}
          disabled={genresSaving}
          className="mt-3 rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
        >
          {genresSaving ? "Saving…" : "Save Genres"}
        </button>
      </section>

      <section className="mt-10 border-t border-rule pt-8">
        <h2 className="text-lg font-semibold">Appearance</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose your preferred colour scheme.
        </p>
        <fieldset className="mt-4 space-y-2">
          {THEME_OPTIONS.map(({ value, label }) => (
            <label
              key={value}
              className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm cursor-pointer hover:bg-muted/50"
            >
              <input
                type="radio"
                name="theme"
                value={value}
                checked={theme === value}
                onChange={() => setTheme(value)}
                className="size-4 accent-primary"
              />
              {label}
            </label>
          ))}
        </fieldset>
      </section>
    </main>
  );
}
