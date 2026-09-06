/**
 * 사이트 절대 URL 단일 출처 (SSOT).
 *
 * layout.tsx 안에 하드코딩돼 있던 값을 끌어냈다. sitemap·robots·JSON-LD·
 * canonical이 전부 같은 오리진을 써야 하는데, 각자 문자열을 들고 있으면
 * 도메인을 붙이는 날 반드시 하나가 빠진다.
 *
 * 도메인 확보 후 `NEXT_PUBLIC_SITE_URL`만 바꾸면 전부 따라온다.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://conflict-view.vercel.app"
).replace(/\/+$/, "");

/** 절대 URL 조립 — 앞 슬래시 유무에 관계없이 동작 */
export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}/${path.replace(/^\/+/, "")}`;
}
