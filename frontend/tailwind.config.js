/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#eef1f7", // cool graph-paper base
        surface: "#ffffff",
        ink: "#182238", // deep navy-slate
        "ink-soft": "#5b667c",
        line: "#e3e8f0",
        // coral = the one hero/action color
        brand: {
          DEFAULT: "#fb6a51",
          ink: "#df4c33", // hover / text-on-light
          soft: "#fff1ee", // tint fill
        },
        grow: { DEFAULT: "#0ea98a", soft: "#e2f7f1" }, // correct / progress
        flag: { DEFAULT: "#f5a524", soft: "#fdf1dc" }, // needs review
        info: { DEFAULT: "#3e63dd", soft: "#e7ecfd" },
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(24,34,56,0.04), 0 6px 20px rgba(24,34,56,0.06)",
        lift: "0 10px 30px rgba(24,34,56,0.10)",
      },
    },
  },
  plugins: [],
};
