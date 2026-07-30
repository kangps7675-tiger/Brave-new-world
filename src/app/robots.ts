import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/siteUrl";

/**
 * robots.txt — 지금까지 아예 없었다.
 *
 * 크롤러 차단 목적이 아니라 **sitemap 위치를 알리는 것**이 본래 목적이다.
 * 지구본은 WebGL이라 크롤러가 읽을 게 없고, 실제 색인 대상은
 * `/chokepoints/*` 텍스트 페이지들이다. 그쪽으로 안내한다.
 *
 * `/api`·`/admin`은 색인 가치가 없고 크롤 예산만 태운다.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
