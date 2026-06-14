import { useEffect, useState } from "react";

export default function Settings() {
  const [libraryPath, setLibraryPath] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setLibraryPath(data.library_path || ""))
      .catch(() => setError("Failed to load config"));
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-600">Saved. Restart the server for changes to take effect.</p>}
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
        >
          Save
        </button>
      </form>
    </main>
  );
}
