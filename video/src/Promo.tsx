import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import type { CSSProperties, ReactNode } from "react";
import { theme, graphPaper } from "./theme";
import { fraunces, jakarta } from "./fonts";
import { Mascot } from "./Mascot";

/* ---------------- helpers ---------------- */

const rand = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const useEnter = (delay = 0, damping = 14) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass: 0.8 } });
};

const Caption: React.FC<{ step?: number; text: string }> = ({ step, text }) => {
  const e = useEnter(6, 16);
  return (
    <div
      style={{
        position: "absolute",
        bottom: 70,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: e,
        transform: `translateY(${interpolate(e, [0, 1], [24, 0])}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: theme.white,
          border: `1px solid ${theme.line}`,
          borderRadius: 999,
          padding: "14px 26px 14px 16px",
          boxShadow: "0 12px 40px rgba(24,34,56,0.10)",
          fontFamily: jakarta,
        }}
      >
        {step != null && (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              background: theme.brand,
              color: "#fff",
              fontFamily: fraunces,
              fontWeight: 700,
              fontSize: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {step}
          </div>
        )}
        <div style={{ fontSize: 30, fontWeight: 600, color: theme.ink }}>{text}</div>
      </div>
    </div>
  );
};

const Chip: React.FC<{ children: ReactNode; tone?: "brand" | "grow" | "flag"; style?: CSSProperties }> = ({
  children,
  tone = "brand",
  style,
}) => {
  const map = {
    brand: { bg: theme.brandSoft, fg: theme.brandDark },
    grow: { bg: theme.growSoft, fg: theme.grow },
    flag: { bg: theme.flagSoft, fg: "#a9701a" },
  }[tone];
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: map.bg,
        color: map.fg,
        fontFamily: jakarta,
        fontWeight: 700,
        fontSize: 22,
        padding: "8px 16px",
        borderRadius: 999,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Sparkle: React.FC<{ x: number; y: number; delay: number; scale?: number }> = ({ x, y, delay, scale = 1 }) => {
  const frame = useCurrentFrame();
  const t = (frame - delay) % 90;
  const s = interpolate(t, [0, 12, 30], [0, 1, 0], { extrapolateRight: "clamp" }) * scale;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `scale(${s})` }}>
      <svg width="46" height="46" viewBox="0 0 46 46">
        <path d="M23 2 L27 19 L44 23 L27 27 L23 44 L19 27 L2 23 L19 19 Z" fill={theme.flag} />
      </svg>
    </div>
  );
};

const Confetti: React.FC<{ start: number; n?: number }> = ({ start, n = 70 }) => {
  const frame = useCurrentFrame();
  const local = frame - start;
  if (local < 0) return null;
  const colors = [theme.brand, theme.grow, theme.flag, theme.info, "#ff9a86"];
  return (
    <>
      {Array.from({ length: n }).map((_, i) => {
        const r1 = rand(i);
        const r2 = rand(i + 100);
        const r3 = rand(i + 200);
        const x = r1 * 1920;
        const y = -40 + local * (3.2 + r2 * 4.5);
        const rot = local * (4 + r3 * 9) + r1 * 360;
        const op = interpolate(local, [0, 8, 70, 110], [0, 1, 1, 0], { extrapolateRight: "clamp" });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 10 + r3 * 8,
              height: 5 + r3 * 5,
              background: colors[i % colors.length],
              transform: `rotate(${rot}deg)`,
              opacity: op,
              borderRadius: 2,
            }}
          />
        );
      })}
    </>
  );
};

const PROBLEMS: [string, string, boolean][] = [
  ["7 + 8 =", "15", true],
  ["12 + 9 =", "20", false],
  ["6 × 4 =", "24", true],
  ["36 ÷ 6 =", "6", true],
  ["25 + 47 =", "72", true],
];

// The homework "paper" card, optionally revealing ✓/✗ marks up to `scan` (0..1).
const HomeworkPaper: React.FC<{ scan?: number; showMarks?: boolean; highlightRow?: number }> = ({
  scan = 0,
  showMarks = false,
  highlightRow = -1,
}) => {
  return (
    <div
      style={{
        width: 620,
        background: theme.white,
        borderRadius: 24,
        border: `1px solid ${theme.line}`,
        boxShadow: "0 24px 70px rgba(24,34,56,0.14)",
        borderLeft: `10px solid ${theme.brand}`,
        padding: "30px 34px",
        fontFamily: jakarta,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ fontFamily: fraunces, fontSize: 30, fontWeight: 700, color: theme.ink }}>Math Worksheet</div>
      <div style={{ fontSize: 20, color: theme.inkSoft, marginBottom: 14 }}>Aisha Putri · Grade 4</div>
      {PROBLEMS.map(([q, a, ok], i) => {
        const rowShown = scan * PROBLEMS.length > i + 0.5;
        const isHi = highlightRow === i;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "12px 12px",
              borderRadius: 12,
              background: isHi ? theme.flagSoft : "transparent",
              border: isHi ? `1px solid ${theme.flag}` : "1px solid transparent",
              marginBottom: 4,
            }}
          >
            <div style={{ fontSize: 30, fontWeight: 600, color: theme.ink, width: 150 }}>{q}</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: theme.info }}>{a}</div>
            <div style={{ flex: 1 }} />
            {showMarks && rowShown && (
              <Mark ok={ok} />
            )}
            {isHi && <span style={{ fontSize: 26, color: "#a9701a", fontWeight: 700 }}>read 56% ?</span>}
          </div>
        );
      })}
      {/* scan line */}
      {scan > 0 && scan < 1 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${20 + scan * 76}%`,
            height: 5,
            background: `linear-gradient(90deg, transparent, ${theme.brand}, transparent)`,
            boxShadow: `0 0 24px ${theme.brand}`,
          }}
        />
      )}
    </div>
  );
};

