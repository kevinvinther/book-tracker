import { Routes, Route, Link } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import WorkGrid from "./pages/WorkGrid";
import WorkDetail from "./pages/WorkDetail";
import AuthorDetail from "./pages/AuthorDetail";
import SeriesDetail from "./pages/SeriesDetail";
import EditionDetail from "./pages/EditionDetail";
import CopyDetail from "./pages/CopyDetail";
import AddBook from "./pages/AddBook";
import Settings from "./pages/Settings";
import Stats from "./pages/Stats";
import GlobalSearch from "./components/GlobalSearch";
import { BottomNav } from "./components/BottomNav";
import { useTheme } from "./components/ThemeProvider";

export default function App() {
  const { effectiveTheme, toggleTheme } = useTheme();

  return (
    <div className="paper-grain min-h-screen">
      <header className="sticky top-0 z-20 border-b border-rule bg-background px-4 py-3 md:px-6 md:py-4">
        <nav className="flex items-center gap-4 text-sm md:gap-6">
          <Link to="/" className="font-display text-base text-foreground hover:text-primary shrink-0">
            Book Tracker
          </Link>
          <GlobalSearch />
          <button
            type="button"
            onClick={toggleTheme}
            className="hidden md:inline-flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
            aria-label={effectiveTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {effectiveTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <Link to="/stats" className="hidden md:block text-muted-foreground hover:text-foreground">
            Stats
          </Link>
          <Link to="/settings" className="hidden md:block text-muted-foreground hover:text-foreground">
            Settings
          </Link>
        </nav>
      </header>
      <main className="relative z-10 pb-16 md:pb-0">
        <Routes>
          <Route path="/" element={<WorkGrid />} />
          <Route path="/works/:slug" element={<WorkDetail />} />
          <Route path="/authors/:slug" element={<AuthorDetail />} />
          <Route path="/series/:slug" element={<SeriesDetail />} />
          <Route path="/editions/:slug" element={<EditionDetail />} />
          <Route path="/copies/:slug" element={<CopyDetail />} />
          <Route path="/add" element={<AddBook />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}
