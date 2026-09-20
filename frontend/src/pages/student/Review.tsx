import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, type AttemptReview } from "../../lib/api";
import { Card, CardBody, PageTitle, Badge, Spinner } from "../../components/ui";
import { Markdown, MathText } from "../../components/Markdown";

export function StudentReview() {
  const { id = "" } = useParams();
  const [rv, setRv] = useState<AttemptReview | null>(null);

  useEffect(() => { api.attemptReview(id).then(setRv).catch(() => setRv(null)); }, [id]);

  if (!rv) return <div className="flex justify-center py-24"><Spinner label="Loading…" /></div>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3"><Link to="/student/results" className="text-sm font-semibold text-brand-ink hover:underline">← All results</Link></div>
      <PageTitle title={rv.title} subtitle={`You scored ${rv.percent.toFixed(0)}% — here's every question with the right answer.`} />
      {rv.items.length === 0 ? (
        <Card><CardBody className="py-10 text-center text-sm text-ink-soft">Details aren't available for this attempt — take a fresh exam or practice to see a full review.</CardBody></Card>
      ) : (
        <div className="space-y-4">
          {rv.items.map((it, i) => {
            const q = it.question;
            return (
              <Card key={q.id} spine={it.correct ? "grow" : "flag"}>
                <CardBody>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="font-semibold text-ink">{i + 1}. <MathText>{q.stem}</MathText></div>
                    {it.correct ? <Badge tone="grow">✓ correct</Badge> : <Badge tone="flag">✗ missed</Badge>}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {q.options.map((opt) => {
                      const isKey = opt === q.answer;
                      const isPick = opt === it.selected;
                      return (
                        <div
                          key={opt}
                          className={`rounded-xl border px-3.5 py-2 text-sm ${
                            isKey ? "border-grow bg-grow-soft font-medium text-ink"
                              : isPick ? "border-flag bg-flag-soft text-ink"
                              : "border-line text-ink-soft"
                          }`}
                        >
                          <MathText>{opt}</MathText>
                          {isKey ? " ✓" : isPick ? " ← your answer" : ""}
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && <div className="mt-2 rounded-xl bg-paper p-3 text-sm"><Markdown>{q.explanation}</Markdown></div>}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
