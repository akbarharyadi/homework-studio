import { useState } from "react";
import { api, type Question } from "../lib/api";
import { Button, Card, CardBody, Badge } from "./ui";
import { Markdown, MathText } from "./Markdown";

type Result = { percent: number; details: any[] };

// The shared take → grade → "show me how" view, used by both exams and practice.
export function QuizRunner({
  questions,
  onSubmit,
  onExit,
  xpNote,
}: {
  questions: Question[];
  onSubmit: (answers: Record<string, string>) => Promise<Result>;
  onExit?: () => void;
  xpNote?: string;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      setResult(await onSubmit(answers));
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
  const answeredCount = Object.keys(answers).length;

  return (
    <>
      {result && (
        <Card spine="grow" className="mb-4">
          <CardBody className="flex items-center justify-between">
            <div>
              <div className="text-sm text-ink-soft">You scored</div>
              <div className="font-display text-4xl font-bold text-grow">{result.percent.toFixed(0)}%</div>
              {xpNote && <div className="mt-0.5 text-xs font-semibold text-brand-ink">{xpNote}</div>}
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

      {!result ? (
        <Button onClick={submit} disabled={busy || answeredCount === 0} size="lg" className="mt-6 w-full">
          {answeredCount < questions.length ? `Submit (${answeredCount}/${questions.length} answered)` : "Submit answers"}
        </Button>
      ) : (
        onExit && <Button variant="outline" onClick={onExit} className="mt-6 w-full">Done</Button>
      )}
    </>
  );
}
