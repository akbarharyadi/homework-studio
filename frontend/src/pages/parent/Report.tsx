import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, type StudentProgress } from "../../lib/api";
import { Button, Spinner } from "../../components/ui";

// A print-friendly progress report. "Save as PDF" uses the browser print dialog
// against the print stylesheet — the same approach as DocumentIngest's manual,
// so the PDF can never drift from what parents see on screen.
export function ParentReport() {
  const { studentId = "" } = useParams();
  const [p, setP] = useState<StudentProgress | null>(null);

  useEffect(() => {
    if (studentId) api.studentProgress(studentId).then(setP);
  }, [studentId]);

  if (!p) return <div className="flex justify-center py-20"><Spinner /></div>;

  const best = [...p.subject_averages].sort((a, b) => b.average - a.average)[0];
  const focus = [...p.subject_averages].sort((a, b) => a.average - b.average)[0];
  const today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link to="/parent" className="text-sm font-medium text-brand-600 hover:underline">← Back</Link>
        <Button onClick={() => window.print()}>🖨️ Save as PDF</Button>
      </div>

      <div className="report mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-10 shadow-sm print:border-0 print:shadow-none">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📚</span>
            <span className="text-lg font-bold">Homework Studio</span>
          </div>
          <div className="text-right text-xs text-slate-400">Progress report · {today}</div>
        </div>

        <h1 className="mt-6 text-2xl font-bold text-slate-900">{p.student_name}</h1>
        <p className="text-sm text-slate-500">{p.grade_level}</p>

        <p className="mt-5 leading-relaxed text-slate-700">
          {p.student_name.split(" ")[0]} has completed <b>{p.timeline.length}</b> homework
          {p.timeline.length === 1 ? "" : "s"} with an overall average of <b>{p.overall_average.toFixed(0)}%</b>.
          {best && ` Strongest in ${best.subject} (${best.average.toFixed(0)}%).`}
          {focus && best && focus.subject !== best.subject &&
            ` A good area to keep practising is ${focus.subject}.`}{" "}
          Keep up the great effort! 🌟
        </p>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-slate-50 p-4 text-center">
            <div className="text-2xl font-bold text-brand-600">{p.overall_average.toFixed(0)}%</div>
            <div className="text-xs text-slate-500">Overall average</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{p.timeline.length}</div>
            <div className="text-xs text-slate-500">Homeworks done</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 text-center">
            <div className="text-2xl font-bold text-slate-700">{best ? best.subject : "—"}</div>
            <div className="text-xs text-slate-500">Top subject</div>
          </div>
        </div>

        <h2 className="mt-8 mb-2 font-semibold text-slate-900">By subject</h2>
        <div className="space-y-2">
          {p.subject_averages.map((s) => (
            <div key={s.subject}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium text-slate-700">{s.subject}</span>
                <span className="text-slate-500">{s.average.toFixed(0)}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100">
                <div className="h-2.5 rounded-full" style={{ width: `${Math.min(100, s.average)}%`, backgroundColor: s.color }} />
              </div>
            </div>
          ))}
        </div>

        <h2 className="mt-8 mb-2 font-semibold text-slate-900">Homework history</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-1">Date</th><th>Title</th><th>Subject</th><th className="text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {p.timeline.map((t) => (
              <tr key={t.homework_id} className="border-b border-slate-50">
                <td className="py-1 text-slate-500">{t.date}</td>
                <td className="text-slate-800">{t.title}</td>
                <td className="text-slate-600">{t.subject}</td>
                <td className="text-right font-medium text-slate-700">{t.percent.toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-400">
          Generated by Homework Studio. This is an independent portfolio demo with synthetic data.
        </p>
      </div>
    </div>
  );
}
