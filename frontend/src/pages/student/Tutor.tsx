import { useEffect, useRef, useState } from "react";
import { api, type Subject } from "../../lib/api";
import { Button, Card, CardBody, PageTitle, Input, Spinner } from "../../components/ui";
import { Markdown } from "../../components/Markdown";

interface Msg {
  role: "user" | "tutor";
  text: string;
}

export function StudentTutor() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "tutor", text: "Hi! I'm your tutor 🙂 Ask me anything about your homework — I'll help you work it out." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.subjects().then((s) => {
      setSubjects(s);
      if (s[0]) setSubjectId(s[0].id);
    });
    api.students().then((s) => s[0] && setStudentId(s[0].id));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const { answer } = await api.tutorChat(studentId, subjectId, q);
      setMessages((m) => [...m, { role: "tutor", text: answer }]);
    } catch {
      setMessages((m) => [...m, { role: "tutor", text: "Sorry, I had trouble with that — try again?" }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <PageTitle title="Ask the tutor" subtitle="Grounded in your class material. Kind, patient, and always LaTeX-ready." />
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <Card>
        <CardBody className="flex h-[60vh] flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    m.role === "user" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {m.role === "tutor" ? <Markdown>{m.text}</Markdown> : m.text}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-100 px-4 py-2"><Spinner /></div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={send} className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. How do I add 7 and 8?"
            />
            <Button type="submit" disabled={busy}>Send</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
