import type { MetadataRoute } from "next";
import { CHOKEPOINTS } from "@/data/chokepoints";
import { absoluteUrl } from "@/lib/siteUrl";

/**
 * sitemap.xml — 지금까지 아예 없었다.
 *
 * 지구본(`/`)만 있었을 때는 사실 사이트맵이 있어도 색인할 게 없었다.
 * `/chokepoints/*`가 생기면서 비로소 의미가 생긴다.
 *
 * `?scene=` 딥링크는 넣지 않는다 — 조합이 사실상 무한이고,
 * 크롤 예산을 태우면서 중복 콘텐츠 신호만 만든다.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/chokepoints"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...CHOKEPOINTS.map((cp) => ({
      url: absoluteUrl(`/chokepoints/${cp.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
