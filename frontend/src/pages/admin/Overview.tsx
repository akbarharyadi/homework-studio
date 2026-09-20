import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, type AdminOverview } from "../../lib/api";
import { Card, CardBody, PageTitle, Stat, Meter, Badge, Spinner, Button } from "../../components/ui";

function bucketColor(label: string) {
  const lo = parseInt(label, 10);
  if (lo >= 80) return "#0ea98a";
  if (lo >= 70) return "#3e63dd";
  return "#f5a524";
}

export function AdminOverviewPage() {
  const [o, setO] = useState<AdminOverview | null>(null);

  useEffect(() => {
    api.adminOverview().then(setO);
  }, []);

  if (!o) return <div className="flex justify-center py-24"><Spinner label="Loading school…" /></div>;

  return (
    <div>
      <PageTitle
        title="School overview"
        subtitle="Everyone's progress in one place — students, classes, and what needs attention."
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

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="mb-4 text-lg font-semibold text-ink">Score distribution</h3>
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
        <Card>
          <CardBody>
            <h3 className="mb-4 text-lg font-semibold text-ink">Average by subject</h3>
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

      <Card className="mt-6">
        <CardBody>
          <h3 className="mb-4 text-lg font-semibold text-ink">Students</h3>
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
                {o.students_rows.map((r) => (
                  <tr key={r.student_id} className="border-b border-line/60">
                    <td className="py-2.5 font-semibold text-ink">{r.name}</td>
                    <td className="text-ink-soft">{r.grade_level}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-24"><Meter value={r.average} color={r.average >= 80 ? "#0ea98a" : r.average >= 70 ? "#3e63dd" : "#f5a524"} /></div>
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
