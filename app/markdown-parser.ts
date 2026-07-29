import hljs from "highlight.js";
import { Marked } from "marked";
import markedFootnote from "marked-footnote";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const normalizeMermaidSource = (value: string) =>
  value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g, " ")
    .replace(/[\u200b-\u200d\u2060\ufeff]/g, "")
    .trim();

export const markdownParser = new Marked();

markdownParser.use(
  markedFootnote({
    description: "脚注",
    refMarkers: true,
    footnoteDivider: true,
    backRefLabel: "返回脚注引用 {0}",
  }),
  {
    gfm: true,
    breaks: true,
    tokenizer: {
      del(source) {
        if (source.startsWith("~") && !source.startsWith("~~")) return;
        return false;
      },
    },
    renderer: {
      code({ text, lang }) {
        const language = lang?.trim().split(/\s+/, 1)[0]?.toLowerCase();
        if (language === "mermaid") {
          const source = normalizeMermaidSource(text);
          return `<div class="diagram-frame"><div class="diagram-toolbar"><div class="diagram-label">MERMAID</div><button type="button" class="diagram-download" data-export-mermaid aria-label="&#23548;&#20986;&#27492; Mermaid &#22270;&#20026; PNG">&#19979;&#36733; PNG</button></div><pre class="mermaid">${escapeHtml(source)}</pre></div>`;
        }

        let highlighted = escapeHtml(text);
        let languageLabel = language || "plain text";
        if (language && hljs.getLanguage(language)) {
          highlighted = hljs.highlight(text, { language }).value;
        } else if (!language) {
          const result = hljs.highlightAuto(text);
          highlighted = result.value;
          languageLabel = result.language || "plain text";
        }

        return `<div class="code-frame"><div class="code-header"><span>${escapeHtml(languageLabel)}</span><i></i><i></i><i></i></div><pre><code class="hljs">${highlighted}</code></pre></div>`;
      },
    },
  },
);
