import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clsx } from "clsx";
import { useAuth } from "../lib/auth";
import { Button, Badge } from "./ui";

const NAV: Record<string, { to: string; label: string }[]> = {
  teacher: [
    { to: "/teacher", label: "Dashboard" },
    { to: "/teacher/upload", label: "Upload homework" },
    { to: "/teacher/review", label: "Review queue" },
  ],
  admin: [
    { to: "/teacher", label: "Dashboard" },
    { to: "/teacher/upload", label: "Upload homework" },
    { to: "/teacher/review", label: "Review queue" },
  ],
  parent: [{ to: "/parent", label: "My children" }],
  student: [
    { to: "/student", label: "Practice" },
    { to: "/student/tutor", label: "Ask the tutor" },
  ],
};

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = user ? NAV[user.role] || [] : [];

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-lg">📚</div>
            <span className="text-lg font-bold text-slate-900">Homework Studio</span>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/teacher" || l.to === "/student"}
                className={({ isActive }) =>
                  clsx(
                    "rounded-lg px-3 py-2 text-sm font-medium",
                    isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100",
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden text-right sm:block">
                <div className="text-sm font-medium text-slate-900">{user.name}</div>
                <Badge tone="indigo">{user.role}</Badge>
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
        {/* mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 md:hidden">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/teacher" || l.to === "/student"}
              className={({ isActive }) =>
                clsx(
                  "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium",
                  isActive ? "bg-brand-50 text-brand-700" : "text-slate-600",
                )
              }
            >
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
