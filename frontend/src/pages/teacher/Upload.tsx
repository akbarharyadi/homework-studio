import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Link } from "react-router-dom";
import { api, type HomeworkItem, type Student } from "../../lib/api";
import { Button, Card, CardBody, PageTitle, StatusBadge, Spinner, Badge, Select } from "../../components/ui";

type Phase = "idle" | "working" | "done" | "error";

export function TeacherUpload() {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [items, setItems] = useState<HomeworkItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.students().then((s) => {
      setStudents(s);
      if (s[0]) setStudentId(s[0].id);
    });
  }, []);

  const onDrop = useCallback((accepted: File[]) => accepted[0] && setFile(accepted[0]), []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "image/*": [".png", ".jpg", ".jpeg"] },
    maxFiles: 1,
  });

  async function upload() {
    if (!file || !studentId) return;
    setPhase("working");
    setError("");
    setItems([]);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("student_id", studentId);
      form.append("title", file.name.replace(/\.[^.]+$/, ""));
      const { id } = await api.uploadHomework(form);
      for (let i = 0; i < 30; i++) {
        const st = await api.homeworkStatus(id);
        setStatus(st.status);
        if (["needs_review", "graded", "failed"].includes(st.status)) {
          const detail = await api.homework(id);
          setItems(detail.items);
          setPhase("done");
          return;
        }
        await new Promise((r) => setTimeout(r, 500));
      }
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPhase("error");
    }
  }

  const flagged = items.filter((i) => i.needs_review).length;

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="Upload homework" subtitle="Drop a worksheet. It's read, graded, and anything unclear is flagged for you — usually in a couple of seconds." />

      <Card spine="brand">
        <CardBody className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink">Whose homework is this?</label>
            <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full">
              {students.map((s) => (<option key={s.id} value={s.id}>{s.name} · {s.grade_level}</option>))}
            </Select>
          </div>

          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
              isDragActive ? "border-brand bg-brand-soft" : file ? "border-grow bg-grow-soft" : "border-line hover:border-brand hover:bg-brand-soft/40"
            }`}
          >
            <input {...getInputProps()} />
            <div className="text-4xl">{file ? "📎" : "📄"}</div>
            {file ? (
              <p className="mt-2 font-semibold text-ink">{file.name}</p>
            ) : (
              <>
                <p className="mt-2 font-semibold text-ink">Drop a PDF or photo here</p>
                <p className="mt-0.5 text-sm text-ink-soft">or click to choose a file</p>
                <p className="mt-2 text-xs text-ink-soft">Tip: name it with “math” or “science” to see subject detection.</p>
              </>
            )}
          </div>

          <Button onClick={upload} disabled={!file || phase === "working"} size="lg" className="w-full">
            {phase === "working" ? "Reading & grading…" : "Upload & grade"}
          </Button>
          {error && <p className="rounded-xl bg-brand-soft px-3 py-2 text-sm text-brand-ink">{error}</p>}
          {phase === "working" && (
            <div className="flex justify-center pt-1"><Spinner label={status ? `status: ${status.replace("_", " ")}` : "starting…"} /></div>
          )}
        </CardBody>
      </Card>

      {phase === "done" && (
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-ink">Result</h3>
            <div className="flex items-center gap-2">
              <StatusBadge status={status} />
              {status === "needs_review" && (
                <Link to="/teacher/review"><Button variant="outline" size="sm">Review {flagged} flagged →</Button></Link>
              )}
            </div>
          </div>
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 ${it.needs_review ? "border-flag/40 bg-flag-soft" : "border-line bg-surface"}`}>
                <div className="min-w-0">
                  <div className="font-semibold text-ink">Q{it.question_no}. {it.question_text}</div>
                  <div className="text-sm text-ink-soft">answered <b className="text-ink">{it.student_answer}</b> · key {it.correct_answer}</div>
                </div>
                {it.needs_review ? (
                  <Badge tone="flag">review · {(it.confidence * 100).toFixed(0)}%</Badge>
                ) : it.is_correct ? (
                  <Badge tone="grow">✓ correct</Badge>
                ) : (
                  <Badge tone="brand">✗ wrong</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
