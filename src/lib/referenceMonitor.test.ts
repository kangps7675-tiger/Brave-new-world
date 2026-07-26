import { describe, expect, it } from "vitest";
import {
  ntiRestUrl,
  parseCsisBeyondParallelFeed,
  parseNtiRestPosts,
  parseNtiSitemapUrls,
  parseSitemapIndex,
  referenceItemId,
  scoreRelevance,
  titleFromSlug,
  wasRevised,
} from "./referenceMonitor";

const CSIS_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <title>Beyond Parallel</title>
  <item>
    <title>Suspected Uranium Enrichment Building at Yongbyon Complete</title>
    <link>https://beyondparallel.csis.org/suspected-uranium-enrichment-building-at-yongbyon-complete/</link>
    <pubDate>Mon, 13 Apr 2026 12:00:00 +0000</pubDate>
    <dc:creator>CSIS Korea Chair</dc:creator>
    <category><![CDATA[Nuclear Weapons]]></category>
    <category><![CDATA[Imagery Analysis]]></category>
    <description><![CDATA[<p>Recent <b>satellite imagery</b> shows the completion of a building at Yongbyon.</p>]]></description>
  </item>
  <item>
    <title>NTI Annual Gala &amp; Donor Reception</title>
    <link>https://beyondparallel.csis.org/gala/</link>
    <pubDate>Tue, 14 Apr 2026 09:00:00 +0000</pubDate>
  </item>
</channel>
</rss>`;

describe("parseCsisBeyondParallelFeed", () => {
  const rows = parseCsisBeyondParallelFeed(CSIS_FEED);

  it("피드 항목을 전부 행으로 만든다", () => {
    expect(rows).toHaveLength(2);
    expect(rows[0].source).toBe("csis-beyond-parallel");
    expect(rows[0].channel).toBe("rss");
  });

  it("HTML·CDATA·엔티티를 벗겨 평문으로 만든다", () => {
    expect(rows[0].title).toBe("Suspected Uranium Enrichment Building at Yongbyon Complete");
    expect(rows[0].summary).toBe(
      "Recent satellite imagery shows the completion of a building at Yongbyon.",
    );
    expect(rows[1].title).toBe("NTI Annual Gala & Donor Reception");
  });

  it("pubDate를 ISO로 정규화하고 updated_at을 채운다", () => {
    expect(rows[0].published_at).toBe("2026-04-13T12:00:00.000Z");
    expect(rows[0].updated_at).toBe(rows[0].published_at);
  });

  it("카테고리와 주제 태그를 붙인다", () => {
    expect(JSON.parse(rows[0].categories_json)).toEqual(["Nuclear Weapons", "Imagery Analysis"]);
    expect(JSON.parse(rows[0].topics_json)).toContain("nuclear-facility");
    expect(JSON.parse(rows[0].topics_json)).toContain("satellite-imagery");
  });

  it("Beyond Parallel은 무관해 보이는 글도 최소 관련도를 보장한다", () => {
    // 전량이 한반도 정보분석 채널이라, 제목만으로 0점이 나와도 버리지 않는다
    expect(rows[1].relevance).toBeGreaterThanOrEqual(3);
  });
});

describe("parseNtiRestPosts", () => {
  const rows = parseNtiRestPosts("article", [
    {
      id: 1,
      link: "https://www.nti.org/analysis/articles/china-missile-silo-fields/",
      title: { rendered: "China&#8217;s New Missile Silo Fields" },
      excerpt: { rendered: "<p>New ICBM silos near Yumen.</p>" },
      date_gmt: "2026-01-02T10:00:00",
      modified_gmt: "2026-03-05T11:00:00",
    },
    { id: 2, link: "", title: { rendered: "링크 없는 항목" } },
  ]);

  it("링크 없는 항목은 버린다", () => {
    expect(rows).toHaveLength(1);
  });

  it("타임존 없는 WP 시각을 UTC로 고정한다", () => {
    expect(rows[0].published_at).toBe("2026-01-02T10:00:00.000Z");
    expect(rows[0].updated_at).toBe("2026-03-05T11:00:00.000Z");
  });

  it("스마트 쿼트 엔티티를 복원한다", () => {
    expect(rows[0].title).toBe("China's New Missile Silo Fields");
  });

  it("사일로·중국 주제를 잡아 관련도를 올린다", () => {
    const topics = JSON.parse(rows[0].topics_json);
    expect(topics).toContain("missile-silo");
    expect(topics).toContain("china");
    expect(rows[0].relevance).toBeGreaterThan(4);
  });
});

describe("scoreRelevance", () => {
  it("지도 주제와 무관한 글은 0점", () => {
    expect(scoreRelevance("Get to know NTI: staff spotlight and summer internship").relevance).toBe(
      0,
    );
  });

  it("사일로·PLARF에 가장 높은 가중치를 준다", () => {
    const silo = scoreRelevance("New silos in the PLARF missile field");
    expect(silo.topics).toEqual(expect.arrayContaining(["missile-silo", "plarf"]));
    expect(silo.relevance).toBeGreaterThanOrEqual(8);
  });
});

describe("referenceItemId", () => {
  it("프로토콜·후행 슬래시·쿼리가 달라도 같은 id", () => {
    const a = referenceItemId("nti", "https://www.nti.org/analysis/x/");
    const b = referenceItemId("nti", "http://www.nti.org/analysis/x?utm_source=rss");
    expect(a).toBe(b);
  });

  it("소스가 다르면 다른 id", () => {
    expect(referenceItemId("nti", "https://example.org/a")).not.toBe(
      referenceItemId("csis-beyond-parallel", "https://example.org/a"),
    );
  });
});

describe("wasRevised", () => {
  it("하루 이상 뒤에 고쳐진 글만 개정으로 본다", () => {
    expect(
      wasRevised({ publishedAt: "2026-01-01T00:00:00Z", updatedAt: "2026-03-01T00:00:00Z" }),
    ).toBe(true);
    expect(
      wasRevised({ publishedAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:20:00Z" }),
    ).toBe(false);
    expect(wasRevised({ publishedAt: null, updatedAt: "2026-01-01T00:00:00Z" })).toBe(false);
  });
});

const SITEMAP_INDEX = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://www.nti.org/page-sitemap.xml</loc><lastmod>2026-07-24T16:04:43+00:00</lastmod></sitemap>
  <sitemap><loc>https://www.nti.org/article-sitemap.xml</loc><lastmod>2026-06-17T15:01:45+00:00</lastmod></sitemap>
  <sitemap><loc>https://www.nti.org/atomic-pulse-sitemap.xml</loc><lastmod>2026-07-10T13:22:58+00:00</lastmod></sitemap>
  <sitemap><loc>https://www.nti.org/country-sitemap.xml</loc><lastmod>2025-12-18T21:32:04+00:00</lastmod></sitemap>
</sitemapindex>`;

