# MDFolio

一个完全在浏览器中运行的 Markdown 工作台，可将文档导出为 PDF 或 PNG。

## 功能

- 实时 Markdown 预览与代码高亮
- Mermaid 流程图、时序图等常用图表渲染
- 导出整篇预览为 PDF 或 PNG
- 单独导出 Mermaid 图表为 PNG
- PDF、整篇 PNG 和 Mermaid PNG 使用同一套可选水印
- 自动保存到当前浏览器，不上传文档内容
- 支持亮色与暗色主题

## 本地运行

需要 Node.js `>=22.13.0`。

```bash
npm install
npm run dev
```

常用检查：

```bash
npm run lint
npm test
```

## 部署

项目支持静态导出，可部署到 GitHub Pages；仓库中的 `.openai/hosting.json` 也用于 OpenAI Sites 部署。设置 `NEXT_PUBLIC_SITE_URL` 为最终站点完整地址，可保证分享卡片资源路径正确。
