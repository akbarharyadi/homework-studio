// Kid-friendly emoji per subject (falls back to a book).
export function subjectEmoji(name: string): string {
  const map: Record<string, string> = {
    Math: "🧮",
    Science: "🔬",
    English: "📖",
    History: "🏛️",
    Art: "🎨",
    Music: "🎵",
  };
  return map[name] || "📘";
}
