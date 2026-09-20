import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clsx } from "clsx";
import { useAuth } from "../lib/auth";
import { Button } from "./ui";

const NAV: Record<string, { to: string; label: string; icon: string; end?: boolean }[]> = {
  teacher: [
    { to: "/teacher", label: "Dashboard", icon: "📊", end: true },
    { to: "/teacher/upload", label: "Upload", icon: "📄" },
    { to: "/teacher/review", label: "Review", icon: "⚖️" },
  ],
  admin: [
    { to: "/teacher", label: "Dashboard", icon: "📊", end: true },
    { to: "/teacher/upload", label: "Upload", icon: "📄" },
    { to: "/teacher/review", label: "Review", icon: "⚖️" },
  ],
  parent: [{ to: "/parent", label: "My children", icon: "👪", end: true }],
  student: [
    { to: "/student", label: "Practice", icon: "✏️", end: true },
    { to: "/student/tutor", label: "Tutor", icon: "💬" },
  ],
};

const ROLE_LABEL: Record<string, string> = {
  teacher: "Teacher",
  admin: "Admin",
  parent: "Parent",
  student: "Student",
};

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = user ? NAV[user.role] || [] : [];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg shadow-sm">📓</div>
            <span className="font-display text-xl font-bold text-ink">Homework Studio</span>
          </div>

          <nav className="hidden items-center gap-1 rounded-xl border border-line bg-surface p-1 md:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition",
                    isActive ? "bg-brand-soft text-brand-ink" : "text-ink-soft hover:text-ink",
                  )
                }
              >
                <span aria-hidden>{l.icon}</span>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden text-right leading-tight sm:block">
                <div className="text-sm font-semibold text-ink">{user.name}</div>
                <div className="text-xs text-ink-soft">Viewing as {ROLE_LABEL[user.role]}</div>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Switch role
            </Button>
          </div>
        </div>

        {/* mobile nav */}
        <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold",
                  isActive ? "bg-brand-soft text-brand-ink" : "text-ink-soft",
                )
              }
            >
              <span aria-hidden>{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
