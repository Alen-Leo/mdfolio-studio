export const documentBaseName = (fileName: string) =>
  fileName
    .replace(/\.(md|markdown)$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .trim() || "mdfolio";

export const triggerDownload = (url: string, fileName: string) => {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
};

export const waitForMermaid = async (container: HTMLElement) => {
  const timeoutAt = performance.now() + 4000;
  while (container.querySelector(".mermaid:not([data-processed])") && performance.now() < timeoutAt) {
    await new Promise((resolve) => window.setTimeout(resolve, 80));
  }
};

export const exportMermaidSvg = async (svg: SVGSVGElement, fileName: string, backgroundColor: string) => {
  const bounds = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;
  const width = Math.max(1, viewBox.width || bounds.width || 800);
  const height = Math.max(1, viewBox.height || bounds.height || 600);
  const scale = Math.max(1, Math.min(3, 8192 / width, 8192 / height));
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" });
  const sourceUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = sourceUrl;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error("PNG export failed")), "image/png");
    });
    const pngUrl = URL.createObjectURL(pngBlob);
    triggerDownload(pngUrl, fileName);
    window.setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
};