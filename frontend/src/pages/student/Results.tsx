import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type AttemptRow } from "../../lib/api";
import { subjectEmoji } from "../../lib/subjects";
import { Card, PageTitle, Badge, Spinner, EmptyState } from "../../components/ui";

export function StudentResults() {
  const [rows, setRows] = useState<AttemptRow[] | null>(null);

  useEffect(() => {
    api.students().then((s) => s[0] && api.attempts(s[0].id).then(setRows).catch(() => setRows([])));
  }, []);

  if (!rows) return <div className="flex justify-center py-24"><Spinner label="Loading results…" /></div>;

  return (
    <div>
      <PageTitle title="My results" subtitle="Every exam and practice you've done. Open one to review your answers." />
      {rows.length === 0 ? (
        <EmptyState icon="📊" title="No results yet" body="Take an exam or practise to see your results here." />
      ) : (
        <Card>
          <div className="divide-y divide-line">
            {rows.map((a) => (
              <Link key={a.id} to={`/student/results/${a.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-paper">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-ink">{subjectEmoji(a.subject)} {a.title}</span>
                    {a.kind === "practice" && <Badge tone="slate">practice</Badge>}
                  </div>
                  <div className="text-sm text-ink-soft">{a.date}{a.total > 0 ? ` · ${a.correct}/${a.total} correct` : ""}</div>
                </div>
                <span className="shrink-0 font-display text-lg font-bold text-ink">{a.percent.toFixed(0)}%</span>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
