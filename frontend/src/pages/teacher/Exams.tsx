import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type ExamRow } from "../../lib/api";
import { Card, PageTitle, Badge, Spinner, EmptyState } from "../../components/ui";

function ExamStatusBadge({ status, flagged }: { status: string; flagged: number }) {
  if (status === "published") return <Badge tone="grow">Published</Badge>;
  if (status === "needs_review") return <Badge tone="flag">Needs review{flagged ? ` · ${flagged}` : ""}</Badge>;
  return <Badge tone="slate">Draft</Badge>;
}

export function TeacherExams() {
  const [exams, setExams] = useState<ExamRow[] | null>(null);
  useEffect(() => { api.exams().then(setExams).catch(() => setExams([])); }, []);

  if (!exams) return <div className="flex justify-center py-24"><Spinner label="Loading exams…" /></div>;

  return (
    <div>
      <PageTitle
        title="Exams"
        subtitle="Generated from your materials by the AI. Review anything flagged, then publish it to students."
      />
      {exams.length === 0 ? (
        <EmptyState
          icon="📝"
          title="No exams yet"
          body="Upload a teaching material and the AI will generate an exam here."
          action={<Link to="/teacher/materials" className="font-semibold text-brand-ink hover:underline">Upload material →</Link>}
        />
      ) : (
        <Card>
          <div className="divide-y divide-line">
            {exams.map((e) => (
              <Link
                key={e.id}
                to={`/teacher/exams/${e.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-paper"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold text-ink">{e.title}</div>
                  <div className="text-sm text-ink-soft">{e.subject} · {e.question_count} questions · {e.created_at}</div>
                </div>
                <div className="shrink-0"><ExamStatusBadge status={e.status} flagged={e.flagged} /></div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