// 실제 NTI sitemap은 lastmod 오름차순 — 최신이 맨 뒤에 온다
const ARTICLE_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.nti.org/analysis/articles/ted-turners-remarks-nti-launch/</loc>
    <lastmod>2001-01-08T00:00:00+00:00</lastmod>
  </url>
  <url>
    <loc>https://www.nti.org/analysis/articles/russias-2000-military-doctrine/</loc>
    <lastmod>2010-09-30T21:00:00+00:00</lastmod>
  </url>
  <url>
    <loc>https://www.nti.org/analysis/articles/china-new-icbm-silo-fields-at-yumen/</loc>
    <lastmod>2026-05-02T09:00:00+00:00</lastmod>
  </url>
</urlset>`;

describe("parseSitemapIndex", () => {
  it("우리 주제와 겹치는 sitemap만 고른다", () => {
    expect(parseSitemapIndex(SITEMAP_INDEX)).toEqual([
      { url: "https://www.nti.org/article-sitemap.xml", channel: "article" },
      { url: "https://www.nti.org/atomic-pulse-sitemap.xml", channel: "atomic-pulse" },
    ]);
  });
});

describe("titleFromSlug", () => {
  it("슬러그에서 읽을 만한 제목을 복원한다", () => {
    expect(titleFromSlug("https://www.nti.org/analysis/articles/russias-2000-military-doctrine/")).toBe(
      "Russias 2000 Military Doctrine",
    );
  });

  it("첫 단어가 아닌 관사·전치사는 소문자로 둔다", () => {
    expect(titleFromSlug("https://x.test/the-case-for-a-cold-peace")).toBe(
      "The Case for a Cold Peace",
    );
  });
});

describe("parseNtiSitemapUrls", () => {
  const rows = parseNtiSitemapUrls("article", ARTICLE_SITEMAP, 2);

  it("오름차순 sitemap에서 최신 N개를 최신순으로 잘라온다", () => {
    expect(rows).toHaveLength(2);
    expect(rows[0].url).toContain("china-new-icbm-silo-fields-at-yumen");
    expect(rows[0].updated_at).toBe("2026-05-02T09:00:00.000Z");
  });

  it("REST 경로와 구분되게 채널을 표시하고 요약은 비운다", () => {
    expect(rows[0].channel).toBe("article-sitemap");
    expect(rows[0].summary).toBeNull();
  });

  it("URL 슬러그에서도 주제를 잡아낸다", () => {
    const topics = JSON.parse(rows[0].topics_json);
    expect(topics).toContain("missile-silo");
    expect(topics).toContain("china");
  });

  it("REST와 sitemap이 같은 글을 같은 id로 접는다", () => {
    const viaRest = parseNtiRestPosts("article", [
      {
        link: "https://www.nti.org/analysis/articles/china-new-icbm-silo-fields-at-yumen/",
        title: { rendered: "China's New ICBM Silo Fields at Yumen" },
      },
    ]);
    expect(viaRest[0].id).toBe(rows[0].id);
  });
});

describe("ntiRestUrl", () => {
  it("modified 내림차순 폴링 URL을 만든다", () => {
    const url = ntiRestUrl("https://www.nti.org/wp-json/wp/v2/", "atomic-pulse", 20);
    expect(url).toContain("/wp-json/wp/v2/atomic-pulse?");
    expect(url).toContain("orderby=modified");
    expect(url).toContain("order=desc");
    expect(url).toContain("per_page=20");
    expect(url).not.toContain("v2//");
  });
});
