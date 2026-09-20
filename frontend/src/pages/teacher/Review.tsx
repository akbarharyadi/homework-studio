import { useEffect, useState } from "react";
import { api, type ReviewTask } from "../../lib/api";
import { Button, Card, CardBody, PageTitle, Badge, Spinner, Input, EmptyState } from "../../components/ui";

export function TeacherReview() {
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");

  function load() {
    setLoading(true);
    api
      .reviewTasks("open")
      .then((t) => {
        setTasks(t);
        setDrafts(Object.fromEntries(t.map((x) => [x.id, x.student_answer.replace(/\(unclear\)/g, "").trim()])));
      })
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function resolve(task: ReviewTask, isCorrect: boolean) {
    setBusy(task.id);
    try {
      await api.resolveReview(task.id, drafts[task.id] ?? "", isCorrect);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } finally {
      setBusy("");
    }
  }

  if (loading) return <div className="flex justify-center py-24"><Spinner label="Loading queue…" /></div>;

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle
        title="Review queue"
        subtitle="These are the only answers the reader wasn't sure about. Confirm what the student wrote and the homework re-grades itself."
      />

      {tasks.length === 0 ? (
        <EmptyState icon="🎉" title="All caught up" body="Nothing needs review right now. New flags will appear here as homework comes in." />
      ) : (
        <div className="space-y-4">
          {tasks.map((t) => (
            <Card key={t.id} spine="flag">
              <CardBody>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold text-ink">{t.student_name} <span className="font-normal text-ink-soft">· {t.homework_title}</span></div>
                  <Badge tone="flag">read {(t.confidence * 100).toFixed(0)}% sure</Badge>
                </div>
                <div className="mb-4 rounded-xl bg-paper p-3.5 text-sm">
                  <div className="font-semibold text-ink">Q{t.question_no}. {t.question_text}</div>
                  <div className="mt-1 text-ink-soft">read as “<b className="text-ink">{t.student_answer}</b>” · answer key: {t.correct_answer}</div>
                </div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">What did the student actually write?</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input value={drafts[t.id] ?? ""} onChange={(e) => setDrafts((d) => ({ ...d, [t.id]: e.target.value }))} className="flex-1" />
                  <div className="flex gap-2">
                    <Button variant="grow" disabled={busy === t.id} onClick={() => resolve(t, true)}>✓ Correct</Button>
                    <Button variant="outline" disabled={busy === t.id} onClick={() => resolve(t, false)}>✗ Wrong</Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
