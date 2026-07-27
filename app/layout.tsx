import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MDFolio — Markdown 转 PDF",
  description: "支持代码高亮与 Mermaid 的隐私优先 Markdown PDF 工作台。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
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
