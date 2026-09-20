import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "./theme";

export interface RecapProps {
  studentName: string;
  gradeLevel: string;
  overallAverage: number;
  homeworksDone: number;
  streakDays: number;
  subjects: { name: string; average: number; color: string }[];
  timeline: number[];
  topSubject: string;
}

// A ~14s celebratory recap of a student's week, rendered entirely from their
// progress data — no screen recording. Feed a different JSON to get a different
// child's video (the backend can POST a student's stats straight into this).
export const Recap: React.FC<RecapProps> = (p) => {
  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg, fontFamily: theme.font }}>
      <Sequence durationInFrames={70}>
        <TitleScene name={p.studentName} grade={p.gradeLevel} />
      </Sequence>
      <Sequence from={70} durationInFrames={95}>
        <StatsScene average={p.overallAverage} done={p.homeworksDone} streak={p.streakDays} />
      </Sequence>
      <Sequence from={165} durationInFrames={100}>
        <SubjectsScene subjects={p.subjects} />
      </Sequence>
      <Sequence from={265} durationInFrames={100}>
        <TrendScene timeline={p.timeline} top={p.topSubject} />
      </Sequence>
      <Sequence from={365} durationInFrames={70}>
        <OutroScene name={p.studentName} />
      </Sequence>
    </AbsoluteFill>
  );
};

const Center: React.FC<{ children: React.ReactNode; bg?: string }> = ({ children, bg }) => (
  <AbsoluteFill
    style={{
      alignItems: "center",
      justifyContent: "center",
      padding: 80,
      background: bg,
    }}
  >
    {children}
  </AbsoluteFill>
);

function useEnter(delay = 0) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return { opacity: s, translateY: interpolate(s, [0, 1], [24, 0]) };
}

const TitleScene: React.FC<{ name: string; grade: string }> = ({ name, grade }) => {
  const e = useEnter(3);
  return (
    <Center bg={`linear-gradient(135deg, ${theme.brand}, ${theme.brandDark})`}>
      <div style={{ textAlign: "center", opacity: e.opacity, transform: `translateY(${e.translateY}px)` }}>
        <div style={{ fontSize: 90 }}>📚</div>
        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 30, marginTop: 12 }}>This week in Homework Studio</div>
        <div style={{ color: theme.white, fontSize: 84, fontWeight: 800, marginTop: 8 }}>{name} 🎉</div>
        <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 32, marginTop: 4 }}>{grade}</div>
      </div>
    </Center>
  );
};

const CountUp: React.FC<{ to: number; suffix?: string; color: string }> = ({ to, suffix = "", color }) => {
  const frame = useCurrentFrame();
  const val = Math.round(interpolate(frame, [0, 40], [0, to], { extrapolateRight: "clamp" }));
  return (
    <span style={{ color, fontSize: 130, fontWeight: 800 }}>
      {val}
      {suffix}
    </span>
  );
};

const StatsScene: React.FC<{ average: number; done: number; streak: number }> = ({ average, done, streak }) => {
  const e = useEnter(3);
  return (
    <Center>
      <div style={{ textAlign: "center", opacity: e.opacity }}>
        <CountUp to={average} suffix="%" color={theme.brand} />
        <div style={{ fontSize: 34, color: theme.slate, marginTop: -8 }}>overall average</div>
        <div style={{ display: "flex", gap: 40, marginTop: 48, justifyContent: "center" }}>
          <Pill emoji="✅" big={`${done}`} label="homeworks done" />
          <Pill emoji="🔥" big={`${streak}`} label="day streak" />
        </div>
      </div>
    </Center>
  );
};

const Pill: React.FC<{ emoji: string; big: string; label: string }> = ({ emoji, big, label }) => (
  <div
    style={{
      background: theme.white,
      borderRadius: 24,
      padding: "24px 40px",
      boxShadow: "0 10px 40px rgba(2,6,23,0.08)",
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: 44 }}>{emoji}</div>
    <div style={{ fontSize: 52, fontWeight: 800, color: theme.ink }}>{big}</div>
    <div style={{ fontSize: 24, color: theme.slate }}>{label}</div>
  </div>
);

const SubjectsScene: React.FC<{ subjects: { name: string; average: number; color: string }[] }> = ({ subjects }) => {
  const frame = useCurrentFrame();
  return (
    <Center>
      <div style={{ width: 900 }}>
        <div style={{ fontSize: 44, fontWeight: 800, color: theme.ink, marginBottom: 40 }}>Strength by subject</div>
        {subjects.map((s, i) => {
          const w = interpolate(frame, [10 + i * 12, 55 + i * 12], [0, s.average], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div key={s.name} style={{ marginBottom: 34 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, marginBottom: 10 }}>
                <span style={{ fontWeight: 700, color: theme.ink }}>{s.name}</span>
                <span style={{ color: theme.slate }}>{Math.round(w)}%</span>
              </div>
              <div style={{ height: 26, background: "#e2e8f0", borderRadius: 13 }}>
                <div style={{ width: `${w}%`, height: 26, background: s.color, borderRadius: 13 }} />
              </div>
            </div>
          );
        })}
      </div>
    </Center>
  );
};

const TrendScene: React.FC<{ timeline: number[]; top: string }> = ({ timeline, top }) => {
  const frame = useCurrentFrame();
  const W = 900;
  const H = 320;
  const max = 100;
  const pts = timeline.map((v, i) => ({
    x: (i / (timeline.length - 1)) * W,
    y: H - (v / max) * H,
  }));
  const shown = interpolate(frame, [10, 70], [0, pts.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const path = pts
    .slice(0, Math.ceil(shown))
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`)
    .join(" ");
  const e = useEnter(3);
  return (
    <Center>
      <div style={{ textAlign: "center", opacity: e.opacity }}>
        <div style={{ fontSize: 44, fontWeight: 800, color: theme.ink, marginBottom: 24 }}>
          Climbing — {timeline[0]}% → {timeline[timeline.length - 1]}%
        </div>
        <svg width={W} height={H} style={{ overflow: "visible" }}>
          <path d={path} fill="none" stroke={theme.brand} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
          {pts.slice(0, Math.ceil(shown)).map((pt, i) => (
            <circle key={i} cx={pt.x} cy={pt.y} r={9} fill={theme.brand} />
          ))}
        </svg>
        <div style={{ fontSize: 30, color: theme.slate, marginTop: 20 }}>Best subject this week: {top} 🌟</div>
      </div>
    </Center>
  );
};

const OutroScene: React.FC<{ name: string }> = ({ name }) => {
  const e = useEnter(3);
  return (
    <Center bg={`linear-gradient(135deg, ${theme.green}, #0891b2)`}>
      <div style={{ textAlign: "center", opacity: e.opacity, transform: `translateY(${e.translateY}px)` }}>
        <div style={{ fontSize: 80 }}>🌟</div>
        <div style={{ color: theme.white, fontSize: 64, fontWeight: 800, marginTop: 12 }}>
          Keep it up, {name.split(" ")[0]}!
        </div>
        <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 30, marginTop: 16 }}>📚 Homework Studio</div>
      </div>
    </Center>
  );
};
