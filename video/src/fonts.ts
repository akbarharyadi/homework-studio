import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadJakarta } from "@remotion/google-fonts/PlusJakartaSans";

export const fraunces = loadFraunces("normal", { weights: ["600", "700"] }).fontFamily;
export const jakarta = loadJakarta("normal", { weights: ["500", "600", "700", "800"] }).fontFamily;
