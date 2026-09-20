import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import type { CSSProperties, ReactNode } from "react";
import { theme } from "./theme";
import { fraunces, jakarta } from "./fonts";
import { Mascot } from "./Mascot";
import { SceneWrap, Caption, Chip, Sparkle, Confetti, useEnter } from "./Promo";

const TOTAL_STEPS = 6;

const Center: React.FC<{ children: ReactNode; gap?: number }> = ({ children, gap }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap }}>{children}</AbsoluteFill>
);

const StepLabel: React.FC<{ n: number; title: string }> = ({ n, title }) => {
  const e = useEnter(4, 14);
  return (
    <div style={{ position: "absolute", top: 60, left: 0, right: 0, textAlign: "center", opacity: e, transform: `translateY(${interpolate(e, [0, 1], [-16, 0])}px)` }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 14, background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 999, padding: "10px 24px 10px 12px", boxShadow: "0 8px 30px rgba(24,34,56,0.08)", fontFamily: jakarta }}>
        <span style={{ fontFamily: fraunces, fontWeight: 700, fontSize: 20, color: "#fff", background: theme.brand, borderRadius: 999, padding: "4px 16px" }}>Step {n}</span>
        <span style={{ fontWeight: 700, fontSize: 28, color: theme.ink }}>{title}</span>
        <span style={{ fontSize: 20, color: theme.inkSoft }}>of {TOTAL_STEPS}</span>
      </div>
    </div>
  );
};

const Card: React.FC<{ children: ReactNode; style?: CSSProperties; spine?: string }> = ({ children, style, spine }) => (
  <div style={{ background: theme.white, borderRadius: 24, border: `1px solid ${theme.line}`, borderLeft: spine ? `10px solid ${spine}` : undefined, boxShadow: "0 24px 70px rgba(24,34,56,0.14)", padding: 32, fontFamily: jakarta, ...style }}>{children}</div>
);

const Meter: React.FC<{ v: number; c: string; w?: number }> = ({ v, c, w = 220 }) => (
  <div style={{ width: w, height: 14, background: theme.paper, borderRadius: 999 }}>
    <div style={{ width: `${Math.min(100, v)}%`, height: 14, background: c, borderRadius: 999 }} />
  </div>
);

/* --- 1. Intro --- */
const Intro: React.FC = () => {
  const title = useEnter(12, 13);
  const tag = useEnter(26, 16);
  return (
    <SceneWrap>
      <Sparkle x={360} y={230} delay={8} scale={1.2} />
      <Sparkle x={1500} y={300} delay={24} />
      <Sparkle x={1420} y={760} delay={44} scale={0.9} />
      <Center>
        <Mascot pose="wave" size={330} delay={4} />
        <div style={{ fontFamily: fraunces, fontWeight: 700, fontSize: 100, color: theme.ink, marginTop: 8, opacity: title, transform: `translateY(${interpolate(title, [0, 1], [40, 0])}px)` }}>Homework Studio</div>
        <div style={{ fontSize: 38, color: theme.inkSoft, fontWeight: 500, marginTop: 6, opacity: tag }}>From your material to learning kids love.</div>
      </Center>
    </SceneWrap>
  );
};

