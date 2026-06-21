import { useState, useEffect, useRef, useMemo } from "react";
import type { AuthorMeta } from "@/lib/types";

interface AuthorSelectorProps {
  selected: AuthorMeta[];
  onChange: (authors: AuthorMeta[]) => void;
}

export function AuthorSelector({ selected, onChange }: AuthorSelectorProps) {
  const [input, setInput] = useState("");
  const [allAuthors, setAllAuthors] = useState<AuthorMeta[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/authors")
      .then((r) => r.json())
      .then((data) => {
        setAllAuthors(data.map((a: { slug: string; name: string }) => ({ slug: a.slug, name: a.name })));
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = input.toLowerCase().trim();
    if (!q) return allAuthors;
    return allAuthors.filter((a) => a.name.toLowerCase().includes(q));
  }, [allAuthors, input]);

  const exactMatch = useMemo(() => {
    const q = input.toLowerCase().trim();
    return q ? allAuthors.some((a) => a.name.toLowerCase() === q) : true;
  }, [allAuthors, input]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function addAuthor(author: AuthorMeta) {
    if (!selected.find((s) => s.slug === author.slug)) {
      onChange([...selected, author]);
    }
    setInput("");
    setOpen(false);
  }

  function addNewAuthor() {
    const name = input.trim();
    if (!name) return;
    const tempSlug = `new:${name}`;
    if (!selected.find((s) => s.slug === tempSlug)) {
      onChange([...selected, { slug: tempSlug, name }]);
    }
    setInput("");
    setOpen(false);
  }

  function removeAuthor(slug: string) {
    onChange(selected.filter((a) => a.slug !== slug));
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
          addAuthor(filtered[activeIndex]);
        } else {
          addNewAuthor();
        }
      } else if (input.trim() && loaded && !exactMatch) {
        addNewAuthor();
      } else if (filtered.length > 0) {
        addAuthor(filtered[0]);
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
        placeholder="Type an author name…"
        className="block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Search authors"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls="author-listbox"
        aria-activedescendant={activeIndex >= 0 ? `author-option-${activeIndex}` : undefined}
      />

      {open && input && (
        <div role="listbox" id="author-listbox" className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-sm border border-rule bg-card shadow-lg">
          {filtered.length > 0 && (
            <>
              {filtered.map((a, index) => (
                <button
                  key={a.slug}
                  type="button"
                  role="option"
                  id={`author-option-${index}`}
                  aria-selected={false}
                  onClick={() => addAuthor(a)}
                  className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                >
                  {a.name}
                </button>
              ))}
              <div className="border-t border-rule" />
            </>
          )}
          {loaded && input.trim() && !exactMatch && (
            <button
              type="button"
              role="option"
              id={`author-option-${filtered.length}`}
              aria-selected={false}
              onClick={addNewAuthor}
              className="block w-full px-3 py-1.5 text-left text-sm text-primary hover:bg-muted"
            >
              Create "{input.trim()}"
            </button>
          )}
          {loaded && filtered.length === 0 && exactMatch && (
            <div className="px-3 py-1.5 text-sm text-muted-foreground">No authors found</div>
          )}
        </div>
      )}

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((a) => (
            <span
              key={a.slug}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
            >
              {a.name}
              <button type="button" onClick={() => removeAuthor(a.slug)} className="ml-0.5 text-muted-foreground hover:text-foreground" aria-label={`Remove ${a.name}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
