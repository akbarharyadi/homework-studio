import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Gamification, type LeaderRow, type AttemptRow } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { subjectEmoji } from "../../lib/subjects";
import { Button, Card, CardBody, PageTitle, Spinner, Meter, Badge } from "../../components/ui";

// Circular XP/level progress ring.
function Ring({ pct, label, sub }: { pct: number; label: string; sub: string }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
      <svg viewBox="0 0 110 110" className="h-32 w-32 -rotate-90">
        <circle cx="55" cy="55" r={r} fill="none" stroke="#e3e8f0" strokeWidth="10" />
        <circle
          cx="55" cy="55" r={r} fill="none" stroke="#fb6a51" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-2xl font-bold leading-none text-ink">{label}</div>
        <div className="mt-0.5 text-xs text-ink-soft">{sub}</div>
      </div>
    </div>
  );
}

export function StudentHome() {
  const { user } = useAuth();
  const [g, setG] = useState<Gamification | null>(null);
  const [board, setBoard] = useState<LeaderRow[]>([]);
  const [recent, setRecent] = useState<AttemptRow[]>([]);

  useEffect(() => {
    api.students().then((s) => {
      const id = s[0]?.id;
      if (!id) return;
      api.gamification(id).then(setG);
      api.leaderboard(id).then(setBoard).catch(() => {});
      api.attempts(id).then((a) => setRecent(a.slice(0, 4))).catch(() => {});
    });
  }, []);

  if (!g) return <div className="flex justify-center py-24"><Spinner label="Loading…" /></div>;
  const first = (user?.name || "there").split(" ")[0];
  const earned = g.badges.filter((b) => b.earned).length;

  return (
    <div>
      <PageTitle title={`Hi, ${first}! 👋`} subtitle="Your learning at a glance — level up by taking exams and practising." />

      {/* Hero + leaderboard */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card spine="brand" className="lg:col-span-2">
          <CardBody className="flex flex-wrap items-center gap-6">
            <Ring pct={g.level_progress} label={`Lv ${g.level}`} sub={`${g.xp_into_level}/${g.xp_for_next} XP`} />
            <div className="min-w-0 flex-1">
              <div className="font-display text-3xl font-bold text-ink">{g.xp} XP</div>
              <div className="text-sm text-ink-soft">{g.xp_for_next - g.xp_into_level} XP to level {g.level + 1}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-flag-soft px-3 py-1 text-sm font-semibold text-[#a9701a]">🔥 {g.streak}-day streak</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-grow-soft px-3 py-1 text-sm font-semibold text-grow">🎯 {g.average.toFixed(0)}% avg</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand-ink">🏅 best {g.best.toFixed(0)}%</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/student/exams"><Button>📝 Take an exam</Button></Link>
                <Link to="/student/practice"><Button variant="outline">💪 Practise</Button></Link>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="mb-2 text-lg font-semibold text-ink">🏆 Class leaderboard</h3>
            <div className="space-y-1.5">
              {board.slice(0, 5).map((r) => (
                <div key={r.rank} className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm ${r.is_me ? "bg-brand-soft font-semibold text-brand-ink" : ""}`}>
                  <span className="flex items-center gap-2">
                    <span className="w-5 text-center">{["🥇", "🥈", "🥉"][r.rank - 1] || r.rank}</span>
                    <span className="text-ink">{r.name.split(" ")[0]}{r.is_me ? " (you)" : ""}</span>
                  </span>
                  <span className="tabular-nums text-ink-soft">{r.xp} XP</span>
                </div>
              ))}
              {board.length === 0 && <p className="text-sm text-ink-soft">No scores yet.</p>}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Badges */}
      <Card className="mt-6">
        <CardBody>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink">Badges</h3>
            <span className="text-sm text-ink-soft">{earned} of {g.badges.length} earned</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {g.badges.map((b) => (
              <div
                key={b.id}
                title={b.hint}
                className={`flex flex-col items-center rounded-xl border p-3 text-center ${b.earned ? "border-grow/40 bg-grow-soft" : "border-line bg-paper opacity-70"}`}
              >
                <div className={`text-3xl ${b.earned ? "" : "grayscale"}`}>{b.emoji}</div>
                <div className="mt-1 text-sm font-semibold text-ink">{b.name}</div>
                <div className="text-xs text-ink-soft">{b.earned ? "Earned!" : b.hint}</div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Subjects + recent results */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="mb-4 text-lg font-semibold text-ink">Your subjects</h3>
            <div className="space-y-4">
              {g.subjects.map((s) => (
                <div key={s.subject}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold text-ink">{subjectEmoji(s.subject)} {s.subject}</span>
                    <span className="text-ink-soft">{s.average.toFixed(0)}%</span>
                  </div>
                  <Meter value={s.average} color={s.color} />
                </div>
              ))}
              {g.subjects.length === 0 && <p className="text-sm text-ink-soft">Take an exam to see your subjects.</p>}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink">Recent results</h3>
              <Link to="/student/results" className="text-sm font-semibold text-brand-ink hover:underline">See all →</Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-sm text-ink-soft">Nothing yet — take an exam or practise!</p>
            ) : (
              <div className="divide-y divide-line">
                {recent.map((a) => (
                  <Link key={a.id} to={`/student/results/${a.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm transition hover:text-brand-ink">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-semibold text-ink">{a.title}</span>
                      {a.kind === "practice" && <Badge tone="slate">practice</Badge>}
                    </span>
                    <span className="shrink-0 font-display font-bold text-ink">{a.percent.toFixed(0)}%</span>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
