import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button, Card, Input } from "../components/ui";
import type { Role } from "../lib/api";

const HOME: Record<Role, string> = { admin: "/teacher", teacher: "/teacher", parent: "/parent", student: "/student" };

const ROLES = [
  { role: "Teacher", email: "teacher@demo.id", icon: "🧑‍🏫", blurb: "Upload homework, watch it grade itself, and review anything unclear." },
  { role: "Parent", email: "parent@demo.id", icon: "👪", blurb: "See how your child is doing — and download a progress report." },
  { role: "Student", email: "student@demo.id", icon: "🧒", blurb: "Practise, get instant feedback, and ask the tutor for help." },
];

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function go(em: string, pw: string) {
    setBusy(em);
    setError("");
    try {
      const user = await login(em, pw);
      navigate(HOME[user.role]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setBusy("");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-12">
      <header className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-4xl shadow-lift">📓</div>
        <h1 className="font-display text-4xl font-bold text-ink">Homework Studio</h1>
        <p className="mx-auto mt-2 max-w-md text-ink-soft">
          Homework comes in. It gets read, graded, and anything unclear goes to the teacher — then it turns into a
          warm progress report. Plus an AI tutor for the kids.
        </p>
      </header>

      <div className="mb-2 text-center text-sm font-semibold text-ink-soft">Pick a role to explore the demo</div>
      <div className="grid gap-3 sm:grid-cols-3">
        {ROLES.map((r) => (
          <button
            key={r.email}
            disabled={busy !== ""}
            onClick={() => go(r.email, "demo1234")}
            className="group flex flex-col items-center rounded-2xl border border-line bg-surface p-5 text-center shadow-card transition hover:border-brand hover:shadow-lift disabled:opacity-60"
          >
            <div className="text-4xl transition group-hover:scale-110">{r.icon}</div>
            <div className="mt-2 font-display text-lg font-semibold text-ink">{r.role}</div>
            <div className="mt-1 text-sm text-ink-soft">{r.blurb}</div>
            <div className="mt-3 text-sm font-semibold text-brand-ink">{busy === r.email ? "Signing in…" : "Enter"}</div>
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-center text-sm text-brand-ink">{error}</p>}

      <div className="mt-6 text-center">
        <button onClick={() => setShowManual((v) => !v)} className="text-sm font-medium text-ink-soft hover:text-ink">
          {showManual ? "Hide manual sign-in" : "Or sign in with email"}
        </button>
      </div>

      {showManual && (
        <Card className="mx-auto mt-3 w-full max-w-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              go(email, password);
            }}
            className="space-y-3 p-5"
          >
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="teacher@demo.id" required />
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="demo1234" required />
            <Button type="submit" disabled={busy !== ""} className="w-full">Sign in</Button>
          </form>
        </Card>
      )}

      <p className="mt-8 text-center text-xs text-ink-soft">
        Independent portfolio demo · synthetic data · not affiliated with any company · every login uses password <code className="rounded bg-surface px-1">demo1234</code>
      </p>
    </div>
  );
}
