// Matches the app's "lab notebook" identity.
export const theme = {
  brand: "#fb6a51", // coral — primary/action
  brandDark: "#df4c33",
  brandSoft: "#fff1ee",
  grow: "#0ea98a", // teal — correct / growth
  growSoft: "#e2f7f1",
  flag: "#f5a524", // amber — needs review
  flagSoft: "#fdf1dc",
  info: "#3e63dd",
  ink: "#182238", // deep navy
  inkSoft: "#5b667c",
  line: "#e3e8f0",
  paper: "#eef1f7", // cool graph-paper base
  white: "#ffffff",
  display: "Fraunces, Georgia, serif",
  sans: "'Plus Jakarta Sans', system-ui, sans-serif",
  // aliases kept for the older Recap/Walkthrough compositions
  bg: "#eef1f7",
  font: "'Plus Jakarta Sans', system-ui, sans-serif",
  slate: "#5b667c",
  green: "#0ea98a",
  amber: "#f5a524",
};

export const fps = 30;

// Faint graph-paper background — used on light scenes.
export const graphPaper = (bg = theme.paper) =>
  ({
    backgroundColor: bg,
    backgroundImage:
      "linear-gradient(rgba(24,34,56,0.045) 1px, transparent 1px)," +
      "linear-gradient(90deg, rgba(24,34,56,0.045) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
  }) as const;
