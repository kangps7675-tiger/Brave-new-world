import { describe, expect, it, beforeEach } from "vitest";
import { isArticleUrl } from "./articleLink";
import {
  clearOgImageCacheForTests,
  parseOgImageFromHtml,
} from "./enrichArticleImage";
import { ensureLampFeaturedNews } from "./periodicBriefing";
import type { LampFeaturedNews } from "./periodicBriefing";

describe("isArticleUrl", () => {
  it("섹션·허브 URL은 거부한다", () => {
    expect(isArticleUrl("https://www.reuters.com/business/energy/")).toBe(false);
    expect(isArticleUrl("https://www.reuters.com/world/europe/")).toBe(false);
    expect(isArticleUrl("https://www.reuters.com/markets/")).toBe(false);
    expect(isArticleUrl("https://www.reuters.com/technology/")).toBe(false);
    expect(isArticleUrl("https://www.reuters.com/world/asia-pacific/")).toBe(false);
    expect(isArticleUrl("https://www.bbc.com/news")).toBe(false);
  });

  it("개별 기사 URL은 통과한다", () => {
    expect(
      isArticleUrl(
        "https://www.reuters.com/world/asia-pacific/north-korea-fires-missile-into-sea-2026-07-20/",
      ),
    ).toBe(true);
    expect(
      isArticleUrl(
        "https://www.reuters.com/business/energy/oil-prices-rise-on-tensions-2026-07-15/",
      ),
    ).toBe(true);
    expect(
      isArticleUrl("https://www.bbc.com/news/articles/c2e8x9y7z1wq"),
    ).toBe(true);
    expect(
      isArticleUrl(
        "https://apnews.com/article/ukraine-russia-war-kyiv-strike-abc123def456",
      ),
    ).toBe(true);
  });

  it("비정상 입력은 거부한다", () => {
    expect(isArticleUrl("")).toBe(false);
    expect(isArticleUrl(null)).toBe(false);
    expect(isArticleUrl("not-a-url")).toBe(false);
    expect(isArticleUrl("ftp://example.com/foo-bar-baz-qux-long")).toBe(false);
  });
});

describe("parseOgImageFromHtml", () => {
  beforeEach(() => {
    clearOgImageCacheForTests();
  });

  it("og:image를 추출한다", () => {
    const html = `
      <html><head>
        <meta property="og:image" content="https://cdn.example.com/photos/story-hero.jpg" />
        <meta name="twitter:image" content="https://cdn.example.com/photos/tw.jpg" />
      </head></html>
    `;
    expect(parseOgImageFromHtml(html)).toBe(
      "https://cdn.example.com/photos/story-hero.jpg",
    );
  });

  it("content가 앞에 오는 meta도 파싱한다", () => {
    const html = `<meta content="https://img.example.com/a.png" property="og:image" />`;
    expect(parseOgImageFromHtml(html)).toBe("https://img.example.com/a.png");
  });

  it("상대 경로를 pageUrl 기준으로 절대화한다", () => {
    const html = `<meta property="og:image" content="/static/hero.jpg" />`;
    expect(parseOgImageFromHtml(html, "https://news.example.com/world/story-one")).toBe(
      "https://news.example.com/static/hero.jpg",
    );
  });

  it("favicon·svg는 normalize에서 걸러진다", () => {
    const html = `<meta property="og:image" content="https://cdn.example.com/favicon.ico" />`;
    expect(parseOgImageFromHtml(html)).toBe("");
  });
});

describe("ensureLampFeaturedNews", () => {
  const base = (partial: Partial<LampFeaturedNews>): LampFeaturedNews => ({
    id: "x",
    title: "t",
    summary: "s".repeat(320),
    imageUrl: "https://cdn.example.com/photo.jpg",
    link: "https://www.reuters.com/world/asia-pacific/long-slug-story-2026-07-20/",
    source: "Reuters",
    trustTier: 1,
    ...partial,
  });

  it("사진+기사 URL만 남긴다", () => {
    const kept = ensureLampFeaturedNews([
      base({ id: "ok" }),
      base({
        id: "section",
        link: "https://www.reuters.com/business/energy/",
      }),
      base({ id: "nophoto", imageUrl: "" }),
    ]);
    expect(kept.map((n) => n.id)).toEqual(["ok"]);
  });
});
