import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, type ClassStats, type Homework, type Student } from "../../lib/api";
import { Card, CardBody, PageTitle, StatCard, StatusBadge, Spinner, Button } from "../../components/ui";

export function TeacherDashboard() {
  const [stats, setStats] = useState<ClassStats | null>(null);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [students, setStudents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.classStats(), api.homeworks(), api.students()])
      .then(([s, hw, st]) => {
        setStats(s);
        setHomeworks(hw.slice(0, 8));
        setStudents(Object.fromEntries(st.map((x: Student) => [x.id, x.name])));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!stats) return null;

  return (
    <div>
      <PageTitle title="Class dashboard" subtitle="How the class is doing, and what needs your attention." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Students" value={stats.students} />
        <StatCard label="Homeworks graded" value={stats.homeworks_graded} />
        <StatCard label="Class average" value={`${stats.average_percent.toFixed(0)}%`} />
        <Link to="/teacher/review">
          <StatCard label="Needs review" value={stats.needs_review} hint="Click to open the queue →" />
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="mb-4 font-semibold text-slate-900">Score distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.score_buckets}>
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {stats.score_buckets.map((_, i) => (
                    <Cell key={i} fill={i >= 3 ? "#10b981" : i >= 2 ? "#6366f1" : "#f59e0b"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="mb-4 font-semibold text-slate-900">Average by subject</h3>
            <div className="space-y-3">
              {stats.subject_averages.map((s) => (
                <div key={s.subject}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{s.subject}</span>
                    <span className="text-slate-500">{s.average.toFixed(0)}%</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100">
                    <div
                      className="h-2.5 rounded-full"
                      style={{ width: `${Math.min(100, s.average)}%`, backgroundColor: s.color }}
                    />
                  </div>
                </div>
              ))}
              {stats.subject_averages.length === 0 && (
                <p className="text-sm text-slate-400">No graded homework yet.</p>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardBody>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Recent homework</h3>
            <Link to="/teacher/upload">
              <Button>Upload homework</Button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="py-2">Student</th>
                  <th>Title</th>
                  <th>Subject</th>
                  <th>Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {homeworks.map((h) => (
                  <tr key={h.id} className="border-b border-slate-50">
                    <td className="py-2 font-medium text-slate-800">{students[h.student_id] || "—"}</td>
                    <td className="text-slate-600">{h.title}</td>
                    <td className="text-slate-600">{h.detected_subject || "—"}</td>
                    <td className="text-slate-600">
                      {h.status === "graded" || h.status === "needs_review" ? `${h.percent.toFixed(0)}%` : "—"}
                    </td>
                    <td><StatusBadge status={h.status} /></td>
                  </tr>
                ))}
                {homeworks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No homework yet — upload one to see the pipeline run.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
