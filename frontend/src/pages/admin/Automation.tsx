import { useEffect, useState } from "react";
import { api, type AdminAutomation } from "../../lib/api";
import { Card, CardBody, PageTitle, Badge, Spinner, Steps, Button } from "../../components/ui";

function ago(iso: string): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (isNaN(then)) return iso;
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const HOW = [
  { title: "Reads & grades", body: "Homework is read and graded by the AI as it arrives." },
  { title: "Reports", body: "Each student's weekly report is written on a timer." },
  { title: "Flags", body: "Students who slip below 65% are flagged for support." },
  { title: "Delivers", body: "Parents just see it — no one pressed a button." },
];

export function AdminAutomationPage() {
  const [a, setA] = useState<AdminAutomation | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.adminAutomation().then(setA);
    const t = setInterval(() => api.adminAutomation().then(setA), 15000);
    return () => clearInterval(t);
  }, []);

  async function runNow() {
    setBusy(true);
    try {
      await api.runAutomation();
      setA(await api.adminAutomation());
    } finally {
      setBusy(false);
    }
  }

  if (!a) return <div className="flex justify-center py-24"><Spinner label="Loading automation…" /></div>;

  const providerBadge = (label: string, v: string) =>
    v && v !== "mock" ? <Badge tone="grow">{label}: {v}</Badge> : <Badge tone="slate">{label}: mock</Badge>;

  return (
    <div>
      <PageTitle
        title="Automation"
        subtitle="What Homework Studio does on its own — reading, grading, reporting, and flagging without anyone pressing a button."
        action={<Button onClick={runNow} disabled={busy}>{busy ? "Running…" : "▶ Run now"}</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Scheduler status */}
        <Card spine="grow" className="lg:col-span-2">
          <CardBody>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3.5 w-3.5">
                  {a.enabled && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-grow opacity-60" />}
                  <span className={`relative inline-flex h-3.5 w-3.5 rounded-full ${a.enabled ? "bg-grow" : "bg-ink-soft"}`} />
                </span>
                <h3 className="text-lg font-semibold text-ink">
                  Weekly report scheduler — {a.enabled ? "running" : "off"}
                </h3>
              </div>
              <Badge tone="grow">every {a.interval}</Badge>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <div className="font-display text-3xl font-bold text-ink">{a.reports_generated}</div>
                <div className="text-sm text-ink-soft">reports generated</div>
              </div>
              <div>
                <div className="font-display text-3xl font-bold text-[#a9701a]">{a.flags}</div>
                <div className="text-sm text-ink-soft">students auto-flagged</div>
              </div>
              <div>
                <div className="font-display text-3xl font-bold text-ink">{ago(a.last_run)}</div>
                <div className="text-sm text-ink-soft">last run</div>
              </div>
              <div>
                <div className="font-display text-3xl font-bold text-ink">0</div>
                <div className="text-sm text-ink-soft">hands on it</div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* AI status */}
        <Card>
          <CardBody>
            <h3 className="mb-3 text-lg font-semibold text-ink">AI in use</h3>
            <div className="flex flex-col items-start gap-2">
              {providerBadge("Homework reader", a.vision_reader)}
              {providerBadge("Tutor", a.tutor_provider)}
            </div>
            <p className="mt-3 text-xs text-ink-soft">
              Runs on a deterministic mock by default; real models activate with a key.
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <div className="mb-3 text-sm font-semibold text-ink">How the automation works</div>
        <Steps steps={HOW} />
      </div>

      <Card className="mt-6">
        <CardBody>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink">Recent activity</h3>
            <span className="text-xs text-ink-soft">auto-refreshes</span>
          </div>
          {a.events.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-soft">Nothing yet — the scheduler runs on startup and on a timer.</p>
          ) : (
            <div className="space-y-1">
              {a.events.map((e, i) => {
                const alert = e.kind === "alert";
                return (
                  <div key={i} className="flex items-center gap-3 border-b border-line/60 py-2.5 last:border-0">
                    <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${alert ? "bg-flag" : "bg-grow"}`} />
                    <span className="text-lg">{alert ? "⚠️" : "🗓️"}</span>
                    <div className={`flex-1 text-sm font-medium ${alert ? "text-[#a9701a]" : "text-ink"}`}>{e.message}</div>
                    <span className="text-xs text-ink-soft">{ago(e.created_at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
