import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "./theme";

// A narrated, slide-based walkthrough of the product's story. It renders with no
// screen recording, so it works anywhere. To make it a real screen-capture demo,
// drop captured clips into public/capture/ and swap a <Beat> for an <OffthreadVideo>
// (the capture toolchain from the product-video recipe still applies).

interface Beat {
  emoji: string;
  title: string;
  caption: string;
  bg?: string;
}

const BEATS: Beat[] = [
  { emoji: "📚", title: "Homework Studio", caption: "Homework in → graded, gated, and turned into a warm progress report.", bg: `linear-gradient(135deg, ${theme.brand}, ${theme.brandDark})` },
  { emoji: "📄", title: "1 · Upload homework", caption: "A teacher drops a worksheet — PDF or a phone photo." },
  { emoji: "🔍", title: "2 · Read with confidence", caption: "Every question & answer is read with a calibrated confidence score." },
  { emoji: "🏷️", title: "3 · Classify", caption: "The subject is detected — powered by jev (TypeAI) when configured." },
  { emoji: "✅", title: "4 · Auto-grade", caption: "Correct answers are scored instantly; a percentage is computed." },
  { emoji: "⚖️", title: "5 · The confidence gate", caption: "Anything the model wasn't sure it read opens a teacher review task — no silent guesses on a child's grade.", bg: `linear-gradient(135deg, ${theme.amber}, #d97706)` },
  { emoji: "👪", title: "6 · Parent progress", caption: "Parents see a plain-language view of their own child — and a printable report." },
  { emoji: "🤖", title: "7 · AI tutor", caption: "Students get a fresh practice set, step-by-step explanations, and a material-grounded tutor." },
  { emoji: "🌟", title: "Serious software, made playful", caption: "Self-hosted · Go + React · one docker compose up.", bg: `linear-gradient(135deg, ${theme.green}, #0891b2)` },
];

const BEAT_FRAMES = 70;

export const Walkthrough: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: theme.bg, fontFamily: theme.font }}>
    {BEATS.map((b, i) => (
      <Sequence key={i} from={i * BEAT_FRAMES} durationInFrames={BEAT_FRAMES}>
        <BeatCard {...b} />
      </Sequence>
    ))}
  </AbsoluteFill>
);

const BeatCard: React.FC<Beat> = ({ emoji, title, caption, bg }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });
  const y = interpolate(s, [0, 1], [30, 0]);
  const dark = Boolean(bg);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 100, background: bg }}>
      <div style={{ textAlign: "center", opacity: s, transform: `translateY(${y}px)`, maxWidth: 1100 }}>
        <div style={{ fontSize: 110 }}>{emoji}</div>
        <div style={{ fontSize: 68, fontWeight: 800, color: dark ? theme.white : theme.ink, marginTop: 16 }}>{title}</div>
        <div style={{ fontSize: 34, color: dark ? "rgba(255,255,255,0.9)" : theme.slate, marginTop: 20, lineHeight: 1.4 }}>
          {caption}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const walkthroughDuration = BEATS.length * BEAT_FRAMES;
