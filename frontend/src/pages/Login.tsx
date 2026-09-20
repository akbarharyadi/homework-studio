import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button, Card, CardBody, Input } from "../components/ui";
import type { Role } from "../lib/api";

const HOME: Record<Role, string> = {
  admin: "/teacher",
  teacher: "/teacher",
  parent: "/parent",
  student: "/student",
};

const DEMO = [
  { role: "Teacher", email: "teacher@demo.id", emoji: "🧑‍🏫" },
  { role: "Parent", email: "parent@demo.id", emoji: "👪" },
  { role: "Student", email: "student@demo.id", emoji: "🧒" },
];

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("teacher@demo.id");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent, em = email, pw = password) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = await login(em, pw);
      navigate(HOME[user.role]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-emerald-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-3xl">
            📚
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Homework Studio</h1>
          <p className="mt-1 text-sm text-slate-500">
            Homework in → graded, gated, and turned into a warm progress report.
          </p>
        </div>

        <Card>
          <CardBody>
            <form onSubmit={(e) => submit(e)} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
              </div>
              {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
              <div className="h-px flex-1 bg-slate-200" /> demo logins <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  onClick={(e) => submit(e, d.email, "demo1234")}
                  className="rounded-lg border border-slate-200 py-2 text-center text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <div className="text-xl">{d.emoji}</div>
                  {d.role}
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
        <p className="mt-4 text-center text-xs text-slate-400">
          Independent portfolio demo · not affiliated with any company · password <code>demo1234</code>
        </p>
      </div>
    </div>
  );
}
