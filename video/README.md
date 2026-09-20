# Homework Studio — videos (Remotion)

Two videos, both rendered from code:

| Composition | What it is | Size |
|---|---|---|
| **Promo** | A ~40s animated motion-graphics promo starring **Otto**, the notebook mascot (`src/Mascot.tsx`), walking through the whole story with springs, a scan-and-grade beat, an auto-report, and confetti. | 1920×1080 |
| **Walkthrough** | A narrated, slide-based tour of the product's story (upload → read → classify → grade → gate → parent report → tutor). | 1920×1080 |
| **Recap** | A ~14s celebratory **per-student progress recap**, generated entirely from the child's data (average, streak, subject strengths, trend). | 1080×1080 |

The **Recap is fully data-driven** — no screen recording. Feed a different
student's stats and you get their video. The backend can hand its progress JSON
straight in (see `src/data/aisha.json` for the shape), which is how a weekly
per-student recap would be automated.

## Render

```bash
cd video
npm install
npm run render:walkthrough     # → out/walkthrough.mp4
npm run render:recap           # → out/recap.mp4
# preview interactively:
npm run studio
```

Render a specific student's recap:

```bash
npx remotion render Recap out/recap-budi.mp4 --props=./budi.json
```

## Making the Walkthrough a real screen-capture demo

The slide walkthrough renders anywhere with no dependencies. To turn it into a
captured product demo (continuous real footage, one cursor, captions under the
app — the proven recipe), record the flow into `public/capture/*.mp4` and swap a
`<Beat>` for Remotion's `<OffthreadVideo>`. The storyboard order in
`src/Walkthrough.tsx` (`BEATS`) is the shot list.
