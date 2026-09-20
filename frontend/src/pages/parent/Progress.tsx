import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  api,
  type FamilyChild,
  type ActivityItem,
  type StudentProgress,
  type SubjectVsClass,
  type StudentReportInfo,
} from "../../lib/api";
import { subjectEmoji } from "../../lib/subjects";
import { Button, Card, CardBody, PageTitle, Stat, Spinner, StatusBadge, Meter, Badge, EmptyState } from "../../components/ui";

export function ParentProgress() {
  const [family, setFamily] = useState<FamilyChild[] | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [childId, setChildId] = useState("");
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [tip, setTip] = useState("");
  const [vs, setVs] = useState<SubjectVsClass[]>([]);
  const [report, setReport] = useState<StudentReportInfo | null>(null);

  useEffect(() => {
    api.family().then((f) => { setFamily(f); if (f[0]) setChildId(f[0].student_id); });
    api.familyActivity().then(setActivity).catch(() => {});
  }, []);

  useEffect(() => {
    if (!childId) return;
    setProgress(null); setTip(""); setVs([]); setReport(null);
    api.studentProgress(childId).then(setProgress).catch(() => {});
    api.parentTip(childId).then((r) => setTip(r.tip)).catch(() => {});
    api.compareToClass(childId).then(setVs).catch(() => {});
    api.latestReport(childId).then(setReport).catch(() => setReport(null));
  }, [childId]);

  if (!family) return <div className="flex justify-center py-24"><Spinner label="Loading…" /></div>;
  if (family.length === 0)
    return <EmptyState icon="👪" title="No children linked" body="Your children will appear here once they're enrolled." />;

  const child = family.find((c) => c.student_id === childId);
  const first = child ? child.name.split(" ")[0] : "";

  return (
    <div>
      <PageTitle
        title="My children"
        subtitle="How your children are doing — grades and effort — in plain language."
        action={childId ? <Link to={`/parent/report/${childId}`}><Button>📄 Progress report</Button></Link> : undefined}
      />

      {/* Family cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {family.map((c) => (
          <Card
            key={c.student_id}
            spine={c.needs_attention ? "flag" : "grow"}
            onClick={() => setChildId(c.student_id)}
            className={c.student_id === childId ? "ring-2 ring-brand" : ""}
          >
            <CardBody>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-display text-lg font-semibold text-ink">{c.name}</div>
                  <div className="text-xs text-ink-soft">{c.grade_level}</div>
                </div>
                {c.needs_attention ? <Badge tone="flag">needs a look</Badge> : <Badge tone="grow">on track</Badge>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-brand-soft px-2.5 py-0.5 font-semibold text-brand-ink">{c.average.toFixed(0)}% avg</span>
                <span className="rounded-full bg-flag-soft px-2.5 py-0.5 font-semibold text-[#a9701a]">🔥 {c.streak}d</span>
                <span className="rounded-full bg-grow-soft px-2.5 py-0.5 font-semibold text-grow">Lv {c.level}</span>
                <span className="rounded-full bg-paper px-2.5 py-0.5 font-semibold text-ink-soft">🏅 {c.badges}</span>
              </div>
              <div className="mt-3 space-y-2">
                {c.subjects.map((s) => (
                  <div key={s.subject}>
                    <div className="mb-0.5 flex justify-between text-xs">
                      <span className="text-ink">{subjectEmoji(s.subject)} {s.subject}</span>
                      <span className="text-ink-soft">{s.average.toFixed(0)}%</span>
                    </div>
                    <Meter value={s.average} color={s.color} />
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {child && (
        <div className="mt-8">
          <h2 className="mb-3 font-display text-xl font-bold text-ink">{first}'s progress</h2>

          {tip && (
            <Card spine="brand" className="mb-4">
              <CardBody className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <div className="font-semibold text-ink">How to help {first}</div>
                  <p className="mt-1 text-sm text-ink-soft">{tip}</p>
                </div>
              </CardBody>
            </Card>
          )}

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
                </div>
              </CardBody>
            </Card>
          )}

          <div className="grid grid-cols-3 gap-4">
            <Stat icon="📈" label="Overall average" value={`${child.average.toFixed(0)}%`} tone="brand" />
            <Stat icon="✅" label="Exams taken" value={child.exams_taken} tone="grow" />
            <Stat icon="🔥" label="Day streak" value={child.streak} tone="flag" />
          </div>

          {progress && progress.timeline.length > 0 ? (
            <>
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
                    <h3 className="mb-1 text-lg font-semibold text-ink">Compared to the class</h3>
                    <p className="mb-4 text-xs text-ink-soft">The marker shows the class average.</p>
                    <div className="space-y-4">
                      {vs.map((s) => (
                        <div key={s.subject}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="font-semibold text-ink">{subjectEmoji(s.subject)} {s.subject}</span>
                            <span className={s.delta >= 0 ? "font-medium text-grow" : "font-medium text-[#a9701a]"}>
                              {s.child.toFixed(0)}% · {s.delta >= 0 ? `▲ ${s.delta.toFixed(0)} ahead` : `▼ ${Math.abs(s.delta).toFixed(0)} behind`}
                            </span>
                          </div>
                          <div className="relative">
                            <Meter value={s.child} color={s.color} />
                            <div className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 bg-ink" style={{ left: `${Math.min(100, Math.max(0, s.class))}%` }} title={`class ${s.class.toFixed(0)}%`} />
                          </div>
                        </div>
                      ))}
                      {vs.length === 0 && <p className="text-sm text-ink-soft">No subject data yet.</p>}
                    </div>
                  </CardBody>
                </Card>
              </div>

              <Card className="mt-6">
                <CardBody>
                  <h3 className="mb-3 text-lg font-semibold text-ink">What's new</h3>
                  {activity.length === 0 ? (
                    <p className="text-sm text-ink-soft">Nothing new right now.</p>
                  ) : (
                    <div className="space-y-1">
                      {activity.map((a, i) => (
                        <div key={i} className="flex items-center gap-3 border-b border-line/60 py-2.5 text-sm last:border-0">
                          <span className="text-lg">{a.icon}</span>
                          <span className={`flex-1 ${a.kind === "alert" ? "font-medium text-[#a9701a]" : "text-ink"}`}>{a.text}</span>
                          {a.date && <span className="shrink-0 text-xs text-ink-soft">{a.date}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>

              <Card className="mt-6">
                <CardBody>
                  <h3 className="mb-3 text-lg font-semibold text-ink">Exam history</h3>
                  <div className="divide-y divide-line">
                    {progress.timeline.slice().reverse().map((t) => (
                      <div key={t.id} className="flex items-center justify-between py-3 text-sm">
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
          ) : (
            <Card className="mt-6">
              <CardBody className="py-10 text-center text-sm text-ink-soft">
                {first} hasn't taken an exam yet — once they do, you'll see trends and a report here.
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
