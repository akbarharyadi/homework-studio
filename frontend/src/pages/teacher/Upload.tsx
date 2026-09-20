import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Link } from "react-router-dom";
import { api, type HomeworkItem, type Student } from "../../lib/api";
import { Button, Card, CardBody, PageTitle, StatusBadge, Spinner, Badge } from "../../components/ui";

type Phase = "idle" | "uploading" | "processing" | "done" | "error";

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

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "image/*": [".png", ".jpg", ".jpeg"] },
    maxFiles: 1,
  });

  async function upload() {
    if (!file || !studentId) return;
    setPhase("uploading");
    setError("");
    setItems([]);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("student_id", studentId);
      form.append("title", file.name.replace(/\.[^.]+$/, ""));
      const { id } = await api.uploadHomework(form);
      setPhase("processing");

      // Poll the cheap status endpoint (like the DocumentIngest console).
      for (let i = 0; i < 30; i++) {
        const st = await api.homeworkStatus(id);
        setStatus(st.status);
        if (st.status === "needs_review" || st.status === "graded" || st.status === "failed") {
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

  return (
    <div>
      <PageTitle
        title="Upload homework"
        subtitle="Drop a worksheet — it's read, auto-graded, and anything unclear is flagged for you."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Student</label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.grade_level}
                  </option>
                ))}
              </select>
            </div>

            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
                isDragActive ? "border-brand-500 bg-brand-50" : "border-slate-300 hover:border-brand-400"
              }`}
            >
              <input {...getInputProps()} />
              <div className="text-3xl">📄</div>
              {file ? (
                <p className="mt-2 text-sm font-medium text-slate-800">{file.name}</p>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  Drag a PDF or photo here, or click to choose. <br />
                  <span className="text-xs">Tip: name it with “math” or “science” to see subject detection.</span>
                </p>
              )}
            </div>

            <Button onClick={upload} disabled={!file || phase === "uploading" || phase === "processing"} className="w-full">
              {phase === "uploading" || phase === "processing" ? "Processing…" : "Upload & grade"}
            </Button>
            {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="mb-1 font-semibold text-slate-900">What happens after upload</h3>
            <ol className="mb-4 list-inside list-decimal space-y-1 text-sm text-slate-500">
              <li>Read — each question &amp; answer with a confidence score</li>
              <li>Classify — subject detected (jev / TypeAI when configured)</li>
              <li>Grade — correct answers scored automatically</li>
              <li>Gate — low-confidence reads open a teacher review task</li>
            </ol>

            {(phase === "processing" || phase === "uploading") && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Spinner /> {status ? `status: ${status}` : "starting…"}
              </div>
            )}

            {phase === "done" && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <StatusBadge status={status} />
                  {status === "needs_review" && (
                    <Link to="/teacher/review" className="text-sm font-medium text-brand-600 hover:underline">
                      → open review queue
                    </Link>
                  )}
                </div>
                <div className="space-y-2">
                  {items.map((it) => (
                    <div
                      key={it.id}
                      className={`rounded-lg border p-3 text-sm ${
                        it.needs_review ? "border-amber-200 bg-amber-50" : "border-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-800">
                          Q{it.question_no}. {it.question_text}
                        </span>
                        {it.needs_review ? (
                          <Badge tone="amber">review · {(it.confidence * 100).toFixed(0)}%</Badge>
                        ) : it.is_correct ? (
                          <Badge tone="green">correct</Badge>
                        ) : (
                          <Badge tone="red">wrong</Badge>
                        )}
                      </div>
                      <div className="mt-1 text-slate-500">
                        answered <b>{it.student_answer}</b> · key {it.correct_answer}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
