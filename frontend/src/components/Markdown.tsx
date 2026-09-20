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
