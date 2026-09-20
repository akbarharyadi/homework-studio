import { useEffect, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, type SchoolEngagement, type TrendPoint, type TeachingOverview } from "../../lib/api";
import { subjectEmoji } from "../../lib/subjects";
import { Card, CardBody, PageTitle, Stat, Spinner, Badge, Meter } from "../../components/ui";

function Note({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 max-w-2xl text-sm text-ink-soft">{children}</p>;
}
function ExamStatusBadge({ status }: { status: string }) {
  if (status === "published") return <Badge tone="grow">Published</Badge>;
  if (status === "needs_review") return <Badge tone="flag">Needs review</Badge>;
  return <Badge tone="slate">Draft</Badge>;
}
function barColor(v: number) {
  return v >= 80 ? "#0ea98a" : v >= 65 ? "#3e63dd" : "#f5a524";
}

export function AdminInsightsPage() {
  const [eng, setEng] = useState<SchoolEngagement | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [teach, setTeach] = useState<TeachingOverview | null>(null);

  useEffect(() => {
    api.adminEngagement().then(setEng).catch(() => {});
    api.adminTrend().then(setTrend).catch(() => {});
    api.adminTeaching().then(setTeach).catch(() => {});
  }, []);

  if (!eng || !teach) return <div className="flex justify-center py-24"><Spinner label="Loading insights…" /></div>;

  const trendData = trend.map((p) => ({ ...p, label: p.date.slice(5) }));

  return (
    <div>
      <PageTitle title="Insights" subtitle="Engagement, momentum, and the teaching pipeline — the whole school at a glance." />

      {/* Engagement */}
      <h3 className="mb-1 text-lg font-semibold text-ink">Engagement</h3>
      <Note>How much the school is actually doing — effort, not just grades (from XP, streaks and badges).</Note>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat icon="🔥" label="Active today" value={eng.active_today} tone="flag" />
        <Stat icon="⚡" label="Avg streak" value={`${eng.avg_streak.toFixed(1)}d`} tone="brand" />
        <Stat icon="✨" label="Total XP" value={eng.total_xp.toLocaleString()} tone="grow" />
        <Stat icon="🏅" label="Badges earned" value={eng.badges_awarded} tone="info" />
      </div>
      <Card className="mt-4">
        <CardBody>
          <h4 className="mb-3 font-semibold text-ink">🔥 Streak leaders</h4>
          <div className="space-y-1.5">
            {eng.leaders.map((r) => (
              <div key={r.rank} className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-5 text-center">{["🥇", "🥈", "🥉"][r.rank - 1] || r.rank}</span>
                  <span className="font-semibold text-ink">{r.name.split(" ")[0]}</span>
                </span>
                <span className="flex items-center gap-4 text-ink-soft">
                  <span>🔥 {r.streak}d</span>
                  <span>Lv {r.level}</span>
                  <span className="tabular-nums">{r.xp} XP</span>
                </span>
              </div>
            ))}
            {eng.leaders.length === 0 && <p className="text-sm text-ink-soft">No activity yet.</p>}
          </div>
        </CardBody>
      </Card>

      {/* Trend */}
      <h3 className="mb-1 mt-8 text-lg font-semibold text-ink">Trend (last 14 days)</h3>
      <Note>The school's average exam score (line) and how many exams were taken each day (bars).</Note>
      <Card>
        <CardBody>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5b667c" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="l" domain={[0, 100]} tick={{ fontSize: 11, fill: "#5b667c" }} axisLine={false} tickLine={false} width={28} />
              <YAxis yAxisId="r" orientation="right" allowDecimals={false} tick={{ fontSize: 11, fill: "#5b667c" }} axisLine={false} tickLine={false} width={24} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e3e8f0" }} />
              <Bar yAxisId="r" dataKey="count" name="exams taken" fill="#dfe6f2" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              <Line yAxisId="l" type="monotone" dataKey="avg" name="avg %" stroke="#fb6a51" strokeWidth={3} dot={{ r: 3, fill: "#fb6a51" }} connectNulls isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      {/* Teaching & exams */}
      <h3 className="mb-1 mt-8 text-lg font-semibold text-ink">Teaching &amp; exams</h3>
      <Note>The content pipeline — material in, AI-generated exams out — and how each exam is performing.</Note>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat icon="📚" label="Materials" value={teach.materials} tone="brand" />
        <Stat icon="✅" label="Published exams" value={teach.exams_published} tone="grow" />
        <Stat icon="📝" label="Drafts / in review" value={teach.exams_draft + teach.exams_review} tone="info" />
        <Stat icon="⚖️" label="Questions to review" value={teach.pending_review} tone="flag" />
      </div>
      <Card className="mt-4">
        <CardBody>
          <h4 className="mb-3 font-semibold text-ink">Per-exam performance</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="py-2 font-medium">Exam</th>
                  <th className="font-medium">Status</th>
                  <th className="font-medium">Takers</th>
                  <th className="font-medium">Average</th>
                  <th className="font-medium">Hardest question</th>
                </tr>
              </thead>
              <tbody>
                {teach.exams.map((e, i) => (
                  <tr key={i} className="border-b border-line/60">
                    <td className="py-2.5 font-semibold text-ink">{subjectEmoji(e.subject)} {e.title}</td>
                    <td><ExamStatusBadge status={e.status} /></td>
                    <td className="text-ink-soft">{e.takers}</td>
                    <td>
                      {e.takers > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-20"><Meter value={e.average} color={barColor(e.average)} /></div>
                          <span className="tabular-nums text-ink">{e.average.toFixed(0)}%</span>
                        </div>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>
                    <td className="text-ink-soft">
                      {e.hardest ? (
                        <span><span className="text-ink">{e.hardest}</span> <span className="text-xs">· {e.hardest_pct != null ? e.hardest_pct.toFixed(0) : "—"}% correct</span></span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
                {teach.exams.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-ink-soft">No exams yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
