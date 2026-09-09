import type { MetadataRoute } from "next";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_NAME.ko,
    short_name: BRAND_NAME.ko,
    description: BRAND_TAGLINE.ko,
    start_url: "/?source=pwa",
    id: "/",
    display: "standalone",
    background_color: "#02040a",
    theme_color: "#02040a",
    lang: "ko",
    // 설치 앱이 옛 아이콘/이름에 묶이지 않게 최신 브랜드 자산만 노출
    icons: [
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/apple-icon-180.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
