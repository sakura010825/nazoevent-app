import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NazoNote - 謎解きイベント収集・共有アプリ",
  description: "次の週末、どこ行く？をURLひとつで解決する謎解きイベントストックアプリ",
  appleWebApp: {
    title: "謎ノート",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFB347",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

