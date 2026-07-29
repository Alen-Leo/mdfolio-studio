"use client";

import {
  Bold,
  Braces,
  Check,
  Code2,
  Download,
  Eye,
  FileDown,
  FileText,
  Heading2,
  Image as ImageIcon,
  ImageDown,
  Italic,
  Link2,
  List,
  Menu,
  Moon,
  PanelLeft,
  PanelRight,
  Quote,
  Redo2,
  Sparkles,
  Stamp,
  Sun,
  Table2,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import mermaid from "mermaid";
import { markdownParser } from "./markdown-parser";
import { documentBaseName, exportMermaidElement, triggerDownload, waitForMermaid } from "./png-export";
import type { WatermarkConfig } from "./png-export";
import { type CSSProperties, type MouseEvent as ReactMouseEvent, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

const starterMarkdown = `# 把想法，变成漂亮的 PDF

> **MDFolio** 是一个专注、私密的 Markdown 排版工作台。内容只在你的浏览器里处理。

## 它能做什么？

- [x] GitHub 风格 Markdown
- [x] 自动代码高亮
- [x] Mermaid 图表渲染
- [x] 表格、任务清单与引用
- [x] A4 优化的 PDF 导出

## 代码高亮

\`\`\`typescript
type Document = {
  title: string;
  content: string;
};

const exportPDF = (doc: Document) => {
  console.log(\`Exporting \${doc.title}...\`);
};
\`\`\`

## Mermaid 图表

\`\`\`mermaid
flowchart LR
    A[Markdown] --> B{实时解析}
    B --> C[代码高亮]
    B --> D[Mermaid]
    C --> E[精美 PDF]
    D --> E
\`\`\`

## 数据也可以很清晰

| 能力 | 状态 | 说明 |
| :--- | :---: | ---: |
| Markdown | ✓ | 完整支持 |
| Mermaid | ✓ | 矢量渲染 |
| 隐私 | ✓ | 本地处理 |

---

开始编辑左侧内容，右侧会即时呈现最终效果。`;

type ViewMode = "split" | "editor" | "preview";

const defaultWatermark: WatermarkConfig = {
  enabled: false,
  text: "内部资料",
  opacity: 0.12,
  size: 28,
  angle: -28,
  mode: "tile",
};

const toolbarItems = [
  { label: "标题", icon: Heading2, before: "## ", after: "", placeholder: "标题" },
  { label: "粗体", icon: Bold, before: "**", after: "**", placeholder: "重要内容" },
  { label: "斜体", icon: Italic, before: "_", after: "_", placeholder: "强调内容" },
  { label: "引用", icon: Quote, before: "> ", after: "", placeholder: "引用内容" },
  { label: "列表", icon: List, before: "- ", after: "", placeholder: "列表项目" },
  { label: "链接", icon: Link2, before: "[", after: "](https://)", placeholder: "链接文字" },
  { label: "图片", icon: ImageIcon, before: "![", after: "](https://)", placeholder: "图片说明" },
  { label: "代码", icon: Code2, before: "```\n", after: "\n```", placeholder: "代码" },
  {
    label: "表格",
    icon: Table2,
    before: "",
    after: "",
    placeholder: "| 项目 | 说明 |\n| --- | --- |\n| 内容 | 内容 |",
  },
  {
    label: "图表",
    icon: Braces,
    before: "```mermaid\n",
    after: "\n```",
    placeholder: "flowchart LR\n  A[开始] --> B[完成]",
  },
];

export default function Home() {
  const [markdown, setMarkdown] = useState(starterMarkdown);
  const deferredMarkdown = useDeferredValue(markdown);
  const [rendered, setRendered] = useState("");
  const [view, setView] = useState<ViewMode>("split");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [fileName, setFileName] = useState("未命名文档.md");
  const [saved, setSaved] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [ready, setReady] = useState(false);
  const [exportingPng, setExportingPng] = useState(false);
  const [watermarkOpen, setWatermarkOpen] = useState(false);
  const [watermark, setWatermark] = useState<WatermarkConfig>(defaultWatermark);
  const [watermarkTileCount, setWatermarkTileCount] = useState(30);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<string[]>([starterMarkdown]);
  const historyIndexRef = useRef(0);
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHistoryValueRef = useRef<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const cached = window.localStorage.getItem("mdfolio-document");
      const cachedName = window.localStorage.getItem("mdfolio-filename");
      const cachedTheme = window.localStorage.getItem("mdfolio-theme");
      const cachedWatermark = window.localStorage.getItem("mdfolio-watermark");
      if (cached !== null) {
        setMarkdown(cached);
        historyRef.current = [cached];
        historyIndexRef.current = 0;
      }
      if (cachedName) setFileName(cachedName);
      if (cachedTheme === "dark") setTheme("dark");
      if (cachedWatermark) {
        try {
          setWatermark({ ...defaultWatermark, ...JSON.parse(cachedWatermark) });
        } catch {
          window.localStorage.removeItem("mdfolio-watermark");
        }
      }
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem("mdfolio-document", markdown);
      window.localStorage.setItem("mdfolio-filename", fileName);
      setSaved(true);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [markdown, fileName, ready]);

  useEffect(() => {
    window.localStorage.setItem("mdfolio-theme", theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem("mdfolio-watermark", JSON.stringify(watermark));
  }, [ready, watermark]);

  useEffect(
    () => () => {
      if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      const [{ default: DOMPurify }] = await Promise.all([import("dompurify")]);
      const raw = await markdownParser.parse(deferredMarkdown);
      if (!cancelled) {
        setRendered(
          DOMPurify.sanitize(raw, {
            ADD_ATTR: ["target"],
          }),
        );
      }
    };
    void render();
    return () => {
      cancelled = true;
    };
  }, [deferredMarkdown]);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    let disposed = false;
    let renderQueue = Promise.resolve();

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: theme === "dark" ? "dark" : "base",
      themeVariables:
        theme === "dark"
          ? { primaryColor: "#27272a", primaryTextColor: "#fafafa", lineColor: "#a1a1aa" }
          : { primaryColor: "#f4f4f0", primaryTextColor: "#18181b", lineColor: "#71717a" },
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    });

    const renderPendingDiagrams = () => {
      renderQueue = renderQueue
        .then(async () => {
          if (disposed) return;
          const diagrams = preview.querySelectorAll<HTMLElement>(".mermaid:not([data-processed])");
          for (const node of Array.from(diagrams)) {
            if (disposed) break;
            try {
              await mermaid.run({ nodes: [node], suppressErrors: false });
            } catch {
              node.setAttribute("data-processed", "error");
              node.classList.add("diagram-error");
            }
          }
        })
        .catch((error) => console.error("Mermaid render failed", error));
    };

    const observer = new MutationObserver(renderPendingDiagrams);
    observer.observe(preview, { childList: true, subtree: true });
    renderPendingDiagrams();

    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, [theme]);

  const stats = useMemo(() => {
    const plain = markdown
      .replace(/```[\s\S]*?```/g, "")
      .replace(/[#>*_`[\]()!-]/g, " ")
      .trim();
    const chinese = plain.match(/[\u3400-\u9fff]/g)?.length || 0;
    const words = plain.match(/[A-Za-z0-9]+/g)?.length || 0;
    return { words: chinese + words, lines: markdown.split("\n").length };
  }, [markdown]);

  const watermarkTextUnits = Array.from(watermark.text.trim()).reduce(
    (total, character) =>
      total + (/[\u2e80-\u9fff\uff00-\uffef]/.test(character) ? 1 : 0.62),
    0,
  );
  const watermarkAngle = Math.abs((watermark.angle * Math.PI) / 180);
  const watermarkTextWidth = Math.max(
    watermark.size * 2,
    watermarkTextUnits * watermark.size * 0.82,
  );
  const watermarkCellWidth =
    watermarkTextWidth * Math.cos(watermarkAngle) +
    watermark.size * Math.sin(watermarkAngle) +
    watermark.size * 2.5;
  const watermarkRowHeight =
    watermarkTextWidth * Math.sin(watermarkAngle) +
    watermark.size * Math.cos(watermarkAngle) +
    watermark.size * 2;

  const watermarkStyle = {
    "--watermark-opacity": String(watermark.opacity),
    "--watermark-size": `${watermark.size}px`,
    "--watermark-angle": `${watermark.angle}deg`,
    "--watermark-cell-width": `${Math.ceil(watermarkCellWidth)}px`,
    "--watermark-row-height": `${Math.ceil(watermarkRowHeight)}px`,
  } as CSSProperties;

  useEffect(() => {
    const preview = previewRef.current;
    const content = preview?.querySelector<HTMLElement>(".markdown-body");
    if (!content || !watermark.enabled || watermark.mode !== "tile") {
      setWatermarkTileCount(1);
      return;
    }

    const updateTileCount = () => {
      const contentWidth = Math.max(1, content.clientWidth);
      const contentHeight = Math.max(1, content.scrollHeight);
      const columns = Math.max(
        1,
        Math.floor(contentWidth / Math.min(contentWidth, watermarkCellWidth)),
      );
      const rows =
        Math.ceil(contentHeight / Math.max(120, watermarkRowHeight)) + 1;
      setWatermarkTileCount(Math.min(600, Math.max(1, columns * rows)));
    };

    updateTileCount();
    const observer = new ResizeObserver(updateTileCount);
    observer.observe(content);
    return () => observer.disconnect();
  }, [
    rendered,
    watermark.enabled,
    watermark.mode,
    watermarkCellWidth,
    watermarkRowHeight,
  ]);

  const commitHistory = useCallback((value: string) => {
    const current = historyRef.current.slice(0, historyIndexRef.current + 1);
    if (current.at(-1) !== value) {
      historyRef.current = [...current, value].slice(-80);
      historyIndexRef.current = historyRef.current.length - 1;
    }
  }, []);

  const pushHistory = useCallback((value: string) => {
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    pendingHistoryValueRef.current = value;
    historyTimerRef.current = setTimeout(() => {
      commitHistory(value);
      historyTimerRef.current = null;
      pendingHistoryValueRef.current = null;
    }, 350);
  }, [commitHistory]);

  const flushPendingHistory = () => {
    if (!historyTimerRef.current) return;
    clearTimeout(historyTimerRef.current);
    historyTimerRef.current = null;
    const pendingValue = pendingHistoryValueRef.current;
    pendingHistoryValueRef.current = null;
    if (pendingValue !== null) commitHistory(pendingValue);
  };

  const updateMarkdown = (value: string) => {
    setMarkdown(value);
    setSaved(false);
    pushHistory(value);
  };

  const undo = () => {
    flushPendingHistory();
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    setMarkdown(historyRef.current[historyIndexRef.current]);
    setSaved(false);
  };

  const redo = () => {
    flushPendingHistory();
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    setMarkdown(historyRef.current[historyIndexRef.current]);
    setSaved(false);
  };

  const insert = (before: string, after: string, placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = markdown.slice(start, end) || placeholder;
    const next = `${markdown.slice(0, start)}${before}${selected}${after}${markdown.slice(end)}`;
    updateMarkdown(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const loadFile = (file?: File) => {
    if (!file || (!/\.(md|markdown)$/i.test(file.name) && file.type !== "text/plain")) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? "");
      if (historyTimerRef.current) {
        clearTimeout(historyTimerRef.current);
        historyTimerRef.current = null;
      }
      pendingHistoryValueRef.current = null;
      setMarkdown(value);
      setFileName(file.name);
      setSaved(false);
      historyRef.current = [value];
      historyIndexRef.current = 0;
    };
    reader.readAsText(file);
  };

  const downloadMarkdown = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const extension = /\.markdown$/i.test(fileName) ? ".markdown" : ".md";
    triggerDownload(url, `${documentBaseName(fileName)}${extension}`);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportPdf = async () => {
    const preview = previewRef.current;
    if (!preview) return;
    setMobileMenu(false);
    setWatermarkOpen(false);
    await waitForMermaid(preview);
    await document.fonts?.ready;
    requestAnimationFrame(() => window.print());
  };

  const exportPreviewPng = async () => {
    const preview = previewRef.current;
    if (!preview || exportingPng) return;
    setExportingPng(true);
    setMobileMenu(false);
    try {
      await waitForMermaid(preview);
      await document.fonts?.ready;
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(preview, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: theme === "dark" ? "#191a1d" : "#ffffff",
        filter: (node) => !(node instanceof HTMLElement && node.classList.contains("diagram-download")),
      });
      triggerDownload(dataUrl, `${documentBaseName(fileName)}.png`);
    } catch (error) {
      console.error("PNG export failed", error);
      window.alert("\u0050\u004e\u0047 \u5bfc\u51fa\u5931\u8d25\uff0c\u8bf7\u7f29\u77ed\u6587\u6863\u6216\u68c0\u67e5\u5916\u90e8\u56fe\u7247\u540e\u91cd\u8bd5\u3002");
    } finally {
      setExportingPng(false);
    }
  };

  const handlePreviewClick = async (event: ReactMouseEvent<HTMLElement>) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-export-mermaid]");
    if (!button) return;
    const frame = button.closest<HTMLElement>(".diagram-frame");
    const diagram = frame?.querySelector<HTMLElement>(".mermaid");
    if (!frame || !diagram || button.disabled) return;
    const diagrams = Array.from(previewRef.current?.querySelectorAll(".diagram-frame") || []);
    const index = Math.max(1, diagrams.indexOf(frame) + 1);
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = "\u751f\u6210\u4e2d\u2026";
    try {
      await waitForMermaid(frame);
      if (!diagram.querySelector("svg")) {
        throw new Error("Mermaid diagram is not ready");
      }
      await exportMermaidElement(
        diagram,
        `${documentBaseName(fileName)}-mermaid-${index}.png`,
        theme === "dark" ? "#202125" : "#f7f7f4",
        watermark,
      );
    } catch (error) {
      console.error("Mermaid PNG export failed", error);
      window.alert("\u56fe\u8868\u5bfc\u51fa\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002");
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  };

  return (
    <main
      className={`app-shell view-${view}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        loadFile(event.dataTransfer.files[0]);
      }}
    >
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><FileText size={19} strokeWidth={2.2} /></div>
          <span>MDFolio</span>
          <i>STUDIO</i>
        </div>

        <div className="document-name">
          <input
            aria-label="文档名称"
            value={fileName.replace(/\.(md|markdown)$/i, "")}
            onChange={(event) => {
              setFileName(`${event.target.value}.md`);
              setSaved(false);
            }}
          />
          <span className={saved ? "is-saved" : ""}>
            {saved ? <Check size={12} /> : null}
            {saved ? "已自动保存" : "保存中"}
          </span>
        </div>

        <div className="top-actions">
          <button className="icon-button desktop-only" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label="切换主题">
            {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
          </button>
          <button className="ghost-button desktop-only" onClick={() => fileInputRef.current?.click()}>
            <Upload size={15} /> 导入
          </button>
          <button className="ghost-button desktop-only" onClick={downloadMarkdown}>
            <Download size={15} /> 保存 MD
          </button>
          <button
            className={`ghost-button desktop-only ${watermark.enabled ? "active-watermark" : ""}`}
            onClick={() => setWatermarkOpen(!watermarkOpen)}
            aria-pressed={watermark.enabled}
          >
            <Stamp size={15} /> 水印
          </button>
          <button className="ghost-button desktop-only" onClick={exportPreviewPng} disabled={exportingPng}>
            <ImageDown size={15} /> {exportingPng ? "\u751f\u6210\u4e2d\u2026" : "\u5bfc\u51fa PNG"}
          </button>
          <button className="primary-button" onClick={exportPdf}>
            <FileDown size={16} /> 导出 PDF
          </button>
          <button className="icon-button mobile-only" onClick={() => setMobileMenu(!mobileMenu)} aria-label="打开菜单">
            {mobileMenu ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>

        {mobileMenu && (
          <div className="mobile-menu">
            <button onClick={() => fileInputRef.current?.click()}><Upload size={16} /> 导入 Markdown</button>
            <button onClick={downloadMarkdown}><Download size={16} /> 保存 Markdown</button>
            <button
              onClick={() => {
                setWatermarkOpen(true);
                setMobileMenu(false);
              }}
            >
              <Stamp size={16} /> 水印设置
            </button>
            <button onClick={exportPreviewPng} disabled={exportingPng}>
              <ImageDown size={16} /> {exportingPng ? "\u751f\u6210\u4e2d\u2026" : "\u5bfc\u51fa\u9884\u89c8 PNG"}
            </button>
            <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />} 切换主题
            </button>
          </div>
        )}
        {watermarkOpen && (
          <section className="watermark-popover" role="dialog" aria-label="统一水印设置">
            <div className="watermark-panel-header">
              <div><strong>统一水印</strong><span>所有导出页面使用同一水印</span></div>
              <button className="watermark-close" onClick={() => setWatermarkOpen(false)} aria-label="关闭水印设置"><X size={16} /></button>
            </div>
            <label className="watermark-toggle">
              <span><strong>启用水印</strong><small>同步应用到 PDF 与 PNG</small></span>
              <input type="checkbox" checked={watermark.enabled} onChange={(event) => setWatermark({ ...watermark, enabled: event.target.checked })} />
              <i aria-hidden="true" />
            </label>
            <label className="watermark-field">
              <span>水印文字</span>
              <input type="text" value={watermark.text} maxLength={48} aria-label="水印文字" onChange={(event) => setWatermark({ ...watermark, text: event.target.value })} />
            </label>
            <div className="watermark-field">
              <span>排列方式</span>
              <div className="watermark-mode">
                <button className={watermark.mode === "single" ? "active" : ""} onClick={() => setWatermark({ ...watermark, mode: "single" })}>居中单个</button>
                <button className={watermark.mode === "tile" ? "active" : ""} onClick={() => setWatermark({ ...watermark, mode: "tile" })}>平铺</button>
              </div>
            </div>
            <label className="watermark-field watermark-range">
              <span>透明度 <b>{Math.round(watermark.opacity * 100)}%</b></span>
              <input type="range" min="0.04" max="0.3" step="0.01" value={watermark.opacity} onChange={(event) => setWatermark({ ...watermark, opacity: Number(event.target.value) })} />
            </label>
            <label className="watermark-field watermark-range">
              <span>字号 <b>{watermark.size}px</b></span>
              <input type="range" min="18" max="48" step="1" value={watermark.size} onChange={(event) => setWatermark({ ...watermark, size: Number(event.target.value) })} />
            </label>
            <label className="watermark-field watermark-range">
              <span>角度 <b>{watermark.angle}°</b></span>
              <input type="range" min="-60" max="0" step="1" value={watermark.angle} onChange={(event) => setWatermark({ ...watermark, angle: Number(event.target.value) })} />
            </label>
            <p className="watermark-hint">同一水印将应用到 PDF 每一页、整篇 PNG 和 Mermaid PNG。</p>
          </section>
        )}
      </header>

      <nav className="workspace-bar" aria-label="编辑工具">
        <div className="history-actions">
          <button onClick={undo} aria-label="撤销"><Undo2 size={16} /></button>
          <button onClick={redo} aria-label="重做"><Redo2 size={16} /></button>
        </div>
        <span className="toolbar-divider" />
        <div className="format-tools">
          {toolbarItems.map(({ label, icon: Icon, before, after, placeholder }) => (
            <button key={label} onClick={() => insert(before, after, placeholder)} title={label} aria-label={label}>
              <Icon size={16} />
            </button>
          ))}
        </div>
        <div className="view-switcher">
          <button className={view === "editor" ? "active" : ""} onClick={() => setView("editor")} aria-label="仅编辑">
            <PanelLeft size={15} /><span>编辑</span>
          </button>
          <button className={view === "split" ? "active" : ""} onClick={() => setView("split")} aria-label="分栏">
            <span className="split-icon"><i /><i /></span><span>分栏</span>
          </button>
          <button className={view === "preview" ? "active" : ""} onClick={() => setView("preview")} aria-label="仅预览">
            <PanelRight size={15} /><span>预览</span>
          </button>
        </div>
      </nav>

      <section className="workspace">
        <section className="editor-pane">
          <div className="pane-heading">
            <span><Code2 size={14} /> MARKDOWN</span>
            <span>{stats.lines} 行</span>
          </div>
          <div className="editor-wrap">
            <div className="line-numbers" aria-hidden="true">
              {Array.from({ length: stats.lines }, (_, index) => <span key={index}>{index + 1}</span>)}
            </div>
            <textarea
              ref={textareaRef}
              value={markdown}
              onChange={(event) => updateMarkdown(event.target.value)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
                  event.preventDefault();
                  downloadMarkdown();
                }
                if (event.key === "Tab") {
                  event.preventDefault();
                  insert("  ", "", "");
                }
              }}
              spellCheck={false}
              aria-label="Markdown 编辑器"
            />
          </div>
          <footer className="pane-footer">
            <span><i className="status-dot" /> 草稿仅保存在此设备</span>
            <span>{stats.words} 字词</span>
          </footer>
        </section>

        <section className="preview-pane">
          <div className="pane-heading">
            <span><Eye size={14} /> 实时预览</span>
            <span className="a4-badge">A4</span>
          </div>
          <div className="preview-scroll">
            <div ref={previewRef} className="document-canvas" onClick={handlePreviewClick}>
              <article className="markdown-body" dangerouslySetInnerHTML={{ __html: rendered }} />
              {watermark.enabled && watermark.text.trim() && (
                <div className={`watermark-layer watermark-${watermark.mode}`} style={watermarkStyle} aria-hidden="true">
                  {Array.from({ length: watermark.mode === "tile" ? watermarkTileCount : 1 }, (_, index) => (
                    <span key={index}>{watermark.text.trim()}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <footer className="pane-footer preview-footer">
            <span><Sparkles size={13} /> 高亮与图表已就绪</span>
            <span>打印优化</span>
          </footer>
        </section>
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,text/markdown,text/plain"
        onChange={(event) => {
          loadFile(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
        hidden
      />

      {dragging && (
        <div className="drop-overlay">
          <div>
            <Upload size={30} />
            <strong>放开以打开 Markdown</strong>
            <span>支持 .md 与 .markdown 文件</span>
          </div>
        </div>
      )}
    </main>
  );
}
