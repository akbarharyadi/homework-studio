import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Link } from "react-router-dom";
import { api, type MaterialRow, type Subject } from "../../lib/api";
import { Button, Card, CardBody, PageTitle, Spinner, Select, Badge, EmptyState } from "../../components/ui";

type Phase = "idle" | "working" | "done" | "error";

function MaterialBadge({ status }: { status: string }) {
  if (status === "ready") return <Badge tone="grow">Ready</Badge>;
  if (status === "failed") return <Badge tone="flag">Failed</Badge>;
  return <Badge tone="info">Processing…</Badge>;
}

export function TeacherMaterials() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [materials, setMaterials] = useState<MaterialRow[]>([]);

  const load = () => api.materials().then(setMaterials).catch(() => {});
  useEffect(() => {
    api.subjects().then((s) => { setSubjects(s); if (s[0]) setSubjectId(s[0].id); });
    load();
  }, []);

  const onDrop = useCallback((accepted: File[]) => accepted[0] && setFile(accepted[0]), []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
    },
    maxFiles: 1,
  });

  async function upload() {
    if (!file || !subjectId) return;
    setPhase("working");
    setError("");
    setStatus("uploading");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("subject_id", subjectId);
      form.append("title", title || file.name.replace(/\.[^.]+$/, ""));
      const { id } = await api.uploadMaterial(form);
      for (let i = 0; i < 120; i++) {
        const st = await api.materialStatus(id);
        setStatus(st.status);
        if (st.status === "ready" || st.status === "failed") {
          setPhase("done");
          setFile(null);
          setTitle("");
          load();
          return;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      setPhase("done");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPhase("error");
    }
  }

  return (
    <div>
      <PageTitle
        title="Teaching material"
        subtitle="Upload a syllabus or lesson. The AI reads it, writes teaching notes, generates an exam, and grounds the student tutor in it."
      />

      <Card spine="brand" className="mb-6">
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">Subject</label>
              <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-full">
                {subjects.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">Title (optional)</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Fractions — Week 3"
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 outline-none focus:border-brand"
              />
            </div>
          </div>

          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
              isDragActive ? "border-brand bg-brand-soft" : file ? "border-grow bg-grow-soft" : "border-line hover:border-brand hover:bg-brand-soft/40"
            }`}
          >
            <input {...getInputProps()} />
            <div className="text-4xl">{file ? "📎" : "📚"}</div>
            {file ? (
              <p className="mt-2 font-semibold text-ink">{file.name}</p>
            ) : (
              <>
                <p className="mt-2 font-semibold text-ink">Drop your material here</p>
                <p className="mt-0.5 text-sm text-ink-soft">or click to choose a file</p>
                <p className="mt-2 text-xs text-ink-soft">PDF, image (PNG/JPG), or text (TXT/MD) · up to 25&nbsp;MB</p>
              </>
            )}
          </div>

          <Button onClick={upload} disabled={!file || phase === "working"} size="lg" className="w-full">
            {phase === "working" ? "Reading & generating…" : "Upload & generate"}
          </Button>
          {error && <p className="rounded-xl bg-brand-soft px-3 py-2 text-sm text-brand-ink">{error}</p>}
          {phase === "working" && (
            <div className="flex justify-center pt-1"><Spinner label={`status: ${status.replace("_", " ")}`} /></div>
          )}
          {phase === "done" && !error && (
            <p className="rounded-xl bg-grow-soft px-3 py-2 text-sm text-grow">Done — read, notes written, and an exam generated. See below.</p>
          )}
        </CardBody>
      </Card>

      <h3 className="mb-3 text-lg font-semibold text-ink">Your materials</h3>
      {materials.length === 0 ? (
        <EmptyState icon="📚" title="No materials yet" body="Upload a syllabus or lesson to generate teaching notes and an exam." />
      ) : (
        <Card>
          <div className="divide-y divide-line">
            {materials.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-ink">{m.title}</div>
                  <div className="text-sm text-ink-soft">{m.subject} · {m.created_at}</div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <MaterialBadge status={m.status} />
                  {m.exam_id && (
                    <Link to={`/teacher/exams/${m.exam_id}`} className="text-sm font-semibold text-brand-ink hover:underline">
                      View exam →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