/* --- 2. Step 1: Upload material --- */
const MaterialCard: React.FC = () => (
  <Card spine={theme.brand} style={{ width: 460 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <span style={{ fontSize: 40 }}>📄</span>
      <div>
        <div style={{ fontFamily: fraunces, fontSize: 30, fontWeight: 700, color: theme.ink }}>Fractions — Grade 4</div>
        <div style={{ fontSize: 20, color: theme.inkSoft }}>lesson material</div>
      </div>
    </div>
    {[100, 92, 96, 70].map((w, i) => (
      <div key={i} style={{ height: 12, width: `${w}%`, background: theme.paper, borderRadius: 999, marginBottom: 12 }} />
    ))}
  </Card>
);

const UploadMaterial: React.FC = () => {
  const e = useEnter(8, 15);
  return (
    <SceneWrap>
      <StepLabel n={1} title="Upload material" />
      <Center>
        <div style={{ display: "flex", alignItems: "center", gap: 50 }}>
          <Mascot pose="point" size={280} delay={4} />
          <div style={{ position: "relative", opacity: e, transform: `translateX(${interpolate(e, [0, 1], [90, 0])}px) rotate(${interpolate(e, [0, 1], [5, -2])}deg)` }}>
            <Chip style={{ position: "absolute", top: -52, left: 10 }}>📚 PDF · image · text</Chip>
            <MaterialCard />
          </div>
        </div>
      </Center>
      <Caption text="Upload your teaching material" />
    </SceneWrap>
  );
};

/* --- 3. Step 2: AI builds three things --- */
const MiniResult: React.FC<{ icon: string; title: string; sub: string; delay: number }> = ({ icon, title, sub, delay }) => {
  const e = useEnter(delay, 13);
  return (
    <Card style={{ width: 300, opacity: e, transform: `translateY(${interpolate(e, [0, 1], [40, 0])}px)`, padding: 26 }}>
      <div style={{ fontSize: 44 }}>{icon}</div>
      <div style={{ fontFamily: fraunces, fontSize: 26, fontWeight: 700, color: theme.ink, marginTop: 8 }}>{title}</div>
      <div style={{ fontSize: 20, color: theme.inkSoft, marginTop: 2 }}>{sub}</div>
    </Card>
  );
};

const AIBuilds: React.FC = () => {
  const ai = useEnter(8, 14);
  return (
    <SceneWrap>
      <StepLabel n={2} title="AI builds it" />
      <Center gap={28}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, opacity: ai, background: theme.brandSoft, color: theme.brandDark, fontFamily: jakarta, fontWeight: 800, fontSize: 28, padding: "12px 26px", borderRadius: 999 }}>
          ✨ the AI reads it…
        </div>
        <div style={{ display: "flex", gap: 26 }}>
          <MiniResult icon="📝" title="A custom exam" sub="grounded in it" delay={22} />
          <MiniResult icon="📄" title="Teaching notes" sub="a lesson summary" delay={34} />
          <MiniResult icon="💬" title="An AI tutor" sub="knows your class" delay={46} />
        </div>
      </Center>
      <Caption text="An exam, teaching notes & a tutor" />
    </SceneWrap>
  );
};

/* --- 4. Step 3: Review & publish --- */
const ReviewPublish: React.FC = () => {
  const card = useEnter(8, 14);
  const tap = useEnter(120, 10);
  return (
    <SceneWrap>
      <StepLabel n={3} title="Review & publish" />
      <Center>
        <div style={{ display: "flex", alignItems: "center", gap: 44, opacity: card, transform: `translateY(${interpolate(card, [0, 1], [30, 0])}px)` }}>
          <Mascot pose="point" size={240} delay={4} />
          <Card spine={theme.flag} style={{ width: 660 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: fraunces, fontSize: 30, fontWeight: 700, color: theme.ink }}>Fractions — Exam</span>
              <Chip tone="flag">review · 57%</Chip>
            </div>
            <div style={{ background: theme.paper, borderRadius: 14, padding: 20, margin: "18px 0", fontSize: 27 }}>
              <b>Q4.</b> Which is closest to one whole? <span style={{ color: theme.grow, fontWeight: 700 }}>3/4 ✓</span>
            </div>
            <div style={{ textAlign: "center", padding: "16px 0", borderRadius: 12, background: theme.brand, color: "#fff", fontWeight: 800, fontSize: 27, transform: `scale(${interpolate(tap, [0, 1], [1, 1.05])})`, boxShadow: tap > 0.5 ? `0 0 0 5px ${theme.brandSoft}` : "none" }}>
              ✓ Approve &amp; publish
            </div>
          </Card>
        </div>
      </Center>
      <Caption text="You review, then publish — you're in control" />
    </SceneWrap>
  );
};

