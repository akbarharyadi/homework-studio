import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, type Student, type StudentProgress } from "../../lib/api";
import { Button, Card, CardBody, PageTitle, StatCard, Spinner, StatusBadge } from "../../components/ui";

export function ParentProgress() {
  const [children, setChildren] = useState<Student[]>([]);
  const [childId, setChildId] = useState("");
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.students().then((s) => {
      setChildren(s);
      if (s[0]) setChildId(s[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (childId) api.studentProgress(childId).then(setProgress);
  }, [childId]);

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <PageTitle title="My children" subtitle="How your child is doing, in plain language." />
        <div className="flex items-center gap-3">
          {children.length > 1 && (
            <select
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          {childId && (
            <Link to={`/parent/report/${childId}`}>
              <Button>📄 Progress report</Button>
            </Link>
          )}
        </div>
      </div>

      {!progress ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <StatCard label="Child" value={progress.student_name} hint={progress.grade_level} />
            <StatCard label="Overall average" value={`${progress.overall_average.toFixed(0)}%`} />
            <StatCard label="Homeworks" value={progress.timeline.length} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardBody>
                <h3 className="mb-4 font-semibold text-slate-900">Progress over time</h3>
                {progress.timeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={progress.timeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="percent" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-slate-400">No graded homework yet.</p>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h3 className="mb-4 font-semibold text-slate-900">Strength by subject</h3>
                <div className="space-y-3">
                  {progress.subject_averages.map((s) => (
                    <div key={s.subject}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium text-slate-700">{s.subject}</span>
                        <span className="text-slate-500">{s.average.toFixed(0)}%</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-slate-100">
                        <div className="h-2.5 rounded-full" style={{ width: `${Math.min(100, s.average)}%`, backgroundColor: s.color }} />
                      </div>
                    </div>
                  ))}
                  {progress.subject_averages.length === 0 && <p className="text-sm text-slate-400">No data yet.</p>}
                </div>
              </CardBody>
            </Card>
          </div>

          <Card className="mt-6">
            <CardBody>
              <h3 className="mb-4 font-semibold text-slate-900">Homework history</h3>
              <div className="space-y-2">
                {progress.timeline.slice().reverse().map((t) => (
                  <div key={t.homework_id} className="flex items-center justify-between border-b border-slate-50 py-2 text-sm">
                    <div>
                      <span className="font-medium text-slate-800">{t.title}</span>
                      <span className="ml-2 text-slate-400">{t.subject} · {t.date}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-slate-700">{t.percent.toFixed(0)}%</span>
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
