# 📚 Homework Studio

**Teaching material in → AI-generated, teacher-approved exams out — auto-graded, turned into warm progress reports, plus an AI tutor.**

A small, self-hosted EdTech platform that shows the *platform layer* around a
kids' learning product: a teacher uploads material, the AI turns it into an exam
(that the teacher reviews and publishes), students take it and are auto-graded,
parents see the progress, and an AI tutor answers from the class's own material.
Built to run on your own server with a single `docker compose up`.

> **Independent portfolio demo.** Not affiliated with any company. All data is
> synthetic. Built to demonstrate full-stack + AI-automation engineering.

| Upload teaching material | The AI writes the exam — teacher reviews & publishes |
|---|---|
| ![Materials](docs/manual/img/03-teacher-materials.png) | ![Exam review](docs/manual/img/04-teacher-exam-review.png) |
| **Students take it — auto-graded** | **Parents see the progress** |
| ![Student exam](docs/manual/img/08-student-exam.png) | ![Parent progress](docs/manual/img/05-parent-progress.png) |

### The idea in one line

**Material → AI reads it → generates an exam + teaching notes + tutor knowledge →
the least-confident questions are flagged for the teacher → publish → students take
it, auto-graded.** The human-in-the-loop confidence gate sits on the AI's generated
questions, so nothing reaches students the teacher hasn't approved.

### For students, it's a game

XP, levels, a day **streak**, **badges**, and a class **leaderboard** — plus free
**practice** (earns XP, not graded) and a **review** of every past attempt. Progress
that kids actually want to chase.

![Gamified student home](docs/manual/img/07-student-home.png)

### Real AI — it reads your material and writes the exam

A **vision model** transcribes the uploaded PDF/image (poppler rasterizes PDFs first)
and a **language model** authors multiple-choice questions grounded in it, each with a
self-reported confidence. Questions below the bar are flagged for the teacher; a clean
exam (nothing flagged) **publishes itself**. The AI is real, not mocked — set an API key
(`docker/.env`) and the whole pipeline runs on it; any OpenAI-compatible provider works.

### Admin monitoring & where the automation shows up

An **admin** role gets a real analytics dashboard and the automation controls:

- **School overview** — **mastery bands** (mastered / on-track / needs-support), a
  **"needs attention"** early-warning list of at-risk students, top performers,
  subject strengths, and the full roster — each with a plain-language explanation.
- **Automation** — a **jobs dashboard**: every automated job the platform runs
  (material→exam, **auto-publish** clean exams, weekly reports, **at-risk flagging**,
  **auto-remediation**) with its trigger, schedule and run count, the AI models doing
  the work, a **Run now** trigger, and a colour-coded **live activity feed** of what
  the automation just did.

That page — plus the parents' "generated automatically" card and the students'
"Recommended for you" practice — is how the background automation surfaces in the
product.

| School overview (analytics) | Automation (live activity) |
|---|---|
| ![Admin overview](docs/manual/img/12-admin-overview.png) | ![Admin automation](docs/manual/img/14-admin-automation.png) |

### Watch it — the explainer

A **~70-second narrated walkthrough** of the whole flow — upload material → the AI
builds an exam, notes & a tutor → review & publish → students **level up** → parents
see grades *and* effort → the school at a glance. Built from code with **Remotion** +
a neural voiceover, guided by **Otto** the notebook mascot; captions in
[`docs/demo/captions/`](docs/demo/captions) (`.srt`).

[![Homework Studio — explainer](docs/demo/explainer-poster.png)](docs/demo/explainer.mp4)

### More videos

A **short promo** (~40s) and one per audience:

| 🧑‍🏫 For teachers | 🧒 For students | 🏫 For your school |
|---|---|---|
| [![Teacher promo](docs/demo/teacher-poster.png)](docs/demo/teacher-promo.mp4) | [![Student promo](docs/demo/student-poster.png)](docs/demo/student-promo.mp4) | [![Admin promo](docs/demo/admin-poster.png)](docs/demo/admin-promo.mp4) |

> ℹ️ The promo & role videos are an **earlier cut** (they still say "homework"); the
> **explainer** above and the app reflect the current material → exam flow.

---

## What it does

Four roles, one pipeline:

- **Teacher** — upload **teaching material** (PDF/image/text). The AI reads it and
  generates a **custom exam** (each question with a confidence), **teaching notes**,
  and **tutor knowledge**. Low-confidence questions are flagged; the teacher reviews,
  discards any duds, and **publishes**.
- **Student** — a **gamified home** (XP, levels, day streak, badges, class
  leaderboard), take a **published exam** (auto-graded), **practise** from the bank
  (earns XP, not graded), **review** past attempts, get **"Show me how"** explanations,
  and chat with an **AI tutor** grounded in the teacher's material.
- **Parent** — a **family dashboard**: each child's grades *and* engagement (day
  streak, level, badges), an AI **"how to help"** tip, **compare-to-class**, a
  **"what's new"** feed (reports, badges, new exams, at-risk alerts), and a one-click
  **printable progress report**.
