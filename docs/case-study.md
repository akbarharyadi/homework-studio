# Homework Studio — case study

*A working demo built for a Full-Stack Engineer role on an EdTech platform for
kids (live classes + game-based learning). It's an independent portfolio piece
with synthetic data — not affiliated with the company.*

## Why this, and why it's relevant

The role isn't about the games — it's about the **platform layer** around them:
student homework, parent progress visibility, teacher workflows, and a self-serve
enrollment funnel. Rather than describe that I can build it, I built a working
slice of exactly that, on a stack that maps cleanly onto the target stack, and
made it run with one command.

I've spent ~10 years full-stack, **7 of them building national education
platforms** (university admissions, computer-based testing, student dashboards
for hundreds of thousands of students). Homework Studio distills those patterns
into a small, legible product.

## Feature → responsibility mapping

| The role asks for… | Homework Studio shows… |
|---|---|
| Student **homework flows** | Upload → read (per-answer confidence) → auto-grade → gate → graded |
| **Teacher workflows** | A confidence-gated **review queue**: the teacher confirms only what the model was unsure about; the homework re-grades on resolve |
| **Parent progress visibility** | A parent view scoped to their own children (RBAC), trend charts, and a **printable progress report** |
| **Reliable, low-risk grading** | A child's grade is never silently set by a model guess — low confidence always routes to a human |
| **AI as product leverage** | Practice generator, step-by-step explanations, and a material-grounded tutor — all with a mock-first, cost-safe design |
| **Self-serve enrollment funnel** | Scoped out next (see below); I've built multi-step enrollment + payment funnels before on real admissions systems |

## Engineering decisions (and why)

- **Go + Fiber, `pgx` with plain SQL (no ORM).** Simple, fast, single-binary
  deploys — a good fit for a self-hosted server. Business logic (grading,
  explanations, generation) is isolated in a `usecase`/`tutor` layer, so it's
  testable and independent of HTTP and SQL.
- **Vite + React + TypeScript + Tailwind (SPA), not Next.js.** Lighter than SSR
  for an internal-tool-shaped app, and the exact React/Tailwind component
  patterns port to Next.js unchanged if that's preferred.
- **Postgres, self-hosted.** Deliberately not tied to a managed BaaS. Because
  **Supabase is managed Postgres**, this schema and these queries drop onto a
  Supabase project without changes — closing that gap without lock-in.
- **Confidence gate + review queue.** The single most important product decision:
  automation that knows when to defer to a human. Corrections are applied as a
  first-class action that re-aggregates the score and closes the task.
- **Mock-first AI.** The whole product runs on a deterministic mock provider with
  no API key, so the public demo is free and reproducible. Real providers are a
  config change.

## AI tooling

I use AI both as **build-time leverage** and as **runtime providers**:

- **Coding agents** (GLM coding plan, and CLI agents) to move fast in a messy,
  real-world codebase — this demo was assembled with that workflow.
- **Runtime LLMs, OpenAI-compatible and swappable:** **GLM** (my GLM coding plan)
  is the recommended provider for the tutor's explanations and chat, with DeepSeek
  and OpenAI as drop-in alternates; **TypeAI's `jev`** handles the classification
  step (identifying a homework's subject and sanity-checking answers). One client
  shape serves all of them; switching is `AI_PROVIDER` / `CLASSIFIER_PROVIDER`, and
  a deterministic mock keeps the public demo free.

## Built by assembling my own prior work

This wasn't written from a blank page. I reused patterns and logic from projects
I've built:

- **Auto-grading, cached step-by-step explanations, and the stratified practice
  generator** are adapted from an AI CBT/tutor backend I wrote (Go + Fiber +
  Postgres + pgvector, using DeepSeek).
- **The upload → extract → confidence-gate → review-queue pipeline** mirrors a
  document-ingestion product I built (FastAPI + a confidence gate + a mock
  provider for zero-cost demos).
- **The teacher dashboard + RBAC** follow a React admin console I built for a
  national CBT system.

The reuse *is* the point: good judgement about what to build new vs. adapt.

## Real AI + real automation (built)

Two things that are genuinely wired, not just scaffolded:

- **Vision reader** — `VISION_PROVIDER=glm` sends the uploaded homework photo to a
  GLM vision model, which returns each answer with a confidence that drives the
  gate. Same `Extractor` interface as the mock, so the free demo path is untouched
  (PDFs fall back to mock — they need rasterization first).
- **Background scheduler** — on a timer (and on startup) it generates every
  student's weekly report + their recap-video data with no one pressing a button.
  Parents see "generated automatically" on their dashboard; the recap JSON feeds
  the Remotion video.

## What I'd build next

1. **Self-serve enrollment funnel** (register → pick class → pay → dashboard),
   reusing a multi-step funnel + checkout I've built before.
2. **PDF rasterization** so the vision reader handles scanned PDFs, not just photos.
3. **Close the video loop** — have the scheduler render each recap MP4 (not just its
   data), and email/deliver the weekly report.

## Honesty notes

Synthetic data throughout; mock AI by default; independent demo, not affiliated
with any company. Runs end-to-end today: `docker compose up`, seed, sign in.