/* --- 5. Step 4: Students level up --- */
const Ring: React.FC<{ pct: number }> = ({ pct }) => {
  const r = 52;
  const c = 2 * Math.PI * r;
  const frame = useCurrentFrame();
  const p = interpolate(frame, [10, 60], [0, pct], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "relative", width: 140, height: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={140} height={140} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={70} cy={70} r={r} fill="none" stroke={theme.line} strokeWidth={12} />
        <circle cx={70} cy={70} r={r} fill="none" stroke={theme.brand} strokeWidth={12} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (p / 100) * c} />
      </svg>
      <div style={{ position: "absolute", textAlign: "center" }}>
        <div style={{ fontFamily: fraunces, fontWeight: 700, fontSize: 30, color: theme.ink, lineHeight: 1 }}>Lv 3</div>
      </div>
    </div>
  );
};

const StudentsLevelUp: React.FC = () => {
  const card = useEnter(8, 14);
  const badges = useEnter(40, 14);
  return (
    <SceneWrap>
      <StepLabel n={4} title="Students level up" />
      <Confetti start={30} n={40} />
      <Center>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <Mascot pose="happy" size={280} delay={2} />
          <Card spine={theme.brand} style={{ width: 700, opacity: card, transform: `translateY(${interpolate(card, [0, 1], [40, 0])}px)` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
              <Ring pct={72} />
              <div>
                <div style={{ fontFamily: fraunces, fontWeight: 700, fontSize: 44, color: theme.ink }}>254 XP</div>
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <Chip tone="flag">🔥 5-day streak</Chip>
                  <Chip tone="grow">🎯 92% avg</Chip>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 22, opacity: badges }}>
              {["🎉", "🥇", "🎯", "📚", "🧭", "🔥"].map((b) => (
                <div key={b} style={{ width: 60, height: 60, borderRadius: 14, background: theme.growSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>{b}</div>
              ))}
            </div>
          </Card>
        </div>
      </Center>
      <Caption text="Graded instantly — and they level up" />
    </SceneWrap>
  );
};

/* --- 6. Step 5: Parents --- */
const Parents: React.FC = () => {
  const card = useEnter(8, 14);
  const tip = useEnter(52, 14);
  return (
    <SceneWrap>
      <StepLabel n={5} title="Parents see it all" />
      <Center gap={24}>
        <Card spine={theme.grow} style={{ width: 760, opacity: card, transform: `translateY(${interpolate(card, [0, 1], [30, 0])}px)` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: fraunces, fontSize: 32, fontWeight: 700, color: theme.ink }}>Aisha Putri</div>
              <div style={{ fontSize: 20, color: theme.inkSoft }}>Grade 4</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Chip>92% avg</Chip>
              <Chip tone="flag">🔥 5d</Chip>
              <Chip tone="grow">Lv 3</Chip>
            </div>
          </div>
          {[["Math", 92, theme.info], ["Science", 74, theme.grow]].map(([n, v, c]) => (
            <div key={String(n)} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, marginBottom: 6 }}>
                <b style={{ color: theme.ink }}>{n as string}</b><span style={{ color: theme.inkSoft }}>{v as number}%</span>
              </div>
              <Meter v={v as number} c={c as string} w={690} />
            </div>
          ))}
        </Card>
        <div style={{ display: "flex", alignItems: "center", gap: 14, opacity: tip, background: theme.brandSoft, borderRadius: 18, padding: "18px 24px", maxWidth: 760, fontFamily: jakarta }}>
          <span style={{ fontSize: 30 }}>💡</span>
          <span style={{ fontSize: 25, color: theme.ink }}>Aisha is flying in Math — 10 fun minutes of Science together would help most.</span>
        </div>
      </Center>
      <Caption text="Grades, effort — and how to help" />
    </SceneWrap>
  );
};

