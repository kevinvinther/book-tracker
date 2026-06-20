import { NavLink } from "react-router-dom";
import { Home, BarChart3, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/", label: "Grid", icon: Home },
  { to: "/stats", label: "Stats", icon: BarChart3 },
  { to: "/add", label: "Add", icon: Plus },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-card pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="flex items-center justify-around pt-1.5 pb-1">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1 text-xs font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )
            }
          >
            <Icon className="size-5" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
