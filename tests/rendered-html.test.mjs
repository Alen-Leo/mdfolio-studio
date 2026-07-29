import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the MDFolio workspace and PNG action", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>MDFolio/);
  assert.match(html, /\u5bfc\u51fa PNG/);
  assert.match(html, /lucide-image-down/);
  assert.match(html, /\u6c34\u5370/);
  assert.match(html, /lucide-stamp/);
  assert.match(html, /\u5bfc\u51fa PDF/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("production metadata never points at localhost", async () => {
  const [layout, html] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/index.html", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(layout, /http:\/\/localhost|127\.0\.0\.1/);
  assert.doesNotMatch(html, /http:\/\/localhost|127\.0\.0\.1/);
  assert.match(html, /https:\/\/mdfolio-studio\.alen0330\.chatgpt\.site\/favicon\.svg/);
});
test("wires whole-preview and per-Mermaid PNG exports", async () => {
  const [page, helper, css, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/png-export.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /import\("html-to-image"\)/);
  assert.match(page, /pixelRatio:\s*2/);
  assert.match(page, /data-export-mermaid/);
  assert.match(page, /exportMermaidElement/);
  assert.match(helper, /import\("html-to-image"\)/);
  assert.match(helper, /pixelRatio:\s*3/);
  assert.match(helper, /type WatermarkConfig/);
  assert.match(helper, /drawWatermark/);
  assert.match(helper, /rotatedWidth/);
  assert.match(helper, /rotatedHeight/);
  assert.match(helper, /canvas\.toBlob/);
  assert.match(page, /mdfolio-watermark/);
  assert.match(page, /watermark-layer/);
  assert.match(page, /watermarkTextUnits/);
  assert.match(page, /--watermark-cell-width/);
  assert.match(page, /ResizeObserver/);
  assert.match(page, /watermarkTileCount/);
  assert.doesNotMatch(page, /watermark\.mode === "tile" \? 30 : 1/);
  assert.match(page, /exportMermaidElement[\s\S]*watermark/);
  assert.doesNotMatch(page, /new Date|location\.href/);
  assert.match(css, /\.diagram-download/);
  assert.match(css, /\.watermark-popover/);
  assert.match(css, /auto-fit/);
  assert.match(css, /--watermark-row-height/);
  assert.match(css, /@media print[\s\S]*\.watermark-layer[\s\S]*position:\s*fixed/);
  assert.match(css, /@media print[\s\S]*\.diagram-download/);
  assert.match(css, /@page\s*\{[\s\S]*margin:\s*0/);
  assert.match(css, /@media print[\s\S]*box-decoration-break:\s*clone/);
  assert.match(packageJson, /"html-to-image": "\^1\.11\.13"/);
});

test("keeps export and editor edge cases covered", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /cached !== null/);
  assert.match(page, /source\.startsWith\("~"\)[\s\S]*!source\.startsWith\("~~"\)/);
  assert.match(page, /pendingHistoryValueRef/);
  assert.match(page, /currentTarget\.value = ""/);
  assert.match(page, /await waitForMermaid\(preview\)[\s\S]*document\.fonts/);
  assert.match(page, /await waitForMermaid\(frame\)/);
  assert.match(page, /documentBaseName\(fileName\)/);
  assert.match(layout, /siteUrl\.endsWith\("\/"\)/);
  assert.match(layout, /icon: "favicon\.svg"/);
  assert.match(layout, /url: "og\.png"/);
  assert.match(packageJson, /"build": "vinext build"/);
  assert.doesNotMatch(packageJson, /WRANGLER_LOG_PATH=/);
});
