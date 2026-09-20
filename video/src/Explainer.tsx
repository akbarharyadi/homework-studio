import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  Easing,
} from "remotion";
import type { ReactNode } from "react";
import { theme } from "./theme";
import { fraunces, jakarta } from "./fonts";
import { Mascot } from "./Mascot";
import { SceneWrap, Caption, Chip, HomeworkPaper, useEnter, Confetti } from "./Promo";

const TOTAL_STEPS = 5;

const StepLabel: React.FC<{ n: number; title: string }> = ({ n, title }) => {
  const e = useEnter(4, 14);
  return (
    <div style={{ position: "absolute", top: 64, left: 0, right: 0, textAlign: "center", opacity: e, transform: `translateY(${interpolate(e, [0, 1], [-16, 0])}px)` }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 14, background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 999, padding: "10px 24px 10px 12px", boxShadow: "0 8px 30px rgba(24,34,56,0.08)", fontFamily: jakarta }}>
        <span style={{ fontFamily: fraunces, fontWeight: 700, fontSize: 20, color: "#fff", background: theme.brand, borderRadius: 999, padding: "4px 16px" }}>Step {n}</span>
        <span style={{ fontWeight: 700, fontSize: 28, color: theme.ink }}>{title}</span>
        <span style={{ fontSize: 20, color: theme.inkSoft }}>of {TOTAL_STEPS}</span>
      </div>
    </div>
  );
};

const Center: React.FC<{ children: ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>{children}</AbsoluteFill>
);

/* --- 1. Problem --- */
const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const e = useEnter(6, 14);
  const wobble = Math.sin(frame / 14) * 1.5;
  return (
    <SceneWrap>
      <Center>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 70 }}>
          <Mascot pose="think" size={280} delay={2} />
          {/* stack of homework */}
          <div style={{ position: "relative", width: 300, height: 320, opacity: e }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ position: "absolute", bottom: i * 44, left: 20 + (i % 2) * 12, width: 260, height: 54, background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 10, boxShadow: "0 6px 18px rgba(24,34,56,0.06)", transform: `rotate(${(i % 2 ? 1 : -1) * (1 + wobble)}deg)` }} />
            ))}
            <div style={{ position: "absolute", top: -30, right: -20, fontSize: 60 }}>⏰</div>
          </div>
        </div>
        <div style={{ marginTop: 40, textAlign: "center", opacity: e }}>
          <div style={{ fontFamily: fraunces, fontWeight: 700, fontSize: 64, color: theme.ink }}>Hours of marking.</div>
          <div style={{ fontFamily: jakarta, fontSize: 34, color: theme.inkSoft, marginTop: 6 }}>And parents left in the dark.</div>
        </div>
      </Center>
    </SceneWrap>
  );
};

/* --- 2. Solution --- */
const Solution: React.FC = () => {
  const t = useEnter(10, 14);
  return (
    <SceneWrap>
      <Center>
        <Mascot pose="wave" size={300} delay={2} />
        <div style={{ fontFamily: fraunces, fontWeight: 700, fontSize: 88, color: theme.ink, marginTop: 8, opacity: t }}>Homework Studio</div>
        <div style={{ fontFamily: jakarta, fontSize: 36, color: theme.inkSoft, marginTop: 6, opacity: t }}>Here's how it works — step by step.</div>
      </Center>
    </SceneWrap>
  );
};

/* --- 3. Step 1: Snap --- */
const Step1: React.FC = () => {
  const paper = useEnter(8, 15);
  return (
    <SceneWrap>
      <StepLabel n={1} title="Snap a photo" />
      <Center>
        <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
          <Mascot pose="point" size={260} delay={4} />
          <div style={{ transform: `translateX(${interpolate(paper, [0, 1], [80, 0])}px)`, opacity: paper, position: "relative" }}>
            <Chip style={{ position: "absolute", top: -52, left: 8 }}>📸 photo or PDF</Chip>
            <HomeworkPaper />
          </div>
        </div>
      </Center>
      <Caption text="A worksheet, or even a page from a book" />
    </SceneWrap>
  );
};

/* --- 4. Step 2: Read --- */
const Step2: React.FC = () => {
  const frame = useCurrentFrame();
  const scan = interpolate(frame, [30, 150], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.ease) });
  const conf = Math.round(interpolate(frame, [40, 150], [60, 98], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <SceneWrap>
      <StepLabel n={2} title="Read every answer" />
      <Center>
        <div style={{ position: "relative" }}>
          <Chip style={{ position: "absolute", top: -52, left: 8 }}>👁️ reading… {conf}% sure</Chip>
          <HomeworkPaper scan={scan} showMarks />
        </div>
      </Center>
      <Caption text="Each answer read — with a confidence score" />
    </SceneWrap>
  );
};

