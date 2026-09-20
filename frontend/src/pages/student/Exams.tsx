import { useEffect, useState } from "react";
import { api, type PublishedExam, type Question } from "../../lib/api";
import { Button, Card, CardBody, PageTitle, Badge, Spinner, EmptyState } from "../../components/ui";
import { Markdown, MathText } from "../../components/Markdown";

export function StudentExams() {
  const [exams, setExams] = useState<PublishedExam[] | null>(null);
  const [studentId, setStudentId] = useState("");
  const [active, setActive] = useState<{ title: string } | null>(null);
  const [setId, setSetId] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ percent: number; details: any[] } | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.publishedExams().then(setExams).catch(() => setExams([]));
    api.students().then((s) => s[0] && setStudentId(s[0].id));
  }, []);

  async function start(ex: PublishedExam) {
    if (!studentId) return;
    setBusy(true);
    setResult(null);
    setAnswers({});
    setExplanations({});
    try {
      const gen = await api.startExam(ex.id, studentId);
      setSetId(gen.practice_set_id);
      setQuestions(gen.questions);
      setActive({ title: ex.title });
    } finally {
      setBusy(false);
    }
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

  // ---- Exam list ----
  if (!active) {
    if (!exams) return <div className="flex justify-center py-24"><Spinner label="Loading exams…" /></div>;
    return (
      <div>
        <PageTitle title="Your exams" subtitle="Exams your teacher published. Take one, then see how you did — and tap “Show me how” anytime." />
        {exams.length === 0 ? (
          <EmptyState icon="📝" title="No exams yet" body="When your teacher publishes an exam, it'll show up here." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {exams.map((e) => (
              <Card key={e.id} spine="brand">
                <CardBody>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-lg font-semibold text-ink">{e.title}</h3>
                    <Badge tone="brand">{e.subject}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">{e.question_count} questions</p>
                  <Button className="mt-4 w-full" onClick={() => start(e)} disabled={busy}>{busy ? "Starting…" : "Start exam"}</Button>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---- Taking / result ----
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle
        title={active.title}
        subtitle="Answer each question, then submit to see how you did."
        action={<Button variant="outline" size="sm" onClick={() => setActive(null)}>← All exams</Button>}
      />

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
    </div>
  );
}
