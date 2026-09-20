import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, type AdminOverview, type AdminStudentRow } from "../../lib/api";
import { Card, CardBody, PageTitle, Stat, Meter, Badge, Spinner, Button } from "../../components/ui";

function bucketColor(label: string) {
  const lo = parseInt(label, 10);
  if (lo >= 80) return "#0ea98a";
  if (lo >= 70) return "#3e63dd";
  return "#f5a524";
}

// Explanatory helper under a section heading.
function Note({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 max-w-2xl text-sm text-ink-soft">{children}</p>;
}

export function AdminOverviewPage() {
  const [o, setO] = useState<AdminOverview | null>(null);

  useEffect(() => {
    api.adminOverview().then(setO);
  }, []);

  if (!o) return <div className="flex justify-center py-24"><Spinner label="Loading school…" /></div>;

  // Derived analytics (research-backed): mastery bands, early-warning, top performers.
  const withData = o.students_rows.filter((r) => r.homeworks > 0);
  const mastered = withData.filter((r) => r.average >= 80);
  const onTrack = withData.filter((r) => r.average >= 65 && r.average < 80);
  const needsSupport = withData.filter((r) => r.average < 65);
  const atRisk = [...needsSupport].sort((a, b) => a.average - b.average);
  const top = [...withData].sort((a, b) => b.average - a.average).slice(0, 3);
  const total = withData.length || 1;
  const bands = [
    { label: "Mastered", n: mastered.length, color: "#0ea98a", hint: "80%+" },
    { label: "On track", n: onTrack.length, color: "#3e63dd", hint: "65–79%" },
    { label: "Needs support", n: needsSupport.length, color: "#f5a524", hint: "below 65%" },
  ];

  return (
    <div>
      <PageTitle
        title="School overview"
        subtitle="Everyone's progress in one place — with the students who need attention surfaced first."
        action={<Link to="/admin/automation"><Button variant="outline">⚙️ Automation</Button></Link>}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat icon="🧑‍🎓" label="Students" value={o.students} tone="info" />
        <Stat icon="🧑‍🏫" label="Teachers" value={o.teachers} tone="brand" />
        <Stat icon="👪" label="Parents" value={o.parents} tone="grow" />
        <Stat icon="📈" label="Class average" value={`${o.average_percent.toFixed(0)}%`} tone="brand" />
        <Stat icon="✅" label="Homeworks graded" value={o.homeworks_graded} tone="grow" />
        <Stat icon="🗓️" label="Auto-generated reports" value={o.reports_generated} tone="flag" />
      </div>

      {/* Mastery + early warning */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody>
            <h3 className="text-lg font-semibold text-ink">Mastery at a glance</h3>
            <Note>How the class splits across mastery bands — so you can see the shape of the whole school, not just an average.</Note>
            <div className="flex h-5 overflow-hidden rounded-full">
              {bands.map((b) => (
                <div key={b.label} style={{ width: `${(b.n / total) * 100}%`, background: b.color }} title={`${b.label}: ${b.n}`} />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {bands.map((b) => (
                <div key={b.label} className="rounded-xl border border-line p-3">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: b.color }} />
                    <span className="font-display text-2xl font-bold text-ink">{b.n}</span>
                  </div>
                  <div className="mt-0.5 text-sm font-medium text-ink">{b.label}</div>
                  <div className="text-xs text-ink-soft">{b.hint}</div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card spine={atRisk.length > 0 ? "flag" : "grow"}>
          <CardBody>
            <h3 className="text-lg font-semibold text-ink">Needs attention</h3>
            <Note>Students below 65% — worth a check-in before they fall behind.</Note>
            {atRisk.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-soft">🎉 Everyone's on track right now.</p>
            ) : (
              <div className="space-y-2">
                {atRisk.slice(0, 5).map((r) => (
                  <div key={r.student_id} className="flex items-center justify-between rounded-lg bg-flag-soft px-3 py-2">
                    <div>
                      <div className="font-semibold text-ink">{r.name}</div>
                      <div className="text-xs text-ink-soft">{r.grade_level} · {r.homeworks} homeworks</div>
                    </div>
                    <Badge tone="flag">{r.average.toFixed(0)}%</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Top performers + subject averages */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold text-ink">Top performers</h3>
            <Note>Recognise the students doing brilliantly this period.</Note>
            <div className="space-y-2">
              {top.map((r, i) => (
                <div key={r.student_id} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5">
                  <span className="text-xl">{["🥇", "🥈", "🥉"][i] || "⭐"}</span>
                  <span className="flex-1 font-semibold text-ink">{r.name}</span>
                  <Badge tone="grow">{r.average.toFixed(0)}%</Badge>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold text-ink">Average by subject</h3>
            <Note>Which subjects the school is strong in — and which need focus.</Note>
            <div className="space-y-4">
              {o.subject_averages.map((s) => (
                <div key={s.subject}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold text-ink">{s.subject}</span>
                    <span className="text-ink-soft">{s.average.toFixed(0)}%</span>
                  </div>
                  <Meter value={s.average} color={s.color} />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Distribution */}
      <Card className="mt-6">
        <CardBody>
          <h3 className="text-lg font-semibold text-ink">Score distribution</h3>
          <Note>How many homeworks land in each score band — a healthy class leans right (green).</Note>
          {o.homeworks_graded > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={o.score_buckets}>
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#5b667c" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#5b667c" }} axisLine={false} tickLine={false} width={24} />
                <Tooltip cursor={{ fill: "#eef1f7" }} contentStyle={{ borderRadius: 12, border: "1px solid #e3e8f0" }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {o.score_buckets.map((b, i) => (<Cell key={i} fill={bucketColor(b.label)} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-ink-soft">No graded homework yet.</p>
          )}
        </CardBody>
      </Card>

      {/* Full roster */}
      <Card className="mt-6">
        <CardBody>
          <h3 className="text-lg font-semibold text-ink">All students</h3>
          <Note>The full roster — sorted by average, with anyone needing review flagged.</Note>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="py-2 font-medium">Student</th>
                  <th className="font-medium">Grade</th>
                  <th className="font-medium">Average</th>
                  <th className="font-medium">Homeworks</th>
                  <th className="font-medium">Needs review</th>
                  <th className="font-medium">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {o.students_rows.map((r: AdminStudentRow) => (
                  <tr key={r.student_id} className="border-b border-line/60">
                    <td className="py-2.5 font-semibold text-ink">{r.name}</td>
                    <td className="text-ink-soft">{r.grade_level}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-24"><Meter value={r.average} color={r.average >= 80 ? "#0ea98a" : r.average >= 65 ? "#3e63dd" : "#f5a524"} /></div>
                        <span className="tabular-nums text-ink">{r.average.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="text-ink-soft">{r.homeworks}</td>
                    <td>{r.needs_review > 0 ? <Badge tone="flag">{r.needs_review}</Badge> : <span className="text-ink-soft">—</span>}</td>
                    <td className="text-ink-soft">{r.last_activity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
