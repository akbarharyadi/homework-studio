import { useEffect, useState } from "react";
import { api, type Question, type Subject } from "../../lib/api";
import { Button, Card, CardBody, PageTitle, Badge, Select } from "../../components/ui";
import { Markdown, MathText } from "../../components/Markdown";

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
    api.subjects().then((s) => { setSubjects(s); if (s[0]) setSubjectId(s[0].id); });
    api.students().then((s) => s[0] && setStudentId(s[0].id));
  }, []);

  async function generate() {
    if (!subjectId || !studentId) return;
    setBusy(true); setResult(null); setAnswers({}); setExplanations({});
    try {
      const gen = await api.generatePractice(studentId, subjectId, 5);
      setSetId(gen.practice_set_id); setQuestions(gen.questions);
    } finally { setBusy(false); }
  }

  async function submit() {
    setBusy(true);
    try { setResult(await api.submitPractice(setId, answers)); } finally { setBusy(false); }
  }

  async function explain(q: Question) {
    if (explanations[q.id]) { setExplanations((e) => ({ ...e, [q.id]: "" })); return; }
    const { explanation } = await api.explain(q.id);
    setExplanations((e) => ({ ...e, [q.id]: explanation }));
  }

  const detailFor = (qid: string) => result?.details.find((d) => d.question_id === qid);
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="Practice" subtitle="A fresh set every time. Answer, then see how you did — and tap “Show me how” anytime." />

      {questions.length === 0 ? (
        <Card spine="brand">
          <CardBody className="flex flex-col items-center py-12 text-center">
            <div className="text-5xl">✏️</div>
            <h3 className="mt-3 font-display text-xl font-semibold text-ink">Ready to practise?</h3>
            <p className="mt-1 text-sm text-ink-soft">Pick a subject and we'll make you 5 questions.</p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                {subjects.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </Select>
              <Button size="lg" onClick={generate} disabled={busy}>{busy ? "Making…" : "Start practice"}</Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-ink-soft">{result ? "Here's how you did:" : `${answeredCount} of ${questions.length} answered`}</div>
            <Button variant="outline" size="sm" onClick={generate} disabled={busy}>New set</Button>
          </div>

          {result && (
            <Card spine="grow" className="mb-4">
              <CardBody className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-ink-soft">You scored</div>
                  <div className="font-display text-4xl font-bold text-grow">{result.percent.toFixed(0)}%</div>
                </div>
                <div className="text-5xl">{result.percent >= 80 ? "🌟" : result.percent >= 50 ? "👍" : "💪"}</div>
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
                      <div className="font-semibold text-ink">{idx + 1}. <MathText>{q.stem}</MathText></div>
                      {d && (d.correct ? <Badge tone="grow">✓ correct</Badge> : <Badge tone="brand">answer: {d.answer}</Badge>)}
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
                            className={`rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition ${
                              isKey ? "border-grow bg-grow-soft text-ink"
                                : selected ? "border-brand bg-brand-soft text-ink"
                                : "border-line hover:border-brand hover:bg-brand-soft/40"
                            }`}
                          >
                            <MathText>{opt}</MathText>
                          </button>
                        );
                      })}
                    </div>
                    <button onClick={() => explain(q)} className="mt-3 text-sm font-semibold text-brand-ink hover:underline">
                      {explanations[q.id] ? "Hide explanation" : "💡 Show me how"}
                    </button>
                    {explanations[q.id] && <div className="mt-2 rounded-xl bg-paper p-3.5"><Markdown>{explanations[q.id]}</Markdown></div>}
                  </CardBody>
                </Card>
              );
            })}
          </div>

          {!result && (
            <Button onClick={submit} disabled={busy || answeredCount === 0} size="lg" className="mt-6 w-full">
              {answeredCount < questions.length ? `Submit (${answeredCount}/${questions.length} answered)` : "Submit answers"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
