import { useEffect, useState } from "react";
import { api, type ReviewTask } from "../../lib/api";
import { Button, Card, CardBody, PageTitle, Badge, Spinner, Input } from "../../components/ui";

export function TeacherReview() {
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string>("");

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

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div>
      <PageTitle
        title="Review queue"
        subtitle="The model wasn't sure it read these correctly. Confirm the answer and it re-grades automatically."
      />

      {tasks.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center text-slate-500">
            🎉 All caught up — nothing needs review.
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((t) => (
            <Card key={t.id}>
              <CardBody>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-slate-900">
                    {t.student_name} · <span className="text-slate-500">{t.homework_title}</span>
                  </div>
                  <Badge tone="amber">read confidence {(t.confidence * 100).toFixed(0)}%</Badge>
                </div>
                <div className="mb-3 rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="font-medium text-slate-800">
                    Q{t.question_no}. {t.question_text}
                  </div>
                  <div className="mt-1 text-slate-500">
                    read as “<b>{t.student_answer}</b>” · answer key: {t.correct_answer}
                  </div>
                  <div className="mt-1 text-xs text-amber-700">{t.reason}</div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      What did the student actually write?
                    </label>
                    <Input
                      value={drafts[t.id] ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [t.id]: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="success" disabled={busy === t.id} onClick={() => resolve(t, true)}>
                      ✓ Correct
                    </Button>
                    <Button variant="outline" disabled={busy === t.id} onClick={() => resolve(t, false)}>
                      ✗ Wrong
                    </Button>
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
