import { clsx } from "clsx";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

/* ---------- Button ---------- */
type Variant = "primary" | "grow" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  const variants: Record<Variant, string> = {
    primary: "bg-brand text-white hover:bg-brand-ink shadow-sm",
    grow: "bg-grow text-white hover:brightness-95 shadow-sm",
    outline: "border border-line bg-surface text-ink hover:bg-paper",
    ghost: "text-ink-soft hover:bg-paper hover:text-ink",
  };
  const sizes: Record<Size, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

/* ---------- Input / Select ---------- */
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 outline-none focus:border-brand",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select
      className={clsx(
        "rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-medium text-ink outline-none focus:border-brand",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

/* ---------- Card ---------- */
export function Card({
  className,
  children,
  spine,
  onClick,
}: {
  className?: string;
  children: ReactNode;
  spine?: "brand" | "grow" | "flag";
  onClick?: () => void;
}) {
  const spines = {
    brand: "border-l-4 border-l-brand",
    grow: "border-l-4 border-l-grow",
    flag: "border-l-4 border-l-flag",
  };
  return (
    <div
      onClick={onClick}
      className={clsx(
        "rounded-2xl border border-line bg-surface shadow-card",
        spine && spines[spine],
        onClick && "cursor-pointer transition hover:shadow-lift",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("p-5 sm:p-6", className)}>{children}</div>;
}

/* ---------- Badge ---------- */
type Tone = "slate" | "grow" | "flag" | "brand" | "info";
export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: Tone }) {
  const tones: Record<Tone, string> = {
    slate: "bg-paper text-ink-soft",
    grow: "bg-grow-soft text-grow",
    flag: "bg-flag-soft text-[#a9701a]",
    brand: "bg-brand-soft text-brand-ink",
    info: "bg-info-soft text-info",
  };
  return <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone])}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: Tone; label: string }> = {
    pending: { tone: "slate", label: "Waiting" },
    processing: { tone: "info", label: "Reading…" },
    needs_review: { tone: "flag", label: "Needs review" },
    graded: { tone: "grow", label: "Graded" },
    finished: { tone: "grow", label: "Done" },
    failed: { tone: "slate", label: "Failed" },
  };
  const s = map[status] || { tone: "slate" as Tone, label: status };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

/* ---------- Stat ---------- */
export function Stat({
  icon,
  label,
  value,
  hint,
  tone = "brand",
}: {
  icon: string;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "brand" | "grow" | "flag" | "info";
}) {
  const bg = { brand: "bg-brand-soft", grow: "bg-grow-soft", flag: "bg-flag-soft", info: "bg-info-soft" }[tone];
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <div className={clsx("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl", bg)}>{icon}</div>
        <div className="min-w-0">
          <div className="font-display text-2xl font-bold leading-none text-ink">{value}</div>
          <div className="mt-1 truncate text-sm text-ink-soft">{label}</div>
          {hint && <div className="text-xs text-brand-ink">{hint}</div>}
        </div>
      </CardBody>
    </Card>
  );
}

/* ---------- Page header (title + one-line intent + primary action) ---------- */
export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-xl text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Empty state — an invitation to act ---------- */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: string;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Card>
      <CardBody className="flex flex-col items-center py-14 text-center">
        <div className="mb-3 text-5xl">{icon}</div>
        <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
        <p className="mt-1 max-w-sm text-sm text-ink-soft">{body}</p>
        {action && <div className="mt-5">{action}</div>}
      </CardBody>
    </Card>
  );
}

/* ---------- Steps — legit numbered sequence (the pipeline) ---------- */
export function Steps({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((s, i) => (
        <li key={i} className="rounded-xl border border-line bg-surface p-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft font-display text-sm font-bold text-brand-ink">
            {i + 1}
          </div>
          <div className="mt-2 font-semibold text-ink">{s.title}</div>
          <div className="text-sm text-ink-soft">{s.body}</div>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Meter ---------- */
export function Meter({ value, color = "#0ea98a" }: { value: number; color?: string }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-paper">
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }} />
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-soft">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-brand" />
      {label}
    </div>
  );
}
