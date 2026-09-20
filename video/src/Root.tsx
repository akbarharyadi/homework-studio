import { Composition } from "remotion";
import { Recap, type RecapProps } from "./Recap";
import { Walkthrough, walkthroughDuration } from "./Walkthrough";
import { Promo, promoDuration } from "./Promo";
import { fps } from "./theme";
import aisha from "./data/aisha.json";

// Registered compositions. Render with:
//   npx remotion render Walkthrough out/walkthrough.mp4
//   npx remotion render Recap out/recap.mp4 --props=src/data/aisha.json
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Promo"
        component={Promo}
        durationInFrames={promoDuration}
        fps={fps}
        width={1920}
        height={1080}
      />
      <Composition
        id="Walkthrough"
        component={Walkthrough}
        durationInFrames={walkthroughDuration}
        fps={fps}
        width={1920}
        height={1080}
      />
      <Composition
        id="Recap"
        component={Recap}
        durationInFrames={435}
        fps={fps}
        width={1080}
        height={1080}
        defaultProps={aisha as RecapProps}
      />
    </>
  );
};
