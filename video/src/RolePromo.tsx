import { AbsoluteFill, Audio, Sequence, interpolate, Easing, staticFile, useCurrentFrame } from "remotion";
import { theme } from "./theme";
import { fraunces, jakarta } from "./fonts";
import { Mascot, type Pose } from "./Mascot";
import { SceneWrap, Caption, Chip, Confetti, HomeworkPaper, useEnter, Sparkle } from "./Promo";

export type Role = "teacher" | "student" | "admin";

/* intro + outro shared */

const Intro: React.FC<{ title: string; sub: string; pose: Pose }> = ({ title, sub, pose }) => {
  const t = useEnter(16, 13);
  const s = useEnter(30, 16);
  return (
    <SceneWrap>
      <Sparkle x={360} y={240} delay={10} scale={1.1} />
      <Sparkle x={1500} y={720} delay={40} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Mascot pose={pose} size={320} delay={4} />
        <div style={{ fontFamily: fraunces, fontWeight: 700, fontSize: 96, color: theme.ink, marginTop: 8, opacity: t, transform: `translateY(${interpolate(t, [0, 1], [40, 0])}px)` }}>
          {title}
        </div>
        <div style={{ fontFamily: jakarta, fontSize: 38, color: theme.inkSoft, fontWeight: 500, marginTop: 6, opacity: s }}>{sub}</div>
      </AbsoluteFill>
    </SceneWrap>
  );
};

const Outro: React.FC<{ tagline: string; pose: Pose }> = ({ tagline, pose }) => {
  const wm = useEnter(10, 14);
  return (
    <SceneWrap bg={theme.ink}>
      <Confetti start={6} n={50} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Mascot pose={pose} size={280} delay={2} />
        <div style={{ fontFamily: fraunces, fontWeight: 700, fontSize: 84, color: "#fff", marginTop: 8, opacity: wm }}>{tagline}</div>
        <div style={{ marginTop: 24, opacity: wm }}>
          <div style={{ fontFamily: jakarta, fontWeight: 800, fontSize: 30, color: theme.ink, background: "#fff", padding: "14px 30px", borderRadius: 999 }}>
            📓 Homework Studio
          </div>
        </div>
      </AbsoluteFill>
    </SceneWrap>
  );
};

/* per-role feature scenes */

const TeacherFeature: React.FC = () => {
  const frame = useCurrentFrame();
  const scan = interpolate(frame, [10, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.ease) });
  return (
    <SceneWrap>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
          <Mascot pose="point" size={260} delay={2} />
          <div style={{ position: "relative" }}>
            <Chip style={{ position: "absolute", top: -54, left: 8 }}>✨ read in seconds</Chip>
            <HomeworkPaper scan={scan} showMarks />
          </div>
        </div>
      </AbsoluteFill>
      <Caption text="Homework grades itself — you just confirm what's unclear" />
    </SceneWrap>
  );
};

const OptionPill: React.FC<{ text: string; correct?: boolean; show: boolean }> = ({ text, correct, show }) => (
  <div style={{ padding: "16px 20px", borderRadius: 14, fontFamily: jakarta, fontSize: 28, fontWeight: 600,
    border: `1px solid ${show && correct ? theme.grow : theme.line}`,
    background: show && correct ? theme.growSoft : theme.white, color: theme.ink }}>
    {text} {show && correct ? "✓" : ""}
  </div>
);

const StudentFeature: React.FC = () => {
  const card = useEnter(6, 14);
  const reveal = useCurrentFrame() > 70;
  return (
    <SceneWrap>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
          <div style={{ width: 660, background: theme.white, borderRadius: 24, border: `1px solid ${theme.line}`, borderLeft: `10px solid ${theme.brand}`, boxShadow: "0 24px 70px rgba(24,34,56,0.14)", padding: 34, opacity: card, transform: `translateY(${interpolate(card, [0, 1], [30, 0])}px)`, fontFamily: jakarta }}>
            <Chip tone="grow" style={{ marginBottom: 16 }}>✏️ fresh practice</Chip>
            <div style={{ fontFamily: fraunces, fontSize: 34, fontWeight: 700, color: theme.ink, marginBottom: 18 }}>
              Which gas do plants take in?
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <OptionPill text="Oxygen" show={reveal} />
              <OptionPill text="Carbon dioxide" correct show={reveal} />
              <OptionPill text="Nitrogen" show={reveal} />
              <OptionPill text="Hydrogen" show={reveal} />
            </div>
            <div style={{ marginTop: 18, color: theme.brandDark, fontWeight: 700, fontSize: 24 }}>💡 show me how</div>
          </div>
          <Mascot pose="happy" size={260} delay={3} />
        </div>
      </AbsoluteFill>
      <Caption text="Fresh questions, instant feedback, and a tutor that shows the steps" />
    </SceneWrap>
  );
};

