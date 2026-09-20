import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, type Exam, type Question } from "../../lib/api";
import { Button, Card, CardBody, PageTitle, Badge, Spinner } from "../../components/ui";
import { Markdown, MathText } from "../../components/Markdown";

export function TeacherExamReview() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [busy, setBusy] = useState(false);

  const load = () => api.exam(id).then((d) => { setExam(d.exam); setQuestions(d.questions); }).catch(() => {});
  useEffect(() => { load(); }, [id]);

  async function publish() {
    setBusy(true);
    try { await api.publishExam(id); navigate("/teacher/exams"); } finally { setBusy(false); }
  }
  async function discard(qid: string) {
    setBusy(true);
    try { await api.discardExamQuestion(id, qid); await load(); } finally { setBusy(false); }
  }

  if (!exam) return <div className="flex justify-center py-24"><Spinner label="Loading exam…" /></div>;
  const flagged = questions.filter((q) => q.needs_review && !q.approved).length;
  const published = exam.status === "published";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-3"><Link to="/teacher/exams" className="text-sm font-semibold text-brand-ink hover:underline">← All exams</Link></div>
      <PageTitle
        title={exam.title}
        subtitle={
          published
            ? "Published — students can take this exam."
            : "Review the AI-generated questions. Flagged ones are the model's least-confident reads — check them, drop any that are wrong, then publish."
        }
        action={!published ? <Button onClick={publish} disabled={busy}>✓ Approve &amp; publish</Button> : <Badge tone="grow">Published</Badge>}
      />

      {!published && flagged > 0 && (
        <Card spine="flag" className="mb-4">
          <CardBody className="text-sm text-ink">
            <b>{flagged}</b> {flagged === 1 ? "question is" : "questions are"} flagged as low-confidence — worth a look before publishing.
          </CardBody>
        </Card>
      )}

      <div className="space-y-3">
        {questions.map((q, i) => {
          const flag = q.needs_review && !q.approved;
          return (
            <Card key={q.id} spine={flag ? "flag" : undefined}>
              <CardBody>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="font-semibold text-ink">{i + 1}. <MathText>{q.stem}</MathText></div>
                  {flag ? (
                    <Badge tone="flag">review · {Math.round((q.confidence ?? 0) * 100)}%</Badge>
                  ) : (
                    <Badge tone="grow">✓ {Math.round((q.confidence ?? 1) * 100)}%</Badge>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {q.options.map((opt) => {
                    const correct = opt === q.answer;
                    return (
                      <div
                        key={opt}
                        className={`rounded-xl border px-3.5 py-2 text-sm ${correct ? "border-grow bg-grow-soft font-medium text-ink" : "border-line text-ink-soft"}`}
                      >
                        <MathText>{opt}</MathText>{correct ? " ✓" : ""}
                      </div>
                    );
                  })}
                </div>
                {q.explanation && <div className="mt-2 rounded-xl bg-paper p-3 text-sm"><Markdown>{q.explanation}</Markdown></div>}
                {!published && (
                  <button onClick={() => discard(q.id)} disabled={busy} className="mt-3 text-sm font-semibold text-ink-soft hover:text-brand-ink">
                    Discard this question
                  </button>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