const Mark: React.FC<{ ok: boolean }> = ({ ok }) => {
  const e = useEnter(0, 9);
  const s = interpolate(e, [0, 1], [0, 1]);
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 999,
        background: ok ? theme.growSoft : theme.brandSoft,
        color: ok ? theme.grow : theme.brandDark,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 24,
        fontWeight: 800,
        transform: `scale(${s})`,
      }}
    >
      {ok ? "✓" : "✗"}
    </div>
  );
};

/* ---------------- scenes ---------------- */

const SceneWrap: React.FC<{ children: ReactNode; bg?: string }> = ({ children, bg }) => (
  <AbsoluteFill style={{ ...graphPaper(bg), fontFamily: jakarta }}>{children}</AbsoluteFill>
);

const S1Intro: React.FC = () => {
  const title = useEnter(16, 13);
  const tag = useEnter(30, 16);
  return (
    <SceneWrap>
      <Sparkle x={360} y={220} delay={10} scale={1.2} />
      <Sparkle x={1500} y={300} delay={26} />
      <Sparkle x={1400} y={760} delay={44} scale={0.9} />
      <Sparkle x={300} y={720} delay={60} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Mascot pose="wave" size={340} delay={4} />
        <div
          style={{
            fontFamily: fraunces,
            fontWeight: 700,
            fontSize: 104,
            color: theme.ink,
            marginTop: 10,
            opacity: title,
            transform: `translateY(${interpolate(title, [0, 1], [40, 0])}px)`,
          }}
        >
          Homework Studio
        </div>
        <div
          style={{
            fontSize: 40,
            color: theme.inkSoft,
            fontWeight: 500,
            marginTop: 8,
            opacity: tag,
          }}
        >
          Learning that actually feels playful.
        </div>
      </AbsoluteFill>
    </SceneWrap>
  );
};

const S2Snap: React.FC = () => {
  const frame = useCurrentFrame();
  const paper = useEnter(6, 15);
  const flash = interpolate(frame, [34, 40, 52], [0, 0.85, 0], { extrapolateRight: "clamp" });
  return (
    <SceneWrap>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <Mascot pose="point" size={300} delay={2} />
          <div
            style={{
              transform: `translateX(${interpolate(paper, [0, 1], [120, 0])}px) rotate(${interpolate(paper, [0, 1], [6, -2])}deg)`,
              opacity: paper,
              position: "relative",
            }}
          >
            <Chip style={{ position: "absolute", top: -54, left: 10, fontSize: 24 }}>📸 snap or upload</Chip>
            <HomeworkPaper />
          </div>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
      <Caption step={1} text="Snap a photo of the homework" />
    </SceneWrap>
  );
};

