// Render the Markdown docs to PDF, fully offline.
//
// Each .md → HTML (Mermaid diagrams rendered client-side, code syntax-highlighted)
// → printed to PDF by headless Chrome, with page numbers. Screenshots referenced by
// the manual resolve via a <base> pointing at docs/.
//
//   node build-pdf.mjs
import puppeteer from "puppeteer";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import { readFile, writeFile, mkdir, readFileSync } from "node:fs";
import { readFile as readFileP, mkdir as mkdirP } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS = join(__dirname, "..");
const OUT = join(DOCS, "pdf");
const TMP = join(__dirname, ".tmp");

const MERMAID_JS = await readFileP(join(__dirname, "node_modules", "mermaid", "dist", "mermaid.min.js"), "utf8");
const HLJS_CSS = await readFileP(join(__dirname, "node_modules", "highlight.js", "styles", "github.css"), "utf8");

const DOCUMENTS = [
  { md: "TECHNICAL.md", pdf: "technical-overview.pdf", title: "Homework Studio — Technical Overview" },
  { md: "MANUAL.md", pdf: "user-manual.pdf", title: "Homework Studio — User Manual" },
];

const md = new MarkdownIt({
  html: true,
  linkify: true,
  highlight(str, lang) {
    if (lang === "mermaid") {
      return `<pre class="mermaid">${md.utils.escapeHtml(str)}</pre>`;
    }
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="code"><code class="hljs">${hljs.highlight(str, { language: lang }).value}</code></pre>`;
      } catch {}
    }
    return `<pre class="code"><code class="hljs">${md.utils.escapeHtml(str)}</code></pre>`;
  },
});

const css = `
  :root { --ink:#182238; --soft:#5b667c; --line:#e3e8f0; --brand:#e05a43; --accent:#0ea98a; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
         color: var(--ink); line-height: 1.55; font-size: 10.5pt; margin: 0; }
  h1 { font-size: 22pt; margin: 0 0 6pt; letter-spacing:-0.01em; }
  h2 { font-size: 15pt; margin: 20pt 0 8pt; padding-bottom: 4pt; border-bottom: 1.5px solid var(--line);
       page-break-after: avoid; }
  h3 { font-size: 12pt; margin: 14pt 0 4pt; page-break-after: avoid; }
  h4 { font-size: 10.5pt; margin: 10pt 0 3pt; }
  p, li { color: #26324a; }
  a { color: var(--brand); text-decoration: none; }
  blockquote { margin: 10pt 0; padding: 6pt 12pt; border-left: 3px solid var(--accent);
               background: #f2fbf8; color: #2a3a4d; border-radius: 4px; }
  blockquote p { margin: 3pt 0; }
  code { font-family: "SF Mono",Consolas,"Liberation Mono",monospace; font-size: 9pt;
         background: #f2f4f8; padding: 1px 5px; border-radius: 4px; }
  pre.code { background: #f7f9fc; border: 1px solid var(--line); border-radius: 8px;
             padding: 10px 12px; overflow: hidden; page-break-inside: avoid; }
  pre.code code { background: none; padding: 0; font-size: 8.6pt; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; font-size: 9pt; page-break-inside: avoid; }
  th, td { border: 1px solid var(--line); padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #f2f4f8; font-weight: 700; }
  tr:nth-child(even) td { background: #fafbfd; }
  img { max-width: 100%; height: auto; border: 1px solid var(--line); border-radius: 8px;
        margin: 6pt 0; page-break-inside: avoid; display: block; }
  hr { border: none; border-top: 1px solid var(--line); margin: 16pt 0; }
  .mermaid { text-align: center; margin: 10pt 0; page-break-inside: avoid; }
  .mermaid svg { max-width: 100%; height: auto; }
  ${HLJS_CSS}
`;

function page(title, bodyHtml) {
  return `<!doctype html><html><head><meta charset="utf-8">
<base href="${pathToFileURL(DOCS).href}/">
<title>${title}</title><style>${css}</style></head>
<body><main>${bodyHtml}</main>
<script>${MERMAID_JS}</script>
<script>
  (async () => {
    try {
      window.mermaid.initialize({ startOnLoad:false, theme:"neutral", securityLevel:"loose",
        flowchart:{useMaxWidth:true, htmlLabels:true}, er:{useMaxWidth:true}, sequence:{useMaxWidth:true} });
      await window.mermaid.run({ querySelector: ".mermaid", suppressErrors: true });
    } catch (e) { window.__mermaidError = String(e); }
    window.__renderDone = true;
  })();
</script></body></html>`;
}

async function main() {
  await mkdirP(OUT, { recursive: true });
  await mkdirP(TMP, { recursive: true });
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--allow-file-access-from-files"],
  });

  for (const doc of DOCUMENTS) {
    const source = await readFileP(join(DOCS, doc.md), "utf8");
    const html = page(doc.title, md.render(source));
    const tmpFile = join(TMP, doc.md.replace(/\.md$/, ".html"));
    await writeFileP(tmpFile, html);

    const p = await browser.newPage();
    await p.goto(pathToFileURL(tmpFile).href, { waitUntil: "networkidle0" });
    await p.waitForFunction(() => window.__renderDone === true, { timeout: 60000 }).catch(() => {});
    const err = await p.evaluate(() => window.__mermaidError || null);
    if (err) console.warn(`  mermaid warning in ${doc.md}:`, err);
    // give fonts/SVG a beat to settle
    await new Promise((r) => setTimeout(r, 800));

    await p.pdf({
      path: join(OUT, doc.pdf),
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size:7pt;color:#9aa5b8;width:100%;padding:0 14mm;text-align:right;">${doc.title}</div>`,
      footerTemplate: `<div style="font-size:7pt;color:#9aa5b8;width:100%;padding:0 14mm;display:flex;justify-content:space-between;">
        <span>Homework Studio — independent portfolio demo</span>
        <span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    });
    await p.close();
    console.log("built", doc.pdf);
  }

  await browser.close();
  console.log("\nPDFs in", OUT);
}

// small promisified helpers (avoid extra imports)
function writeFileP(path, data) {
  return new Promise((res, rej) => writeFile(path, data, (e) => (e ? rej(e) : res())));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
