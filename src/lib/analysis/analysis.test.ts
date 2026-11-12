import { describe, expect, it } from "vitest";
import { parseAnalysisFeed, type AnalysisSource } from "./feed";
import { analysisForFlash, modelTokensOf } from "./match";

const SRC: AnalysisSource = { id: "38north", name: "38 North", org: "Stimson Center", url: "https://www.38north.org/feed/", scope: "kp", label: "38 North" };

// 2026-11-12에 받은 실제 38 North 피드의 구조(본문 content:encoded는 일부러 뺐다 — 우리는 읽지 않는다)
const FEED = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>38 North</title>
<item>
<title>The Choe Hyon, North Korean Navy Surface Ship, and Its Strategic Implications</title>
<link>https://www.38north.org/2026/11/the-choe-hyon-north-korean-navy-surface-ship-and-its-strategic-implications/</link>
<dc:creator><![CDATA[Joshua NT Park]]></dc:creator>
<pubDate>Tue, 10 Nov 2026 21:21:03 +0000</pubDate>
<category><![CDATA[Military Affairs]]></category><category><![CDATA[WMD]]></category><category><![CDATA[cruise missiles]]></category><category><![CDATA[choe hyon destroyer]]></category>
<description><![CDATA[<p>Overview of Series Analysis Most existing analysis of North Korea’s Choe Hyon destroyer has ...</p>
<p>The post <a href="https://www.38north.org/2026/11/x/">The Choe Hyon</a> appeared first on <a href="https://www.38north.org">38 North</a>.</p>
]]></description>
</item>
<item>
<title>Saying It With Pictures: North Korea Flashes Its Latest ICBM, Old &#8220;New&#8221; SLBMs, and &#8220;Tactical Nuclear Attack&#8221; Sub</title>
<link>https://www.38north.org/2026/10/saying-it-with-pictures/</link>
<dc:creator><![CDATA[Vann H. Van Diepen]]></dc:creator>
<pubDate>Thu, 29 Oct 2026 17:08:59 +0000</pubDate>
<category><![CDATA[WMD]]></category><category><![CDATA[hs-20]]></category><category><![CDATA[icbm]]></category><category><![CDATA[MIRV]]></category><category><![CDATA[slbm]]></category>
<description><![CDATA[<p>North Korean media announced the October 11 “inauguration” of the “National Defense Revolution ...</p>
<p>The post <a href="x">Saying</a> appeared first on <a href="y">38 North</a>.</p>
]]></description>
</item>
<item>
<title>Changes to PAD Ideological Instructors</title>
<link>https://www.38north.org/2026/10/changes-to-pad-ideological-instructors/</link>
<dc:creator><![CDATA[Michael Madden]]></dc:creator>
<pubDate>Mon, 26 Oct 2026 17:06:07 +0000</pubDate>
<category><![CDATA[Domestic Affairs]]></category><category><![CDATA[ideology]]></category>
<description><![CDATA[<p>The Third Workshop for Ideological Instructors, under the Workers’ Party of Korea (WPK) ...</p>]]></description>
</item></channel></rss>`;

describe("parseAnalysisFeed", () => {
  const items = parseAnalysisFeed(FEED, SRC);
  it("제목·링크·날짜·저자·분류를 읽고 따옴표 엔티티를 풀어 준다", () => {
    expect(items).toHaveLength(3);
    expect(items[1].title).toContain("“New” SLBMs");
    expect(items[0]).toMatchObject({ author: "Joshua NT Park", publishedAt: "2026-11-10T21:21:03.000Z" });
    expect(items[1].tags).toEqual(["wmd", "hs-20", "icbm", "mirv", "slbm"]);
  });
  it("요약은 짧은 발췌만, 'The post … appeared first on'은 뗀다", () => {
    expect(items[0].summary).toBe("Overview of Series Analysis Most existing analysis of North Korea’s Choe Hyon destroyer has ...");
    expect(items[0].summary.length).toBeLessThanOrEqual(200);
  });
  it("HTML 응답이면 빈 목록", () => {
    expect(parseAnalysisFeed("<html><body>blocked</body></html>", SRC)).toEqual([]);
  });
});

describe("modelTokensOf", () => {
  it("HS-20·Hwasong 20·화성-20형을 같은 기종으로 맞춘다", () => {
    for (const t of ["HS-20", "Hwasong-20", "Hwasong 20", "화성-20형", "화성포-20"]) expect(modelTokensOf(t)).toEqual(new Set(["hwasong-20"]));
  });
});

describe("analysisForFlash", () => {
  const items = parseAnalysisFeed(FEED, SRC);
  const AT = Date.parse("2026-11-11T00:00:00Z");
  it("발사 속보에 같은 기종을 다룬 분석이 붙는다(분류 태그 hs-20)", () => {
    const rows = analysisForFlash("North Korea launches Hwasong-20 ICBM toward the East Sea", AT, items);
    expect(rows.map((r) => r.item.url)).toEqual(["https://www.38north.org/2026/10/saying-it-with-pictures/"]);
    expect(rows[0].reasons.models).toEqual(["hwasong-20"]);
  });
  it("무관한 분석(선전·이념 교육)은 붙지 않는다", () => {
    expect(analysisForFlash("North Korea launches Hwasong-20 ICBM", AT, items).some((r) => r.item.title.startsWith("Changes to PAD"))).toBe(false);
    expect(analysisForFlash("Russia strikes Kharkiv overnight", AT, items)).toEqual([]);
  });
  it("발행일이 범위 밖이면 뺀다", () => {
    expect(analysisForFlash("North Korea launches Hwasong-20 ICBM", Date.parse("2027-03-01T00:00:00Z"), items)).toEqual([]);
  });
});
