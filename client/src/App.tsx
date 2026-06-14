import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <>
      <header className="border-b px-6 py-3">
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/" className="font-medium hover:underline">
            Book Tracker
          </Link>
          <Link to="/settings" className="text-muted-foreground hover:text-foreground">
            Settings
          </Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </>
  );
}
