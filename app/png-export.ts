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

export const exportMermaidElement = async (
  element: HTMLElement,
  fileName: string,
  backgroundColor: string,
) => {
  await document.fonts?.ready;
  const { toBlob } = await import("html-to-image");
  const pngBlob = await toBlob(element, {
    cacheBust: true,
    pixelRatio: 3,
    backgroundColor,
  });
  if (!pngBlob) throw new Error("PNG export failed");

  const pngUrl = URL.createObjectURL(pngBlob);
  triggerDownload(pngUrl, fileName);
  window.setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
};