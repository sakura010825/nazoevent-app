import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NazoNote - 謎解きイベント収集・共有アプリ",
    short_name: "謎ノート",
    description:
      "次の週末、どこ行く？をURLひとつで解決する謎解きイベントストックアプリ",
    lang: "ja",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFBF0",
    theme_color: "#FFB347",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
