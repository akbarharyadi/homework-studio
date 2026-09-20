import { useEffect, useState } from "react";
import { api, type Subject, type Question } from "../../lib/api";
import { Button, Card, CardBody, PageTitle, Select } from "../../components/ui";
import { QuizRunner } from "../../components/QuizRunner";

const DIFFS = [
  { id: "", label: "Mixed" },
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];

export function StudentPractice() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [studentId, setStudentId] = useState("");
  const [active, setActive] = useState<{ setId: string; questions: Question[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.subjects().then((s) => { setSubjects(s); if (s[0]) setSubjectId(s[0].id); });
    api.students().then((s) => s[0] && setStudentId(s[0].id));
  }, []);

  async function start() {
    if (!subjectId || !studentId) return;
    setBusy(true);
    setError("");
    try {
      const gen = await api.generatePractice(studentId, subjectId, difficulty, 5);
      setActive({ setId: gen.practice_set_id, questions: gen.questions });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start practice");
    } finally {
      setBusy(false);
    }
  }

  if (active) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageTitle
          title="Practice"
          subtitle="Low-stakes — this earns XP and keeps your streak, but isn't counted in your grades."
          action={<Button variant="outline" size="sm" onClick={() => setActive(null)}>← Back</Button>}
        />
        <QuizRunner
          questions={active.questions}
          onSubmit={(a) => api.submitPractice(active.setId, a)}
          onExit={() => setActive(null)}
          xpNote="Nice — practice earns XP! ⚡"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="Practice" subtitle="Drill at your own pace. Earns XP, keeps your streak alive — and never counts against your grade." />
      <Card spine="brand">
        <CardBody className="flex flex-col items-center py-12 text-center">
          <div className="text-5xl">💪</div>
          <h3 className="mt-3 font-display text-xl font-semibold text-ink">Ready to practise?</h3>
          <p className="mt-1 text-sm text-ink-soft">Pick a subject and level — we'll make you 5 questions.</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {subjects.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </Select>
            <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {DIFFS.map((d) => (<option key={d.id} value={d.id}>{d.label}</option>))}
            </Select>
            <Button size="lg" onClick={start} disabled={busy}>{busy ? "Making…" : "Start practice"}</Button>
          </div>
          {error && <p className="mt-3 text-sm text-brand-ink">{error}</p>}
        </CardBody>
      </Card>
    </div>
  );
}