/* --- 7. Step 6: Admin / school --- */
const Sparkline: React.FC = () => {
  const frame = useCurrentFrame();
  const line = interpolate(frame, [16, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pts = [[0, 72], [90, 64], [180, 70], [270, 67], [360, 67]];
  const H = 90;
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${H - (p[1] / 100) * H}`).join(" ");
  return (
    <svg width={360} height={H} style={{ overflow: "visible" }}>
      <path d={path} fill="none" stroke={theme.brand} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={1200} strokeDashoffset={1200 - line * 1200} />
    </svg>
  );
};

const AdminSchool: React.FC = () => {
  const card = useEnter(8, 14);
  return (
    <SceneWrap>
      <StepLabel n={6} title="The school at a glance" />
      <Center gap={22}>
        <div style={{ display: "flex", gap: 14, opacity: card }}>
          {[["🔥", "6", "active today"], ["⚡", "4.7d", "avg streak"], ["✨", "1,022", "total XP"], ["🏅", "14", "badges"]].map(([ic, v, l]) => (
            <Card key={l} style={{ width: 210, padding: 22, textAlign: "center" }}>
              <div style={{ fontSize: 32 }}>{ic}</div>
              <div style={{ fontFamily: fraunces, fontWeight: 700, fontSize: 34, color: theme.ink }}>{v}</div>
              <div style={{ fontSize: 18, color: theme.inkSoft }}>{l}</div>
            </Card>
          ))}
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center", opacity: card }}>
          <Card style={{ padding: 24 }}>
            <div style={{ fontSize: 20, color: theme.inkSoft, marginBottom: 6 }}>School trend · 14 days</div>
            <Sparkline />
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Chip tone="flag">🧠 hardest: 36 ÷ 6 = ? · 18% correct</Chip>
            <Chip tone="grow">🗓️ reports generated automatically</Chip>
          </div>
        </div>
      </Center>
      <Caption text="Engagement, trends & automation" />
    </SceneWrap>
  );
};

/* --- 8. CTA --- */
const CTA: React.FC = () => {
  const wm = useEnter(10, 14);
  return (
    <SceneWrap bg={theme.ink}>
      <Confetti start={6} n={60} />
      <Center>
        <Mascot pose="celebrate" size={280} delay={2} />
        <div style={{ display: "flex", gap: 14, marginTop: 18, marginBottom: 10, opacity: wm }}>
          {["Less busywork", "Real visibility", "Kids love it"].map((t) => (
            <div key={t} style={{ fontFamily: jakarta, fontWeight: 700, fontSize: 26, color: theme.ink, background: "#fff", padding: "10px 22px", borderRadius: 999 }}>{t}</div>
          ))}
        </div>
        <div style={{ fontFamily: fraunces, fontWeight: 700, fontSize: 86, color: "#fff", marginTop: 14, opacity: wm }}>Homework Studio</div>
        <div style={{ fontFamily: jakarta, fontSize: 34, color: "rgba(255,255,255,0.85)", marginTop: 4, opacity: wm }}>From your material to learning kids love.</div>
      </Center>
    </SceneWrap>
  );
};

// Durations = each narration line + tail (fps 30). VO durations were measured from edge-tts.
const S = [
  { c: Intro, d: 254 },
  { c: UploadMaterial, d: 247 },
  { c: AIBuilds, d: 269 },
  { c: ReviewPublish, d: 308 },
  { c: StudentsLevelUp, d: 281 },
  { c: Parents, d: 236 },
  { c: AdminSchool, d: 279 },
  { c: CTA, d: 209 },
];

export const explainerDuration = S.reduce((a, s) => a + s.d, 0);

export const Explainer: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper }}>
      {S.map((s, i) => {
        const el = (
          <Sequence key={i} from={from} durationInFrames={s.d}>
            <s.c />
            <Audio src={staticFile(`vo/explainer_${i + 1}.mp3`)} />
          </Sequence>
        );
        from += s.d;
        return el;
      })}
    </AbsoluteFill>
  );
};
