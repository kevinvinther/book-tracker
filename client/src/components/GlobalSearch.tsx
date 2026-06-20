import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSearch } from "@/hooks/useSearch";
import type { SearchResult } from "@/lib/types";

const RECENT_KEY = "booktracker-recent-searches";
const MAX_RECENT = 5;

function getRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecent(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  const recent = getRecent().filter((q) => q !== trimmed);
  recent.unshift(trimmed);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

const GROUP_LABELS: Record<SearchResult["type"], string> = {
  work: "Works",
  author: "Authors",
  series: "Series",
  edition: "Editions",
  copy: "Copies",
  note: "Notes",
  loan: "Loans",
};

const GROUP_ORDER: SearchResult["type"][] = [
  "work", "author", "series", "edition", "copy", "note", "loan",
];

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [recent, setRecent] = useState<string[]>(getRecent);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { results, isLoading } = useSearch(open ? query : "");

  const close = useCallback(() => {
    setOpen(false);
    setExpanded(false);
    inputRef.current?.blur();
  }, []);

  const expand = useCallback(() => {
    setExpanded(true);
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      saveRecent(query);
      setRecent(getRecent());
      close();
      setQuery("");
      navigate(result.link);
    },
    [query, close, navigate],
  );

  const handleRecentClick = useCallback(
    (q: string) => {
      setQuery(q);
      setOpen(true);
      inputRef.current?.focus();
    },
    [],
  );

  // Close on click outside
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [close]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setExpanded(true);
        inputRef.current?.focus();
        setOpen(true);
        return;
      }
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
        const editable = (document.activeElement as HTMLElement)?.getAttribute("contenteditable");
        if (tag === "input" || tag === "textarea" || tag === "select" || editable === "true") {
          return;
        }
        e.preventDefault();
        setExpanded(true);
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape" && open) {
        close();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  const hasResults = results
    ? GROUP_ORDER.some((type) => results[type].length > 0)
    : false;

  return (
    <div ref={containerRef} className="relative z-50 flex-1 max-w-md md:mx-4">
      {/* Desktop: always show full input */}
      <div className="relative hidden md:block">
        <svg
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Search... (Ctrl+K)"
          className="w-full pl-9 pr-3 py-1.5 text-sm bg-sidebar border border-rule rounded-md
                     text-foreground placeholder:text-muted-foreground
                     focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
      </div>

      {/* Mobile: compact icon button or expanded input */}
      <div className="flex md:hidden justify-end">
        {!expanded ? (
          <button
            onClick={expand}
            className="flex items-center justify-center size-9 rounded-md border border-rule bg-sidebar text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Search"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
        ) : (
          <div className="relative w-full">
            <svg
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              placeholder="Search..."
              className="w-full pl-9 pr-8 py-1.5 text-sm bg-sidebar border border-rule rounded-md
                         text-foreground placeholder:text-muted-foreground
                         focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
            />
            <button
              onClick={close}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Close search"
            >
              <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {open && (
        <div
          className="absolute top-full mt-1 w-full bg-popover border border-rule rounded-md shadow-lg
                     max-h-80 overflow-y-auto z-50"
          aria-live="polite"
        >
          {query.trim() === "" && recent.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Recent
              </div>
              {recent.map((q) => (
                <button
                  key={q}
                  className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent truncate"
                  onClick={() => handleRecentClick(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {query.trim() !== "" && isLoading && (
            <div className="p-3 text-sm text-muted-foreground text-center">
              Searching...
            </div>
          )}

          {query.trim() !== "" && !isLoading && !hasResults && (
            <div className="p-3 text-sm text-muted-foreground text-center">
              No results found
            </div>
          )}

          {query.trim() !== "" && !isLoading && hasResults && results && (
            <div className="p-1">
              {GROUP_ORDER.map((type) => {
                const group = results[type];
                if (group.length === 0) return null;
                return (
                  <div key={type}>
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {GROUP_LABELS[type]}
                    </div>
                    {group.map((result, i) => (
                      <button
                        key={`${result.type}-${result.slug}-${i}`}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                        onClick={() => handleSelect(result)}
                      >
                        <div className="text-sm text-foreground truncate">
                          {result.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {result.type === "note" && result.snippet
                            ? result.snippet
                            : result.subtitle}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
