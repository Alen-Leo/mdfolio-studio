import type { Metadata } from "next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://mdfolio-studio.alen0330.chatgpt.site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "MDFolio — Markdown 转 PDF",
  description: "支持代码高亮与 Mermaid 的隐私优先 Markdown PDF 工作台。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    title: "MDFolio — Markdown 转 PDF",
    description: "支持代码高亮与 Mermaid 的隐私优先 Markdown PDF 工作台。",
    images: [{ url: "/og.png", width: 1728, height: 909, alt: "MDFolio Markdown PDF 工作台" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MDFolio — Markdown 转 PDF",
    description: "支持代码高亮与 Mermaid 的隐私优先 Markdown PDF 工作台。",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