const S3Read: React.FC = () => {
  const frame = useCurrentFrame();
  const scan = interpolate(frame, [10, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.ease) });
  const pct = Math.round(interpolate(frame, [90, 140], [0, 80], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const scoreIn = useEnter(88, 12);
  return (
    <SceneWrap>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 50 }}>
          <div style={{ position: "relative" }}>
            <Chip tone="brand" style={{ position: "absolute", top: -54, left: 8 }}>
              👁️ Read by GLM-5.3-flash
            </Chip>
            <HomeworkPaper scan={scan} showMarks />
          </div>
          <div style={{ textAlign: "center", opacity: scoreIn, transform: `scale(${interpolate(scoreIn, [0, 1], [0.6, 1])})` }}>
            <div style={{ fontFamily: fraunces, fontWeight: 700, fontSize: 150, color: theme.grow, lineHeight: 1 }}>{pct}%</div>
            <div style={{ fontSize: 30, color: theme.inkSoft }}>auto-graded</div>
          </div>
        </div>
      </AbsoluteFill>
      <Caption step={2} text="AI reads every answer — and grades it" />
    </SceneWrap>
  );
};

const S4Gate: React.FC = () => {
  const card = useEnter(8, 14);
  const tap = useEnter(52, 10);
  return (
    <SceneWrap>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
          <Mascot pose="point" size={260} delay={2} />
          <div
            style={{
              width: 640,
              background: theme.white,
              borderRadius: 24,
              border: `1px solid ${theme.line}`,
              borderLeft: `10px solid ${theme.flag}`,
              boxShadow: "0 24px 70px rgba(24,34,56,0.14)",
              padding: 34,
              opacity: card,
              transform: `translateY(${interpolate(card, [0, 1], [30, 0])}px)`,
              fontFamily: jakarta,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: fraunces, fontSize: 30, fontWeight: 700, color: theme.ink }}>Teacher review</div>
              <Chip tone="flag">read 56% sure</Chip>
            </div>
            <div style={{ background: theme.paper, borderRadius: 14, padding: 20, margin: "18px 0", fontSize: 28 }}>
              <b>Q3.</b> 5 + 8 = <span style={{ color: theme.inkSoft }}>read “13 (unclear)”</span>
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              <div
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "16px 0",
                  borderRadius: 12,
                  background: theme.grow,
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 26,
                  transform: `scale(${interpolate(tap, [0, 1], [1, 1.06])})`,
                  boxShadow: tap > 0.5 ? `0 0 0 4px ${theme.growSoft}` : "none",
                }}
              >
                ✓ Correct
              </div>
              <div style={{ width: 180, textAlign: "center", padding: "16px 0", borderRadius: 12, border: `1px solid ${theme.line}`, color: theme.ink, fontWeight: 700, fontSize: 26 }}>
                ✗ Wrong
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
      <Caption step={3} text="Not sure? It asks the teacher — never a guessed grade" />
    </SceneWrap>
  );
};

