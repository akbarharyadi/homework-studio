import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, type ClassStats, type MaterialRow } from "../../lib/api";
import {
  Button, Card, CardBody, PageTitle, Stat, Spinner, Meter, Steps, EmptyState, Badge,
} from "../../components/ui";

const HOW = [
  { title: "Upload", body: "Drop in a syllabus or lesson." },
  { title: "Read", body: "The AI reads it and writes teaching notes." },
  { title: "Generate", body: "It drafts an exam grounded in your material." },
  { title: "Publish", body: "Review flagged questions, then publish." },
];

function bucketColor(label: string) {
  const lo = parseInt(label, 10);
  if (lo >= 80) return "#0ea98a";
  if (lo >= 70) return "#3e63dd";
  return "#f5a524";
}

function MaterialBadge({ status }: { status: string }) {
  if (status === "ready") return <Badge tone="grow">Ready</Badge>;
  if (status === "failed") return <Badge tone="flag">Failed</Badge>;
  return <Badge tone="info">Processing…</Badge>;
}

export function TeacherDashboard() {
  const [stats, setStats] = useState<ClassStats | null>(null);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.classStats(), api.materials()])
      .then(([s, m]) => {
        setStats(s);
        setMaterials(m.slice(0, 6));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-24"><Spinner label="Loading class…" /></div>;
  if (!stats) return null;

  return (
    <div>
      <PageTitle
        title="Class dashboard"
        subtitle="Turn your material into assessments — and see how the class is doing."
        action={<Link to="/teacher/materials"><Button size="lg">📚 Upload material</Button></Link>}
      />

      {stats.pending_review > 0 && (
        <Card spine="flag" className="mb-6" onClick={() => navigate("/teacher/exams")}>
          <CardBody className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📝</span>
              <div>
                <div className="font-semibold text-ink">
                  {stats.pending_review} AI {stats.pending_review === 1 ? "question needs" : "questions need"} your review
                </div>
                <div className="text-sm text-ink-soft">Approve or edit them before students take the exam.</div>
              </div>
            </div>
            <Button variant="outline" size="sm">Review now</Button>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon="🧑‍🎓" label="Students" value={stats.students} tone="info" />
        <Stat icon="📝" label="Exams taken" value={stats.exams_taken} tone="grow" />
        <Stat icon="📈" label="Class average" value={`${stats.average_percent.toFixed(0)}%`} tone="brand" />
        <Stat icon="⚖️" label="Awaiting review" value={stats.pending_review} tone="flag" />
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <div className="mb-3 text-sm font-semibold text-ink">How a lesson becomes an exam</div>
        <Steps steps={HOW} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="mb-4 text-lg font-semibold text-ink">Score distribution</h3>
            {stats.exams_taken > 0 ? (
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
              <p className="py-12 text-center text-sm text-ink-soft">Publish an exam and watch the scores come in.</p>
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
              {stats.subject_averages.length === 0 && <p className="text-sm text-ink-soft">No exams taken yet.</p>}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">Recent materials</h3>
          <Link to="/teacher/materials" className="text-sm font-semibold text-brand-ink hover:underline">Upload another</Link>
        </div>
        {materials.length === 0 ? (
          <EmptyState
            icon="📚"
            title="No materials yet"
            body="Upload a syllabus or lesson to generate teaching notes and an exam in a few seconds."
            action={<Link to="/teacher/materials"><Button>Upload the first material</Button></Link>}
          />
        ) : (
          <Card>
            <div className="divide-y divide-line">
              {materials.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">{m.title}</div>
                    <div className="truncate text-sm text-ink-soft">{m.subject} · {m.created_at}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <MaterialBadge status={m.status} />
                    {m.exam_id && (
                      <Link to={`/teacher/exams/${m.exam_id}`} className="text-sm font-semibold text-brand-ink hover:underline">Exam →</Link>
                    )}
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
