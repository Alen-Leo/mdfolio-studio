import assert from "node:assert/strict";
import test from "node:test";
import { markdownParser } from "../app/markdown-parser.ts";

test("treats single tildes as text and double tildes as strikethrough", async () => {
  const html = await markdownParser.parse(
    "word 100~103 and 60~61; ~~deleted~~; `code~value`",
  );

  assert.match(html, /100~103 and 60~61/);
  assert.match(html, /<del>deleted<\/del>/);
  assert.match(html, /<code>code~value<\/code>/);
});

test("uses only the first code fence info word as the language", async () => {
  const html = await markdownParser.parse(
    '```typescript title="demo"\nconst value: number = 1;\n```\n\n' +
      '```mermaid title="flow"\nflowchart LR\nA-->B\n```',
  );

  assert.match(html, /<span>typescript<\/span>/);
  assert.doesNotMatch(html, /typescript title/);
  assert.match(html, /class="mermaid">flowchart LR\nA--&gt;B<\/pre>/);
});

test("renders GitHub-style footnotes with references and back links", async () => {
  const html = await markdownParser.parse(
    "正文[^1]，再次引用[^1]。\n\n[^1]: 这是脚注内容。",
  );

  assert.match(html, /data-footnote-ref/);
  assert.match(html, /class="footnotes"/);
  assert.match(html, /这是脚注内容/);
  assert.match(html, /data-footnote-backref/);
  assert.doesNotMatch(html, /href="这是脚注内容"/);
});
