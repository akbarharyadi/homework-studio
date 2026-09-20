import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// Renders tutor explanations: Markdown + LaTeX ($...$) for math.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-tutor text-sm text-slate-700">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

// Inline variant for short strings that may contain LaTeX ($...$) — e.g. a
// question stem or an answer option. Renders the paragraph as a <span> so it
// stays inline inside headings and buttons.
export function MathText({ children, className }: { children: string; className?: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{ p: ({ children }) => <span className={className}>{children}</span> }}
    >
      {children}
    </ReactMarkdown>
  );
}
