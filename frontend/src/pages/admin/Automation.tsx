import { useEffect, useState } from "react";
import { api, type AdminAutomation, type AutomationJob, type AutomationEvent } from "../../lib/api";
import { Card, CardBody, PageTitle, Badge, Spinner, Button } from "../../components/ui";

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

// How each activity-feed entry is styled, by the kind the automation logged.
const EVENT_STYLE: Record<AutomationEvent["kind"], { icon: string; dot: string; text: string }> = {
  report: { icon: "🗓️", dot: "bg-grow", text: "text-ink" },
  alert: { icon: "🚩", dot: "bg-flag", text: "text-[#a9701a]" },
  remediation: { icon: "🎯", dot: "bg-brand", text: "text-brand-ink" },
  publish: { icon: "🚀", dot: "bg-info", text: "text-info" },
};

function JobRow({ job }: { job: AutomationJob }) {
  const scheduled = job.trigger === "scheduled";
  const paused = job.status === "paused";
  return (
    <div className="flex items-start gap-4 border-b border-line/60 py-4 last:border-0">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-paper text-xl">{job.icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-semibold text-ink">{job.name}</h4>
          <Badge tone={scheduled ? "info" : "grow"}>{scheduled ? "scheduled" : "on event"}</Badge>
          {paused && <Badge tone="slate">paused</Badge>}
        </div>
        <p className="mt-1 text-sm text-ink-soft">{job.detail}</p>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-soft">
          <span className={`h-1.5 w-1.5 rounded-full ${paused ? "bg-ink-soft" : "bg-grow"}`} />
          {job.schedule}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-display text-2xl font-bold text-ink">{job.count}</div>
        <div className="text-xs text-ink-soft">{job.unit}</div>
      </div>
    </div>
  );
}

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

  const scheduledRuns = a.jobs.filter((j) => j.trigger === "scheduled" && j.status !== "paused").length;

  return (
    <div>
      <PageTitle
        title="Automation"
        subtitle="Every job Homework Studio runs on its own — reading material into exams, publishing the clean ones, writing reports, flagging students, and building them practice. No one presses a button."
        action={<Button onClick={runNow} disabled={busy}>{busy ? "Running…" : "▶ Run scheduled jobs now"}</Button>}
      />

      {/* Headline strip */}
      <Card spine="grow">
        <CardBody>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="font-display text-3xl font-bold text-ink">{a.jobs.length}</div>
              <div className="text-sm text-ink-soft">automated jobs</div>
            </div>
            <div>
              <div className="font-display text-3xl font-bold text-grow">{scheduledRuns}</div>
              <div className="text-sm text-ink-soft">on the {a.interval} timer</div>
            </div>
            <div>
              <div className="font-display text-3xl font-bold text-ink">{ago(a.last_run)}</div>
              <div className="text-sm text-ink-soft">last scheduled run</div>
            </div>
            <div>
              <div className="font-display text-3xl font-bold text-ink">0</div>
              <div className="text-sm text-ink-soft">hands on it</div>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Jobs */}
        <Card className="lg:col-span-2">
          <CardBody>
            <h3 className="mb-1 text-lg font-semibold text-ink">Jobs</h3>
            <p className="mb-2 text-sm text-ink-soft">What runs, when it fires, and how often it has.</p>
            <div>
              {a.jobs.map((j) => <JobRow key={j.key} job={j} />)}
            </div>
          </CardBody>
        </Card>

        {/* AI in use */}
        <Card>
          <CardBody>
            <h3 className="mb-1 text-lg font-semibold text-ink">AI doing the work</h3>
            <p className="mb-4 text-sm text-ink-soft">The models behind the jobs.</p>
            <div className="space-y-3">
              <div className="rounded-xl bg-paper p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Exams · notes · tutor</div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge tone="grow">{a.tutor_provider}</Badge>
                  <span className="text-sm font-medium text-ink">{a.ai_model}</span>
                </div>
              </div>
              <div className="rounded-xl bg-paper p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Reads your material</div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge tone="grow">{a.vision_reader}</Badge>
                  <span className="text-sm font-medium text-ink">{a.vision_model}</span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-soft">
              Powered by GLM (Z.AI coding plan). Any OpenAI-compatible provider drops in via config.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Activity feed */}
      <Card className="mt-6">
        <CardBody>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink">Recent activity</h3>
            <span className="text-xs text-ink-soft">auto-refreshes · live from the automation</span>
          </div>
          {a.events.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-soft">Nothing yet — the scheduler runs on startup and on a timer.</p>
          ) : (
            <div className="space-y-1">
              {a.events.map((e, i) => {
                const st = EVENT_STYLE[e.kind] ?? EVENT_STYLE.report;
                return (
                  <div key={i} className="flex items-center gap-3 border-b border-line/60 py-2.5 last:border-0">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${st.dot}`} />
                    <span className="text-lg">{st.icon}</span>
                    <div className={`flex-1 text-sm font-medium ${st.text}`}>{e.message}</div>
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
