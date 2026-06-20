import { useState, useEffect, useRef, useMemo } from "react";

interface GenreSelectorProps {
  selected: string[];
  onChange: (genres: string[]) => void;
}

export function GenreSelector({ selected, onChange }: GenreSelectorProps) {
  const [input, setInput] = useState("");
  const [allGenres, setAllGenres] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/genres")
      .then((r) => r.json())
      .then((data) => {
        setAllGenres(Array.isArray(data) ? data : []);
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = input.toLowerCase().trim();
    if (!q) return allGenres;
    return allGenres.filter((g) => g.toLowerCase().includes(q));
  }, [allGenres, input]);

  const exactMatch = useMemo(() => {
    const q = input.toLowerCase().trim();
    return q ? allGenres.some((g) => g === q) : true;
  }, [allGenres, input]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function addGenre(genre: string) {
    if (!selected.includes(genre)) {
      onChange([...selected, genre]);
    }
    setInput("");
    setOpen(false);
  }

  function addNewGenre() {
    const name = input.trim();
    if (!name) return;
    if (!selected.includes(name)) {
      onChange([...selected, name]);
    }
    setInput("");
    setOpen(false);
  }

  function removeGenre(genre: string) {
    onChange(selected.filter((g) => g !== genre));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const hasCreateOption = loaded && input.trim() && !exactMatch;
    const optionCount = filtered.length + (hasCreateOption ? 1 : 0);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1 >= optionCount ? 0 : prev + 1));
      if (!open) setOpen(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 < 0 ? optionCount - 1 : prev - 1));
      if (!open) setOpen(true);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(optionCount > 0 ? 0 : -1);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(optionCount > 0 ? optionCount - 1 : -1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) {
        if (activeIndex < filtered.length) {
          addGenre(filtered[activeIndex]);
        } else {
          addNewGenre();
        }
      } else if (input.trim() && loaded && !exactMatch) {
        addNewGenre();
      } else if (filtered.length > 0) {
        addGenre(filtered[0]);
      }
    } else if (e.key === "Escape") {
      setActiveIndex(-1);
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setActiveIndex(-1);
          setOpen(true);
        }}
        onFocus={() => {
          setActiveIndex(-1);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Type a genre…"
        className="block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Search genres"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls="genre-listbox"
        aria-activedescendant={activeIndex >= 0 ? `genre-option-${activeIndex}` : undefined}
      />

      {open && input && (
        <div role="listbox" id="genre-listbox" className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-sm border border-rule bg-card shadow-lg">
          {filtered.length > 0 && (
            <>
              {filtered.map((g, index) => (
                <button
                  key={g}
                  type="button"
                  role="option"
                  id={`genre-option-${index}`}
                  aria-selected={false}
                  onClick={() => addGenre(g)}
                  className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                >
                  {g}
                </button>
              ))}
              <div className="border-t border-rule" />
            </>
          )}
          {loaded && input.trim() && !exactMatch && (
            <button
              type="button"
              role="option"
              id={`genre-option-${filtered.length}`}
              aria-selected={false}
              onClick={addNewGenre}
              className="block w-full px-3 py-1.5 text-left text-sm text-primary hover:bg-muted"
            >
              Create &ldquo;{input.trim()}&rdquo;
            </button>
          )}
          {loaded && filtered.length === 0 && exactMatch && (
            <div className="px-3 py-1.5 text-sm text-muted-foreground">No genres found</div>
          )}
        </div>
      )}

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((g) => (
            <span
              key={g}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
            >
              {g}
              <button type="button" onClick={() => removeGenre(g)} className="ml-0.5 text-muted-foreground hover:text-foreground" aria-label={`Remove ${g}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
