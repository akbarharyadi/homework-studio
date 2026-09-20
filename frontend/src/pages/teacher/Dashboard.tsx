import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, type ClassStats, type Homework, type Student } from "../../lib/api";
import {
  Button, Card, CardBody, PageTitle, Stat, StatusBadge, Spinner, Meter, Steps, EmptyState,
} from "../../components/ui";

const HOW = [
  { title: "Read", body: "Each answer is read with a confidence score." },
  { title: "Classify", body: "The subject is detected automatically." },
  { title: "Grade", body: "Correct answers are scored for you." },
  { title: "Gate", body: "Unclear reads wait for your review." },
];

function bucketColor(label: string) {
  const lo = parseInt(label, 10);
  if (lo >= 80) return "#0ea98a";
  if (lo >= 70) return "#3e63dd";
  return "#f5a524";
}

export function TeacherDashboard() {
  const [stats, setStats] = useState<ClassStats | null>(null);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [students, setStudents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.classStats(), api.homeworks(), api.students()])
      .then(([s, hw, st]) => {
        setStats(s);
        setHomeworks(hw.slice(0, 8));
        setStudents(Object.fromEntries(st.map((x: Student) => [x.id, x.name])));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-24"><Spinner label="Loading class…" /></div>;
  if (!stats) return null;

  return (
    <div>
      <PageTitle
        title="Class dashboard"
        subtitle="How the class is doing — and what needs you."
        action={<Link to="/teacher/upload"><Button size="lg">📄 Upload homework</Button></Link>}
      />

      {stats.needs_review > 0 && (
        <Card spine="flag" className="mb-6" onClick={() => navigate("/teacher/review")}>
          <CardBody className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚖️</span>
              <div>
                <div className="font-semibold text-ink">
                  {stats.needs_review} {stats.needs_review === 1 ? "answer needs" : "answers need"} your review
                </div>
                <div className="text-sm text-ink-soft">The reader wasn't sure it read these correctly.</div>
              </div>
            </div>
            <Button variant="outline" size="sm">Review now</Button>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon="🧑‍🎓" label="Students" value={stats.students} tone="info" />
        <Stat icon="✅" label="Homeworks graded" value={stats.homeworks_graded} tone="grow" />
        <Stat icon="📈" label="Class average" value={`${stats.average_percent.toFixed(0)}%`} tone="brand" />
        <Stat icon="⚖️" label="Awaiting review" value={stats.needs_review} tone="flag" />
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <div className="mb-3 text-sm font-semibold text-ink">How a homework becomes a grade</div>
        <Steps steps={HOW} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="mb-4 text-lg font-semibold text-ink">Score distribution</h3>
            {stats.homeworks_graded > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.score_buckets}>
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#5b667c" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#5b667c" }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip cursor={{ fill: "#eef1f7" }} contentStyle={{ borderRadius: 12, border: "1px solid #e3e8f0" }} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {stats.score_buckets.map((b, i) => (<Cell key={i} fill={bucketColor(b.label)} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-sm text-ink-soft">Grade a homework to see the spread.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="mb-4 text-lg font-semibold text-ink">Average by subject</h3>
            <div className="space-y-4">
              {stats.subject_averages.map((s) => (
                <div key={s.subject}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold text-ink">{s.subject}</span>
                    <span className="text-ink-soft">{s.average.toFixed(0)}%</span>
                  </div>
                  <Meter value={s.average} color={s.color} />
                </div>
              ))}
              {stats.subject_averages.length === 0 && <p className="text-sm text-ink-soft">No graded homework yet.</p>}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">Recent homework</h3>
          <Link to="/teacher/upload" className="text-sm font-semibold text-brand-ink hover:underline">Upload another</Link>
        </div>
        {homeworks.length === 0 ? (
          <EmptyState
            icon="📄"
            title="No homework yet"
            body="Upload a worksheet to watch it get read, graded, and gated in a few seconds."
            action={<Link to="/teacher/upload"><Button>Upload the first homework</Button></Link>}
          />
        ) : (
          <Card>
            <div className="divide-y divide-line">
              {homeworks.map((h) => (
                <div key={h.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">{students[h.student_id] || "—"}</div>
                    <div className="truncate text-sm text-ink-soft">{h.title}{h.detected_subject ? ` · ${h.detected_subject}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    {(h.status === "graded" || h.status === "needs_review") && (
                      <span className="font-display text-lg font-bold text-ink">{h.percent.toFixed(0)}%</span>
                    )}
                    <StatusBadge status={h.status} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