/* --- 5. Step 3: Grade --- */
const Step3: React.FC = () => {
  const frame = useCurrentFrame();
  const pct = Math.round(interpolate(frame, [30, 110], [0, 80], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const e = useEnter(28, 12);
  return (
    <SceneWrap>
      <StepLabel n={3} title="Grade instantly" />
      <Center>
        <div style={{ display: "flex", alignItems: "center", gap: 50 }}>
          <HomeworkPaper scan={1} showMarks />
          <div style={{ textAlign: "center", opacity: e, transform: `scale(${interpolate(e, [0, 1], [0.6, 1])})` }}>
            <div style={{ fontFamily: fraunces, fontWeight: 700, fontSize: 150, color: theme.grow, lineHeight: 1 }}>{pct}%</div>
            <div style={{ fontFamily: jakarta, fontSize: 30, color: theme.inkSoft }}>a class in seconds</div>
          </div>
        </div>
      </Center>
      <Caption text="Correct answers scored automatically" />
    </SceneWrap>
  );
};

/* small review card for the gate */
const ReviewCard: React.FC<{ confirm: number }> = ({ confirm }) => (
  <div style={{ width: 640, background: theme.white, borderRadius: 24, border: `1px solid ${theme.line}`, borderLeft: `10px solid ${theme.flag}`, boxShadow: "0 24px 70px rgba(24,34,56,0.14)", padding: 34, fontFamily: jakarta }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontFamily: fraunces, fontSize: 30, fontWeight: 700, color: theme.ink }}>Teacher review</span>
      <Chip tone="flag">read 56% sure</Chip>
    </div>
    <div style={{ background: theme.paper, borderRadius: 14, padding: 20, margin: "18px 0", fontSize: 28 }}>
      <b>Q3.</b> 5 + 8 = <span style={{ color: theme.inkSoft }}>read "13 (unclear)"</span>
    </div>
    <div style={{ display: "flex", gap: 14 }}>
      <div style={{ flex: 1, textAlign: "center", padding: "16px 0", borderRadius: 12, background: theme.grow, color: "#fff", fontWeight: 800, fontSize: 26, transform: `scale(${interpolate(confirm, [0, 1], [1, 1.06])})`, boxShadow: confirm > 0.5 ? `0 0 0 4px ${theme.growSoft}` : "none" }}>✓ Correct</div>
      <div style={{ width: 180, textAlign: "center", padding: "16px 0", borderRadius: 12, border: `1px solid ${theme.line}`, color: theme.ink, fontWeight: 700, fontSize: 26 }}>✗ Wrong</div>
    </div>
  </div>
);

/* --- 6. Step 4: Gate --- */
const Step4: React.FC = () => {
  const card = useEnter(8, 14);
  const tap = useEnter(90, 10);
  return (
    <SceneWrap>
      <StepLabel n={4} title="Ask when unsure" />
      <Center>
        <div style={{ display: "flex", alignItems: "center", gap: 44, opacity: card, transform: `translateY(${interpolate(card, [0, 1], [30, 0])}px)` }}>
          <Mascot pose="point" size={240} delay={4} />
          <ReviewCard confirm={tap} />
        </div>
      </Center>
      <Caption text="It never guesses a grade — it asks the teacher" />
    </SceneWrap>
  );
};

/* --- 7. Step 5: Report --- */
const Step5: React.FC = () => {
  const frame = useCurrentFrame();
  const card = useEnter(8, 14);
  const fill = interpolate(frame, [30, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.ease) });
  return (
    <SceneWrap>
      <StepLabel n={5} title="Auto progress report" />
      <Confetti start={40} n={40} />
      <Center>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <div style={{ width: 700, background: theme.white, borderRadius: 26, border: `1px solid ${theme.line}`, boxShadow: "0 26px 80px rgba(24,34,56,0.16)", padding: 36, opacity: card, transform: `translateY(${interpolate(card, [0, 1], [40, 0])}px)`, fontFamily: jakarta }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontFamily: fraunces, fontSize: 34, fontWeight: 700, color: theme.ink }}>Aisha Putri</div>
                <div style={{ fontSize: 22, color: theme.inkSoft }}>Grade 4 · progress report</div>
              </div>
              <Chip tone="grow">🗓️ generated automatically</Chip>
            </div>
            <div style={{ fontFamily: fraunces, fontSize: 84, fontWeight: 700, color: theme.brand, lineHeight: 1, marginBottom: 16 }}>80%</div>
            {[["Math", 85 * fill, theme.info], ["Science", 70 * fill, theme.grow]].map(([n, v, c]) => (
              <div key={String(n)} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, marginBottom: 6 }}>
                  <b style={{ color: theme.ink }}>{n as string}</b><span style={{ color: theme.inkSoft }}>{Math.round(v as number)}%</span>
                </div>
                <div style={{ height: 16, background: theme.paper, borderRadius: 999 }}>
                  <div style={{ width: `${v}%`, height: 16, background: c as string, borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
          <Mascot pose="celebrate" size={260} delay={6} />
        </div>
      </Center>
      <Caption text="A warm report for every child, every week" />
    </SceneWrap>
  );
};

/* --- 8. Flag --- */
const FlagScene: React.FC = () => {
  const card = useEnter(8, 14);
  return (
    <SceneWrap>
      <Center>
        <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
          <Mascot pose="point" size={250} delay={2} />
          <div style={{ width: 620, background: theme.white, borderRadius: 24, border: `1px solid ${theme.line}`, borderLeft: `10px solid ${theme.flag}`, boxShadow: "0 24px 70px rgba(24,34,56,0.14)", padding: 34, opacity: card, transform: `translateY(${interpolate(card, [0, 1], [30, 0])}px)`, fontFamily: jakarta }}>
            <div style={{ fontFamily: fraunces, fontSize: 30, fontWeight: 700, color: theme.ink, marginBottom: 16 }}>⚠️ Needs attention</div>
            {["Budi · 60%", "Dewi · 58%"].map((s) => (
              <div key={s} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: theme.flagSoft, borderRadius: 12, padding: "14px 18px", marginBottom: 10, fontSize: 26 }}>
                <span style={{ color: theme.ink, fontWeight: 600 }}>{s.split(" · ")[0]}</span>
                <Chip tone="flag">{s.split(" · ")[1]}</Chip>
              </div>
            ))}
            <div style={{ marginTop: 6, fontSize: 22, color: "#a9701a", fontWeight: 700 }}>auto-flagged for extra support</div>
          </div>
        </div>
      </Center>
      <Caption text="Falling behind? It flags them — no one slips through" />
    </SceneWrap>
  );
};

