import { useEffect, useState } from "react";
import { api, type PublishedExam, type Question } from "../../lib/api";
import { subjectEmoji } from "../../lib/subjects";
import { Button, Card, CardBody, PageTitle, Badge, Spinner, EmptyState } from "../../components/ui";
import { QuizRunner } from "../../components/QuizRunner";

export function StudentExams() {
  const [exams, setExams] = useState<PublishedExam[] | null>(null);
  const [studentId, setStudentId] = useState("");
  const [active, setActive] = useState<{ title: string; setId: string; questions: Question[] } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.publishedExams().then(setExams).catch(() => setExams([]));
    api.students().then((s) => s[0] && setStudentId(s[0].id));
  }, []);

  async function start(ex: PublishedExam) {
    if (!studentId) return;
    setBusy(true);
    try {
      const gen = await api.startExam(ex.id, studentId);
      setActive({ title: ex.title, setId: gen.practice_set_id, questions: gen.questions });
    } finally {
      setBusy(false);
    }
  }

  if (active) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageTitle
          title={active.title}
          subtitle="Answer each question, then submit to see how you did."
          action={<Button variant="outline" size="sm" onClick={() => setActive(null)}>← All exams</Button>}
        />
        <QuizRunner
          questions={active.questions}
          onSubmit={(a) => api.submitPractice(active.setId, a)}
          onExit={() => setActive(null)}
        />
      </div>
    );
  }

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
                  <h3 className="font-display text-lg font-semibold text-ink">{subjectEmoji(e.subject)} {e.title}</h3>
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
