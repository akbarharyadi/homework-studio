import { useEffect, useState } from "react";
import { api, type Question, type Subject } from "../../lib/api";
import { Button, Card, CardBody, PageTitle, Spinner, Badge } from "../../components/ui";
import { Markdown } from "../../components/Markdown";

export function StudentPractice() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [setId, setSetId] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ percent: number; details: any[] } | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.subjects().then((s) => {
      setSubjects(s);
      if (s[0]) setSubjectId(s[0].id);
    });
    api.students().then((s) => s[0] && setStudentId(s[0].id));
  }, []);

  async function generate() {
    if (!subjectId || !studentId) return;
    setBusy(true);
    setResult(null);
    setAnswers({});
    setExplanations({});
    try {
      const gen = await api.generatePractice(studentId, subjectId, 5);
      setSetId(gen.practice_set_id);
      setQuestions(gen.questions);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    try {
      const res = await api.submitPractice(setId, answers);
      setResult(res);
    } finally {
      setBusy(false);
    }
  }

  async function explain(q: Question) {
    if (explanations[q.id]) {
      setExplanations((e) => ({ ...e, [q.id]: "" }));
      return;
    }
    const { explanation } = await api.explain(q.id);
    setExplanations((e) => ({ ...e, [q.id]: explanation }));
  }

  const detailFor = (qid: string) => result?.details.find((d) => d.question_id === qid);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <PageTitle title="Practice" subtitle="A fresh set every time — answer, then see how you did." />
        <div className="flex items-center gap-3">
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <Button onClick={generate} disabled={busy}>{questions.length ? "New set" : "Start practice"}</Button>
        </div>
      </div>

      {busy && questions.length === 0 && <div className="flex justify-center py-20"><Spinner /></div>}

      {result && (
        <Card className="mb-6">
          <CardBody className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Your score</div>
              <div className="text-3xl font-bold text-brand-600">{result.percent.toFixed(0)}%</div>
            </div>
            <div className="text-4xl">{result.percent >= 80 ? "🌟" : result.percent >= 50 ? "👍" : "💪"}</div>
          </CardBody>
        </Card>
      )}

      <div className="space-y-4">
        {questions.map((q, idx) => {
          const d = detailFor(q.id);
          return (
            <Card key={q.id}>
              <CardBody>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="font-medium text-slate-900">
                    {idx + 1}. {q.stem}
                  </div>
                  {d && (d.correct ? <Badge tone="green">correct</Badge> : <Badge tone="red">answer: {d.answer}</Badge>)}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {q.options.map((opt) => {
                    const selected = answers[q.id] === opt;
                    const isKey = d && opt === d.answer;
                    return (
                      <button
                        key={opt}
                        disabled={!!result}
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                        className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                          isKey
                            ? "border-emerald-400 bg-emerald-50"
                            : selected
                              ? "border-brand-500 bg-brand-50"
                              : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3">
                  <button onClick={() => explain(q)} className="text-sm font-medium text-brand-600 hover:underline">
                    {explanations[q.id] ? "Hide explanation" : "💡 Show me how"}
                  </button>
                  {explanations[q.id] && (
                    <div className="mt-2 rounded-lg bg-slate-50 p-3">
                      <Markdown>{explanations[q.id]}</Markdown>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {questions.length > 0 && !result && (
        <div className="mt-6">
          <Button onClick={submit} disabled={busy} className="w-full sm:w-auto">
            Submit answers
          </Button>
        </div>
      )}
    </div>
  );
}
