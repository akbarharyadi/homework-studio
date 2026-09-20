import { useEffect, useRef, useState } from "react";
import { api, type Subject } from "../../lib/api";
import { Button, Card, CardBody, PageTitle, Input, Spinner, Select } from "../../components/ui";
import { Markdown } from "../../components/Markdown";

interface Msg { role: "user" | "tutor"; text: string; }

const SUGGESTIONS = ["How do I add 7 and 8?", "Why do plants need sunlight?", "What is 1/2 of 18?"];

export function StudentTutor() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "tutor", text: "Hi! I'm your tutor 🙂 Ask me anything about your lessons — I'll help you work it out, step by step." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.subjects().then((s) => { setSubjects(s); if (s[0]) setSubjectId(s[0].id); });
    api.students().then((s) => s[0] && setStudentId(s[0].id));
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  async function ask(q: string) {
    if (!q.trim() || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const { answer } = await api.tutorChat(studentId, subjectId, q);
      setMessages((m) => [...m, { role: "tutor", text: answer }]);
    } catch {
      setMessages((m) => [...m, { role: "tutor", text: "Sorry, I had trouble with that — try again?" }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle
        title="Ask the tutor"
        subtitle="Grounded in your class material. Kind, patient, and always ready to show the steps."
        action={<Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>{subjects.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}</Select>}
      />

      <Card>
        <CardBody className="flex h-[62vh] flex-col p-0">
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-brand text-white" : "bg-paper text-ink"}`}>
                  {m.role === "tutor" ? <Markdown>{m.text}</Markdown> : m.text}
                </div>
              </div>
            ))}
            {busy && <div className="flex justify-start"><div className="rounded-2xl bg-paper px-4 py-2.5"><Spinner /></div></div>}
            <div ref={endRef} />
          </div>

          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 px-5 pb-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)} className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-brand hover:text-brand-ink">
                  {s}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex gap-2 border-t border-line p-4">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your question…" />
            <Button type="submit" disabled={busy}>Send</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