- **Admin** — a school analytics dashboard (mastery bands, at-risk early-warning), an
  **Insights** page (engagement/XP, a 14-day trend, and per-exam analytics including
  the hardest question), and the automation controls.

### The confidence gate (now on the AI's generated questions)

```
material → read → generate exam (per-question confidence) → GATE → decide
                                                              │
              every question cleared the threshold ─────────►  published automatically
              any question below threshold ────────────────►  needs_review → teacher approves → published
```

A clean exam publishes itself; one with any flagged question reaches students only after
the teacher approves it. Questions the model was least confident about are flagged for
review. This is the same human-in-the-loop pattern real document-ingestion systems use —
here the human signs off on the AI-authored questions that need it, and the automation
handles the rest.

---

## Tech stack

| Layer | Choice |
|---|---|
| **Backend** | **Go + Fiber v2**, **pgx** with plain SQL (**no ORM**), `golang-jwt`, embedded SQL migrations |
| **Frontend** | **Vite + React + TypeScript + Tailwind** (SPA), Recharts, react-dropzone, react-markdown + KaTeX; **responsive down to phone width** and an installable **PWA** (offline app shell via a service worker) |
| **Database** | **PostgreSQL** (self-hosted; Supabase-compatible — Supabase *is* managed Postgres) |
| **AI** | A **language model** authors the exam + teaching notes + tutor replies and a **vision model** transcribes the uploaded material — through one **OpenAI-compatible** client, so any such provider drops in with a base URL + model change. A key is required — there is no mock path |
| **Automation** | Async coursework pipeline (material → exam → **auto-publish** when clean) + a **background scheduler** that writes weekly reports, **flags at-risk students** and **builds them remediation practice**, all surfaced on an admin **jobs dashboard** |
| **Deploy** | Docker Compose · pull-based CD to a self-hosted server via a **GitHub Actions self-hosted runner** · public HTTPS through a **Cloudflare Tunnel** — see **[docs/DEPLOY.md](docs/DEPLOY.md)** |

Clean architecture (`router → handler → usecase → pgx store`), so business logic
(exam generation, grading, explanations) is isolated from HTTP and SQL.

---

## Quick start

Prerequisites: **Docker** and an **API key** for an OpenAI-compatible AI provider (for the AI features).
Copy `docker/.env.example` → `docker/.env` (gitignored) and add your `AI_API_KEY`.
(For local dev without Docker: Go 1.26+, Node 22+.)

```bash
# 1. Start Postgres + backend + frontend
docker compose -f docker/docker-compose.yml --profile full up -d --build

# 2. Seed the demo dataset (one school, 4 logins, 2 subjects, bank, published exams, attempts)
docker compose -f docker/docker-compose.yml --profile tools run --rm seed

# 3. Open the app
#    Frontend  → http://localhost:3000
#    API docs  → http://localhost:8080/health
```

### Demo logins (password `demo1234`)

| Role | Email | What to try |
|---|---|---|
| 🧑‍🏫 Teacher | `teacher@demo.id` | **Materials** → upload a `.txt`/`.md` syllabus → watch it generate an exam → **Exams** → review the flagged question → **Publish** |
| 🧒 Student | `student@demo.id` | **Start** a published exam → answer → **Show me how** → chat with the tutor |
| 👪 Parent | `parent@demo.id` | See Aisha's progress → **Progress report** → Save as PDF |
| 🏫 Admin | `admin@demo.id` | **Overview** (mastery bands, at-risk) → **Automation** (live feed, Run now) |

### Local dev (no Docker for the apps)

```bash
# Postgres only
docker compose -f docker/docker-compose.yml up -d postgres

# Backend
cd backend && cp .env.example .env
go run ./cmd/seed      # seed once
go run ./cmd/api       # http://localhost:8080

# Frontend
cd frontend && npm install && npm run dev   # http://localhost:3000
```

---

## AI configuration

The app runs on any **OpenAI-compatible** AI provider. An API key is **required** —
there is no mock path. Set it with env vars:

```bash
# Exam + teaching notes + tutor — any OpenAI-compatible provider
AI_PROVIDER=<provider-name>
AI_API_KEY=<your API key>
AI_BASE_URL=<the provider's OpenAI-compatible base URL>
AI_MODEL=<text model>
# (Same shape for every provider — only base URL + model change.)

# Read the uploaded material — a vision-capable model transcribes a PDF/image to text.
# Text files (.txt/.md/.csv) are read directly. Key/base URL reuse AI_* by default.
VISION_PROVIDER=<provider-name>
VISION_MODEL=<vision-capable model>

# Background automation: weekly reports, at-risk flagging + remediation practice.
SCHEDULER_ENABLED=true
SCHEDULER_INTERVAL=6h               # also runs once on startup
```

Providers are swappable (any OpenAI-compatible base URL + model), so changing model is
a config change, not a rewrite. **For the Docker stack**, copy
`docker/.env.example` → `docker/.env` (gitignored) with your key and
`docker compose up` runs on the real AI — reading your material and authoring the exam.
Without a key the app still boots, but generation, the tutor and material reading are
off.

---

## Project layout