const AdminFeature: React.FC = () => {
  const card = useEnter(6, 14);
  const feed = ["Aisha · 80%", "Budi · 60%", "Dewi · 60%"];
  const frame = useCurrentFrame();
  return (
    <SceneWrap>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <Mascot pose="point" size={250} delay={2} />
          <div style={{ width: 720, background: theme.white, borderRadius: 24, border: `1px solid ${theme.line}`, borderLeft: `10px solid ${theme.grow}`, boxShadow: "0 24px 70px rgba(24,34,56,0.14)", padding: 34, opacity: card, fontFamily: jakarta }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <span style={{ height: 14, width: 14, borderRadius: 999, background: theme.grow, display: "inline-block" }} />
              <span style={{ fontFamily: fraunces, fontSize: 30, fontWeight: 700, color: theme.ink }}>Reports write themselves</span>
            </div>
            <div style={{ display: "flex", gap: 30, marginBottom: 20 }}>
              {[["5", "students"], ["71%", "avg score"], ["5", "auto reports"]].map(([v, l]) => (
                <div key={l}>
                  <div style={{ fontFamily: fraunces, fontSize: 46, fontWeight: 700, color: theme.ink }}>{v}</div>
                  <div style={{ fontSize: 20, color: theme.inkSoft }}>{l}</div>
                </div>
              ))}
            </div>
            {feed.map((f, i) => {
              const show = frame > 40 + i * 18;
              return (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", opacity: show ? 1 : 0, transform: `translateX(${show ? 0 : -12}px)`, transition: "all .3s" }}>
                  <span style={{ height: 10, width: 10, borderRadius: 999, background: theme.grow }} />
                  <span style={{ fontSize: 24, color: theme.ink }}>🗓️ Report generated · {f}</span>
                  <span style={{ marginLeft: "auto", fontSize: 20, color: theme.inkSoft }}>just now</span>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
      <Caption text="See every class — and let the reports run themselves" />
    </SceneWrap>
  );
};

const CONFIG: Record<Role, { title: string; sub: string; tagline: string; intro: Pose; outro: Pose; Feature: React.FC }> = {
  teacher: { title: "For teachers", sub: "Grade a class in minutes.", tagline: "Less marking, more teaching.", intro: "wave", outro: "celebrate", Feature: TeacherFeature },
  student: { title: "For students", sub: "Practice that feels like a game.", tagline: "Learning you want to do.", intro: "happy", outro: "celebrate", Feature: StudentFeature },
  admin: { title: "For your school", sub: "Everyone's progress, in one place.", tagline: "The whole school, on autopilot.", intro: "point", outro: "celebrate", Feature: AdminFeature },
};

export const rolePromoDuration = 470;

export const RolePromo: React.FC<{ role?: Role }> = ({ role = "teacher" }) => {
  const cfg = CONFIG[role];
  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper }}>
      <Sequence from={0} durationInFrames={130}>
        <Intro title={cfg.title} sub={cfg.sub} pose={cfg.intro} />
        <Audio src={staticFile(`vo/${role}_1.mp3`)} />
      </Sequence>
      <Sequence from={130} durationInFrames={180}>
        <cfg.Feature />
        <Audio src={staticFile(`vo/${role}_2.mp3`)} />
      </Sequence>
      <Sequence from={310} durationInFrames={160}>
        <Outro tagline={cfg.tagline} pose={cfg.outro} />
        <Audio src={staticFile(`vo/${role}_3.mp3`)} />
      </Sequence>
    </AbsoluteFill>
  );
};
