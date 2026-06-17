import { Routes, Route, Link } from "react-router-dom";
import WorkGrid from "./pages/WorkGrid";
import WorkDetail from "./pages/WorkDetail";
import AuthorDetail from "./pages/AuthorDetail";
import SeriesDetail from "./pages/SeriesDetail";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <div className="paper-grain min-h-screen">
      <header className="relative z-10 border-b border-rule px-6 py-4">
        <nav className="flex items-center gap-6 text-sm">
          <Link to="/" className="font-display text-base text-foreground hover:text-primary">
            Book Tracker
          </Link>
          <Link to="/settings" className="text-muted-foreground hover:text-foreground">
            Settings
          </Link>
        </nav>
      </header>
      <main className="relative z-10">
        <Routes>
          <Route path="/" element={<WorkGrid />} />
          <Route path="/works/:slug" element={<WorkDetail />} />
          <Route path="/authors/:slug" element={<AuthorDetail />} />
          <Route path="/series/:slug" element={<SeriesDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
