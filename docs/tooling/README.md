# Docs toolchain

Generates the documentation assets from source — the same idea as the Remotion video
build, but for docs: capture UI screenshots and render the Markdown docs to PDF, all
offline through one bundled Chromium (Puppeteer).

## What it produces

| Script | Output |
|---|---|
| `capture-screenshots.mjs` | `docs/manual/img/01…11-*.png` — one full-page screenshot per screen, per role |
| `build-pdf.mjs` | `docs/pdf/technical-overview.pdf` and `docs/pdf/user-manual.pdf` (Mermaid diagrams + syntax-highlighted code + page numbers) |
| `seed-demo-homework.mjs` | Uploads one sample homework so the review queue shows the confidence gate in action (run before capturing) |
| `capture-one-practice.mjs` | Re-captures just the practice set in isolation (GLM authors the questions, so it needs a quiet moment) |

## Prerequisites

- Node 18+ (`npm install` here pulls Puppeteer, which downloads its own Chromium).
- For screenshots: the app running at `http://localhost:3000`
  (`docker compose -f docker/docker-compose.yml --profile full up -d --build` + seed).

## Run

```bash
cd docs/tooling
npm install

# 1. (optional) create a review task so the gate shows in the manual
node seed-demo-homework.mjs

# 2. capture the screenshots
npm run shots

# 3. render the PDFs (reads TECHNICAL.md and MANUAL.md in ../)
npm run pdf

# or both:
npm run all
```

The PDF build is fully offline: Mermaid renders from the bundled `mermaid.min.js`,
code is highlighted with `highlight.js`, and the manual's screenshots resolve via a
`<base href>` pointing at `docs/`. `node_modules/` and `.tmp/` are gitignored.