/* --- 9. Tutor --- */
const TutorScene: React.FC = () => {
  const bubble = useEnter(8, 14);
  return (
    <SceneWrap>
      <Center>
        <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
          <Mascot pose="happy" size={300} delay={2} />
          <div style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 24, padding: "26px 34px", boxShadow: "0 20px 60px rgba(24,34,56,0.12)", opacity: bubble, transform: `scale(${interpolate(bubble, [0, 1], [0.7, 1])})`, maxWidth: 560 }}>
            <div style={{ fontFamily: jakarta, fontSize: 30, color: theme.ink, lineHeight: 1.4 }}>
              Let's add the ones: <b>7 + 8 = 15</b>. You've got this! ✨
            </div>
          </div>
        </div>
      </Center>
      <Caption text="Stuck? A friendly tutor shows the steps" />
    </SceneWrap>
  );
};

/* --- 10. CTA --- */
const CTA: React.FC = () => {
  const wm = useEnter(10, 14);
  return (
    <SceneWrap bg={theme.ink}>
      <Confetti start={6} n={60} />
      <Center>
        <Mascot pose="celebrate" size={280} delay={2} />
        <div style={{ display: "flex", gap: 14, marginTop: 18, marginBottom: 10, opacity: wm }}>
          {["Less marking", "Real visibility", "Kids enjoy it"].map((t) => (
            <div key={t} style={{ fontFamily: jakarta, fontWeight: 700, fontSize: 26, color: theme.ink, background: "#fff", padding: "10px 22px", borderRadius: 999 }}>{t}</div>
          ))}
        </div>
        <div style={{ fontFamily: fraunces, fontWeight: 700, fontSize: 82, color: "#fff", marginTop: 14, opacity: wm }}>Homework Studio</div>
        <div style={{ fontFamily: jakarta, fontSize: 34, color: "rgba(255,255,255,0.85)", marginTop: 4, opacity: wm }}>Learning that feels playful.</div>
      </Center>
    </SceneWrap>
  );
};

// Durations trimmed to each narration line + ~1.3s tail — no dead air between steps.
const S = [
  { c: Problem, d: 315 },
  { c: Solution, d: 225 },
  { c: Step1, d: 270 },
  { c: Step2, d: 300 },
  { c: Step3, d: 240 },
  { c: Step4, d: 390 },
  { c: Step5, d: 300 },
  { c: FlagScene, d: 220 },
  { c: TutorScene, d: 195 },
  { c: CTA, d: 360 },
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
