export type WatermarkConfig = {
  enabled: boolean;
  text: string;
  opacity: number;
  size: number;
  angle: number;
  mode: "single" | "tile";
};

export const documentBaseName = (fileName: string) =>
  fileName
    .replace(/\.(md|markdown)$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .trim() || "mdfolio";

export const triggerDownload = (url: string, fileName: string) => {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
};

export const waitForMermaid = async (container: HTMLElement) => {
  const timeoutAt = performance.now() + 4000;
  while (container.querySelector(".mermaid:not([data-processed])") && performance.now() < timeoutAt) {
    await new Promise((resolve) => window.setTimeout(resolve, 80));
  }
};

const drawWatermark = (
  canvas: HTMLCanvasElement,
  sourceWidth: number,
  watermark: WatermarkConfig,
) => {
  if (!watermark.enabled || !watermark.text.trim()) return;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");

  const scale = canvas.width / Math.max(1, sourceWidth);
  const fontSize = watermark.size * scale;
  const angle = (watermark.angle * Math.PI) / 180;
  context.fillStyle = "#4b5563";
  context.globalAlpha = watermark.opacity;
  context.font = `600 ${fontSize}px Inter, "PingFang SC", "Microsoft YaHei", sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";

  const drawAt = (x: number, y: number) => {
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    context.fillText(watermark.text.trim(), 0, 0);
    context.restore();
  };

  if (watermark.mode === "single") {
    drawAt(canvas.width / 2, canvas.height / 2);
  } else {
    const textWidth = context.measureText(watermark.text.trim()).width;
    const stepX = Math.max(textWidth * 1.7, fontSize * 8);
    const stepY = Math.max(fontSize * 5, 180 * scale);
    for (let y = -stepY; y < canvas.height + stepY; y += stepY) {
      for (let x = -stepX; x < canvas.width + stepX; x += stepX) {
        drawAt(x + (Math.round(y / stepY) % 2 ? stepX / 2 : 0), y);
      }
    }
  }
  context.globalAlpha = 1;
};

export const exportMermaidElement = async (
  element: HTMLElement,
  fileName: string,
  backgroundColor: string,
  watermark: WatermarkConfig,
) => {
  await document.fonts?.ready;
  const { toCanvas } = await import("html-to-image");
  const canvas = await toCanvas(element, {
    cacheBust: true,
    pixelRatio: 3,
    backgroundColor,
  });
  drawWatermark(canvas, element.getBoundingClientRect().width, watermark);

  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("PNG export failed"))),
      "image/png",
    );
  });
  const pngUrl = URL.createObjectURL(pngBlob);
  triggerDownload(pngUrl, fileName);
  window.setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
};