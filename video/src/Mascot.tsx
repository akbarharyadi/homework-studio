import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import type { CSSProperties } from "react";
import { theme } from "./theme";

export type Pose = "wave" | "happy" | "point" | "celebrate" | "think";

// "Otto" — a friendly notebook mascot. Springs in, floats, blinks, and changes
// arm pose. Drawn as inline SVG so it stays crisp at any size.
export const Mascot: React.FC<{ pose?: Pose; size?: number; delay?: number; style?: CSSProperties }> = ({
  pose = "happy",
  size = 260,
  delay = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - delay;

  const enter = spring({ frame: t, fps, config: { damping: 11, mass: 0.9 } });
  const s = interpolate(enter, [0, 1], [0.2, 1]);
  const floatY = Math.sin(t / 17) * 7;
  const tilt = Math.sin(t / 40) * 2;

  // blink: eyes close briefly on a cycle
  const bp = t % 74;
  const eyeOpen = bp > 67 ? 0.12 : 1;

  // arm angles (degrees), pivoting at the shoulders
  let armR = 28; // resting, pointing down-out
  let armL = -28;
  if (pose === "wave") armR = -55 + Math.sin(t / 5) * 22;
  if (pose === "celebrate") {
    armR = -70 + Math.sin(t / 5) * 10;
    armL = 70 - Math.sin(t / 5) * 10;
  }
  if (pose === "point") armR = -8;
  if (pose === "think") armL = 78;

  const mouth =
    pose === "celebrate" || pose === "wave"
      ? "M86 158 Q110 182 134 158 Q110 172 86 158 Z" // big open smile
      : "M88 160 Q110 176 132 160"; // gentle smile

  return (
    <svg
      width={size}
      height={size * 1.15}
      viewBox="0 0 220 250"
      style={{ overflow: "visible", ...style }}
    >
      <g transform={`translate(110 130) scale(${s}) rotate(${tilt}) translate(-110 ${-130 + floatY})`}>
        {/* ground shadow */}
        <ellipse cx="110" cy="238" rx={54} ry={9} fill="rgba(24,34,56,0.12)" />

        {/* left arm (behind) */}
        <g transform={`rotate(${armL} 42 152)`}>
          <rect x="20" y="146" width="34" height="15" rx="7.5" fill={theme.brandDark} />
          <circle cx="20" cy="153" r="9" fill="#ffd9cf" />
        </g>
        {/* right arm (behind) */}
        <g transform={`rotate(${armR} 178 152)`}>
          <rect x="166" y="146" width="34" height="15" rx="7.5" fill={theme.brandDark} />
          <circle cx="200" cy="153" r="9" fill="#ffd9cf" />
        </g>

        {/* feet */}
        <ellipse cx="88" cy="228" rx="15" ry="10" fill={theme.brandDark} />
        <ellipse cx="132" cy="228" rx="15" ry="10" fill={theme.brandDark} />

        {/* book body */}
        <rect x="34" y="34" width="152" height="186" rx="24" fill={theme.brand} />
        {/* page edge (right/bottom) */}
        <rect x="176" y="46" width="12" height="162" rx="6" fill="#fff5f2" />
        <rect x="46" y="208" width="130" height="10" rx="5" fill="#fff5f2" />
        {/* spine + spiral binding on the left */}
        <rect x="34" y="34" width="20" height="186" rx="10" fill={theme.brandDark} />
        {[58, 86, 114, 142, 170, 198].map((cy) => (
          <circle key={cy} cx="44" cy={cy} r="5.5" fill={theme.paper} />
        ))}
        {/* little label lines on the cover */}
        <rect x="72" y="56" width="86" height="9" rx="4.5" fill="rgba(255,255,255,0.55)" />
        <rect x="72" y="72" width="58" height="7" rx="3.5" fill="rgba(255,255,255,0.4)" />

        {/* cheeks */}
        <circle cx="70" cy="142" r="10" fill="#ff9a86" opacity="0.85" />
        <circle cx="150" cy="142" r="10" fill="#ff9a86" opacity="0.85" />

        {/* eyes (blink via scaleY) */}
        {[86, 134].map((cx) => (
          <g key={cx} transform={`translate(${cx} 122) scale(1 ${eyeOpen})`}>
            <circle cx="0" cy="0" r="15" fill="#fff" />
            <circle cx="2.5" cy="1.5" r="7.5" fill={theme.ink} />
            <circle cx="-1.5" cy="-2.5" r="2.6" fill="#fff" />
          </g>
        ))}

        {/* mouth */}
        <path
          d={mouth}
          fill={pose === "celebrate" || pose === "wave" ? theme.ink : "none"}
          stroke={theme.ink}
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};