const S5Report: React.FC = () => {
  const frame = useCurrentFrame();
  const card = useEnter(6, 14);
  const line = interpolate(frame, [28, 78], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.ease) });
  const pts = [
    [0, 78],
    [130, 60],
    [260, 62],
    [390, 84],
    [520, 70],
    [650, 88],
  ];
  const W = 650;
  const H = 130;
  const path = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${H - (p[1] / 100) * H}`)
    .join(" ");
  const mathBar = interpolate(line, [0, 1], [0, 85]);
  const sciBar = interpolate(line, [0, 1], [0, 70]);
  return (
    <SceneWrap>
      <Confetti start={20} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <div
            style={{
              width: 720,
              background: theme.white,
              borderRadius: 26,
              border: `1px solid ${theme.line}`,
              boxShadow: "0 26px 80px rgba(24,34,56,0.16)",
              padding: 36,
              opacity: card,
              transform: `translateY(${interpolate(card, [0, 1], [40, 0])}px)`,
              fontFamily: jakarta,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div>
                <div style={{ fontFamily: fraunces, fontSize: 34, fontWeight: 700, color: theme.ink }}>Aisha Putri</div>
                <div style={{ fontSize: 22, color: theme.inkSoft }}>Grade 4 · progress report</div>
              </div>
              <Chip tone="grow">🗓️ generated automatically</Chip>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 24 }}>
              <div style={{ fontFamily: fraunces, fontSize: 96, fontWeight: 700, color: theme.brand, lineHeight: 1 }}>80%</div>
              <svg width={W} height={H} style={{ overflow: "visible", marginBottom: 8 }}>
                <path d={path} fill="none" stroke={theme.brand} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray={2000} strokeDashoffset={2000 - line * 2000} />
              </svg>
            </div>
            <div style={{ marginTop: 10 }}>
              {[["Math", mathBar, theme.info], ["Science", sciBar, theme.grow]].map(([name, v, c]) => (
                <div key={String(name)} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, marginBottom: 6 }}>
                    <b style={{ color: theme.ink }}>{name as string}</b>
                    <span style={{ color: theme.inkSoft }}>{Math.round(v as number)}%</span>
                  </div>
                  <div style={{ height: 16, background: theme.paper, borderRadius: 999 }}>
                    <div style={{ width: `${v}%`, height: 16, background: c as string, borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Mascot pose="celebrate" size={280} delay={4} />
        </div>
      </AbsoluteFill>
      <Caption step={4} text="Parents get a warm progress report — automatically" />
    </SceneWrap>
  );
};

const S6Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const bubble = useEnter(6, 14);
  // cross-fade from tutor moment to the outro
  const toOutro = interpolate(frame, [95, 120], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const wm = useEnter(120, 14);
  return (
    <SceneWrap bg={theme.ink}>
      {/* dark outro background gets revealed as toOutro rises */}
      <AbsoluteFill style={{ ...graphPaper(theme.paper), opacity: 1 - toOutro }} />
      {/* tutor moment */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - toOutro }}>
        <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
          <Mascot pose="happy" size={300} delay={2} />
          <div
            style={{
              position: "relative",
              background: theme.white,
              border: `1px solid ${theme.line}`,
              borderRadius: 24,
              padding: "26px 34px",
              boxShadow: "0 20px 60px rgba(24,34,56,0.12)",
              opacity: bubble,
              transform: `scale(${interpolate(bubble, [0, 1], [0.7, 1])})`,
              maxWidth: 560,
            }}
          >
            <div style={{ fontFamily: jakarta, fontSize: 30, color: theme.ink, lineHeight: 1.4 }}>
              Let’s add the ones: <b>7 + 8 = 15</b>. Great job! ✨
            </div>
          </div>
        </div>
      </AbsoluteFill>
      {/* outro */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: toOutro }}>
        <Mascot pose="wave" size={300} delay={118} />
        <div style={{ fontFamily: fraunces, fontWeight: 700, fontSize: 96, color: "#fff", marginTop: 6, opacity: wm }}>
          Homework Studio
        </div>
        <div style={{ fontFamily: jakarta, fontSize: 36, color: "rgba(255,255,255,0.85)", marginTop: 4, opacity: wm }}>
          Serious software, made playful.
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 28, opacity: wm }}>
          {["Self-hosted", "Go · React", "GLM vision + auto reports"].map((tg) => (
            <div key={tg} style={{ fontFamily: jakarta, fontWeight: 700, fontSize: 24, color: "#fff", background: "rgba(255,255,255,0.14)", padding: "10px 20px", borderRadius: 999 }}>
              {tg}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </SceneWrap>
  );
};

/* ---------------- composition ---------------- */

const S = [
  { c: S1Intro, d: 150 },
  { c: S2Snap, d: 190 },
  { c: S3Read, d: 220 },
  { c: S4Gate, d: 180 },
  { c: S5Report, d: 210 },
  { c: S6Outro, d: 280 },
];

export const promoDuration = S.reduce((a, s) => a + s.d, 0);

export const Promo: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper }}>
      {S.map((s, i) => {
        const el = (
          <Sequence key={i} from={from} durationInFrames={s.d}>
            <s.c />
          </Sequence>
        );
        from += s.d;
        return el;
      })}
    </AbsoluteFill>
  );
};