```
homework-studio/
├── backend/                 Go + Fiber + pgx (no ORM)
│   ├── cmd/api              server entrypoint
│   ├── cmd/seed             demo seed
│   └── internal/
│       ├── coursework/      read material → index (RAG) → notes → generate exam → gate
│       ├── vision/          ReadText: transcribe a document (vision model / text direct)
│       ├── tutor/           exam generator, teaching notes, explanations, RAG chat
│       ├── scheduler/       background job: auto weekly reports + recap data
│       ├── store/           plain-SQL data access
│       ├── handler/ router/ HTTP
│       └── db/migrations/   embedded SQL schema
├── frontend/                Vite + React + TS + Tailwind SPA
│   └── src/pages/{teacher,parent,student,admin}
├── docker/                  compose (postgres + backend + frontend)
└── docs/                    technical overview, manual, case study
```

---

## Verify it works

```bash
cd backend && go build ./... && go vet ./...     # compiles clean
```

The end-to-end flow: teacher uploads material → the AI generates an exam and flags a
low-confidence question → teacher reviews and publishes → a student takes the exam and
is auto-graded → a parent sees the progress → the admin watches the scheduler.

---

## Update flow — from a push to the live app

Live demo: **https://homeworkstudio.akbarharyadi.com**

```
git push main
   ├─► CI                 build + vet + test (Go) · tsc + build (frontend)
   ├─► Docs auto-update   spins up the real app, seeds it, regenerates the manual
   │                      screenshots + PDFs from it, and commits any drift back
   └─► Deploy             a self-hosted runner ON the server pulls the commit and runs
                          docker compose up --build (AI key from an Actions secret)
                               │
                               ▼
     homeworkstudio.akbarharyadi.com ◄── Cloudflare Tunnel ◄── frontend :3000 ──/api/──► backend
```

- **Nothing is hand-edited after a merge** — the running app, the screenshots and the
  PDFs all follow the code.
- **Data survives deploys.** Postgres and uploads live in named Docker volumes; only an
  explicit **seed** resets them.
- **Manual deploy / rollback** (on the server, e.g. if the runner is down):
  `cd ~/homework-studio && git pull && docker compose -f docker/docker-compose.yml --env-file docker/.env --profile full up -d --build`
- One-time server setup (runner, tunnel, secrets): **[docs/DEPLOY.md](docs/DEPLOY.md)**.

---

## Documentation

| Doc | What's in it |
|---|---|
| **[Technical overview](docs/TECHNICAL.md)** ([PDF](docs/pdf/technical-overview.pdf)) | Architecture + data-flow diagrams, the ingest pipeline, the **ERD**, the AI/automation design, the API surface, and the stack with the *why* behind each choice. |
| **[User manual](docs/MANUAL.md)** ([PDF](docs/pdf/user-manual.pdf)) | A per-role walkthrough (Teacher / Parent / Student / Admin) with screenshots of the live app. |
| **[Case study](docs/case-study.md)** | How each feature maps to a real product's needs. |

Both the Markdown docs and their PDFs are **generated from source** — screenshots are
captured from the running app and the PDFs rendered (Mermaid diagrams and all) with a
small offline toolchain in [`docs/tooling/`](docs/tooling/). Regenerate with
`cd docs/tooling && npm install && npm run all`.

---

## Roadmap

Deliberate deferrals: a single binary with in-process jobs is the right size for a demo.
These are the next steps if it grew into a product.

- [ ] **Modular backend — separate binaries, gRPC.** Split the monolith into one service
  per domain: `auth`, `teacher`, `student`, `parent`, `admin`, and **`brain`** — a
  standalone AI gateway that owns every LLM call (exam generation, teaching notes, tutor,
  vision). One shared Postgres; services talk over **gRPC**. The existing layers
  (`router → handler → usecase → store`) already map onto service boundaries, so this is a
  repackaging rather than a rewrite — each service then builds, deploys and scales on its
  own.
- [ ] **Redis cache + RabbitMQ queue for the high-demand endpoints.** **Redis** for the hot
  reads — leaderboard, gamification/XP, class stats, and cached AI explanations / tutor
  answers (`REDIS_URL` is already a config knob). **RabbitMQ** to replace the in-process
  goroutine that runs the coursework pipeline (material → exam) and the scheduler's jobs,
  so a burst of uploads queues instead of spawning goroutines — with retries and a
  dead-letter queue.
- [ ] **AI-designed E2E test automation — user stories → Playwright.** Write each role's
  journey as a plain-language user story ("as a teacher, I upload material and publish
  the generated exam"; "as a student, I take it and see my score and XP"), have an AI
  step turn every story into a **Playwright** spec, and run the suite in CI against the
  seeded stack the docs workflow already stands up. A failing test points back to the
  story it came from, and when the UI changes the AI re-derives the selectors instead of
  a human patching them — the same "AI in how we build it" idea as the docs auto-update,
  applied to tests.

---

## About

Built by **Akbar Priyono Haryadi** as an independent demo. It assembles patterns
from ~10 years of full-stack work (7 of them on national education platforms).
See **[docs/case-study.md](docs/case-study.md)** for how each piece maps to a real
product's needs, and the engineering decisions behind it.

MIT licensed.
