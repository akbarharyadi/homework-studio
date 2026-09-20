import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, type Student, type StudentProgress, type StudentReportInfo } from "../../lib/api";
import { Button, Card, CardBody, PageTitle, Stat, Spinner, StatusBadge, Meter, Select, EmptyState, Badge } from "../../components/ui";

export function ParentProgress() {
  const [children, setChildren] = useState<Student[]>([]);
  const [childId, setChildId] = useState("");
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [report, setReport] = useState<StudentReportInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.students().then((s) => {
      setChildren(s);
      if (s[0]) setChildId(s[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (childId) {
      setProgress(null);
      setReport(null);
      api.studentProgress(childId).then(setProgress);
      api.latestReport(childId).then(setReport).catch(() => setReport(null));
    }
  }, [childId]);

  if (loading) return <div className="flex justify-center py-24"><Spinner label="Loading…" /></div>;

  return (
    <div>
      <PageTitle
        title="My children"
        subtitle="How your child is doing, in plain language."
        action={
          <div className="flex items-center gap-3">
            {children.length > 1 && (
              <Select value={childId} onChange={(e) => setChildId(e.target.value)}>
                {children.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </Select>
            )}
            {childId && <Link to={`/parent/report/${childId}`}><Button>📄 Progress report</Button></Link>}
          </div>
        }
      />

      {!progress ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : progress.timeline.length === 0 ? (
        <EmptyState icon="🌱" title={`${progress.student_name.split(" ")[0]} is just getting started`} body="Once homework is graded, you'll see averages, trends, and a report here." />
      ) : (
        <>
          {report && (
            <Card spine="grow" className="mb-4">
              <CardBody className="flex items-start gap-3">
                <span className="text-2xl">🗓️</span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">This week's report</span>
                    <Badge tone="grow">generated automatically</Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">{report.narrative}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    Updated {new Date(report.generated_at).toLocaleString()} · no one had to press a button
                  </p>
                </div>
              </CardBody>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <Stat icon="🧒" label={progress.grade_level} value={progress.student_name} tone="info" />
            <Stat icon="📈" label="Overall average" value={`${progress.overall_average.toFixed(0)}%`} tone="brand" />
            <Stat icon="✅" label="Homeworks done" value={progress.timeline.length} tone="grow" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardBody>
                <h3 className="mb-4 text-lg font-semibold text-ink">Progress over time</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={progress.timeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5b667c" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#5b667c" }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e3e8f0" }} />
                    <Line type="monotone" dataKey="percent" stroke="#fb6a51" strokeWidth={3} dot={{ r: 4, fill: "#fb6a51" }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h3 className="mb-4 text-lg font-semibold text-ink">Strength by subject</h3>
                <div className="space-y-4">
                  {progress.subject_averages.map((s) => (
                    <div key={s.subject}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-semibold text-ink">{s.subject}</span>
                        <span className="text-ink-soft">{s.average.toFixed(0)}%</span>
                      </div>
                      <Meter value={s.average} color={s.color} />
                    </div>
                  ))}
                  {progress.subject_averages.length === 0 && <p className="text-sm text-ink-soft">No data yet.</p>}
                </div>
              </CardBody>
            </Card>
          </div>

          <Card className="mt-6">
            <CardBody>
              <h3 className="mb-3 text-lg font-semibold text-ink">Homework history</h3>
              <div className="divide-y divide-line">
                {progress.timeline.slice().reverse().map((t) => (
                  <div key={t.homework_id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <span className="font-semibold text-ink">{t.title}</span>
                      <span className="ml-2 text-ink-soft">{t.subject} · {t.date}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display font-bold text-ink">{t.percent.toFixed(0)}%</span>
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
