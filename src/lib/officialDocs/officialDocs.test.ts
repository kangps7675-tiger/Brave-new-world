import { describe, expect, it } from "vitest";
import { ISSUERS, ISSUER_IDS } from "@/data/officialDocs";
import { classifyDocKind, weightOf } from "@/lib/officialDocs/classify";
import { htmlToText, pickDate, pickTitle, sha256Hex } from "@/lib/officialDocs/extract";
import { parseOfficialFeed, worthKeeping } from "@/lib/officialDocs/feed";
import { validateDocMeta } from "@/lib/officialDocs/validate";

describe("공식 문서 종류·무게", () => {
  it("제목으로 종류를 가르고 합의·일방·발언을 구분한다", () => {
    expect(classifyDocKind("U.S. New START Treaty Aggregate Numbers of Strategic Offensive Arms Fact Sheet")).toBe("factsheet");
    expect(classifyDocKind("Joint Statement of the United States and Japan")).toBe("joint-statement");
    expect(classifyDocKind("NATO Summit Declaration")).toBe("joint-statement");
    expect(classifyDocKind("Readout of President's call with President X")).toBe("readout");
    expect(classifyDocKind("Telephone conversation with President of Turkey Recep Tayyip Erdogan")).toBe("readout");
    expect(classifyDocKind("Germany at the UN Climate Change Conference: Speeding up the implementation of the Paris Agreement")).toBe("press-release");
    expect(classifyDocKind("EU budget for 2027: Council and Parliament reach agreement")).toBe("press-release");
    expect(classifyDocKind("Regarding the Agreement Between Yemeni Parties on the Release of Detainees")).toBe("treaty");
    expect(classifyDocKind("Treaty on the Prohibition of Nuclear Weapons enters into force")).toBe("treaty");
    expect(classifyDocKind("Secretary General's press conference")).toBe("remarks");
    expect(classifyDocKind("Weekly update")).toBe("press-release");
    expect(weightOf("joint-statement")).toBe("agreed");
    expect(weightOf("factsheet")).toBe("unilateral");
    expect(weightOf("remarks")).toBe("remarks");
  });

  it("17곳이 모두 있고 id가 겹치지 않는다", () => {
    expect(ISSUERS).toHaveLength(23);
    expect(new Set(ISSUERS.map((row) => row.id)).size).toBe(23);
    expect(ISSUER_IDS).toHaveLength(23);
    expect(ISSUERS.find((row) => row.id === "nato")?.kind).toBe("organization");
  });
});

describe("피드 읽기", () => {
  const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><updated>2026-11-10T23:00:16+00:00</updated>
    <link rel="alternate" type="text/html" href="https://www.gov.uk/government/news/joint-statement-uk-japan"/>
    <title>Joint statement - UK and Japan leaders on defence cooperation</title><summary type="html">A &amp;amp; B</summary></entry>
    <entry><link href="https://www.gov.uk/x"/><title>Speech by the Foreign Secretary</title><updated>2026-11-09T10:00:00Z</updated></entry></feed>`;

  it("Atom을 읽고 제목의 ' - '를 자르지 않는다", () => {
    const rows = parseOfficialFeed(atom, "gb");
    expect(rows).toHaveLength(2);
    expect(rows[0].title).toBe("Joint statement - UK and Japan leaders on defence cooperation");
    expect(rows[0].publishedAt).toBe("2026-11-10");
    expect(rows[0].kind).toBe("joint-statement");
    expect(rows[0].url).toBe("https://www.gov.uk/government/news/joint-statement-uk-japan");
    expect(worthKeeping(rows[0])).toBe(true);
    expect(worthKeeping(rows[1])).toBe(false);
  });

  it("RSS와 HTML 오류 페이지를 구분한다", () => {
    const rss = `<rss><channel><item><title>Fact Sheet: X</title><link>https://example.gov/a</link><pubDate>Fri, 12 May 2023 00:00:00 GMT</pubDate></item></channel></rss>`;
    expect(parseOfficialFeed(rss, "us")[0].publishedAt).toBe("2023-05-12");
    expect(parseOfficialFeed("<!DOCTYPE html><html>403</html>", "us")).toEqual([]);
  });
});

describe("본문 뽑기", () => {
  const html = `<html><head><title>T</title><meta property="og:title" content="Fact Sheet &amp; Numbers">
    <meta property="article:published_time" content="2023-05-12T10:00:00-04:00"></head>
    <body><nav>메뉴</nav><main><h1>제목</h1><p>첫 문단 &#x2013; 내용.</p><p>둘째   문단.</p></main><footer>바닥</footer></body></html>`;

  it("main만 뽑고 메뉴·바닥은 버리며 문자 참조를 푼다", () => {
    expect(htmlToText(html)).toBe("제목\n첫 문단 – 내용.\n둘째 문단.");
    expect(pickTitle(html)).toBe("Fact Sheet & Numbers");
    expect(pickDate(html)).toBe("2023-05-12");
  });

  it("날짜가 없으면 지어내지 않는다", () => {
    expect(pickDate("<html><body>x</body></html>")).toBeNull();
  });

  it("해시는 본문이 한 글자만 달라도 바뀐다", () => {
    expect(sha256Hex("a")).not.toBe(sha256Hex("b"));
    expect(sha256Hex("a")).toHaveLength(64);
  });
});

describe("본문 뽑기: 사이트별 모양", () => {
  it("본문 전체를 <form> 하나로 감싼 사이트(ASP.NET)에서도 글을 뽑는다", () => {
    const body = "Statement of the Spokesperson. ".repeat(12);
    const html = `<html><body><form id="f"><div class="c"><h1>제목</h1><p>${body}</p></div></form></body></html>`;
    expect(htmlToText(html)).toContain("Statement of the Spokesperson.");
  });
  it("공유 버튼 줄은 버리고 본문은 남긴다", () => {
    const html = "<body><main><p>Share on Facebook</p><p>Share</p><p>Real sentence one.</p></main></body>";
    expect(htmlToText(html)).toBe("Real sentence one.");
  });
  it("<main>에 제목만 있으면 <body> 전체로 다시 뽑는다", () => {
    const long = "Body text. ".repeat(30);
    const html = `<body><main><h1>Title</h1></main><div><p>${long}</p></div></body>`;
    expect(htmlToText(html)).toContain("Body text.");
  });
});

describe("승인 검사", () => {
  const ok = {
    id: "us-20230512-abc123",
    issuerIds: ["us" as const],
    kind: "factsheet" as const,
    weight: "unilateral" as const,
    title: "U.S. New START Treaty Aggregate Numbers",
    publishedAt: "2023-05-12",
    sourceUrl: "https://www.state.gov/x.pdf",
    fetchedAt: "2026-11-12",
    sha256: "a".repeat(64),
    language: "en",
    relatedTags: [],
    terms: "미국 연방정부 저작물(17 U.S.C. §105)",
  };

  it("다 채우면 통과", () => expect(validateDocMeta(ok)).toEqual([]));
  it("날짜·이용 조건이 비면 거절", () => {
    expect(validateDocMeta({ ...ok, publishedAt: "" })).not.toEqual([]);
    expect(validateDocMeta({ ...ok, terms: "확인 전" })).not.toEqual([]);
  });
  it("한 나라만 낸 문서를 합의문서로 못 올린다(나토·EU 제외)", () => {
    expect(validateDocMeta({ ...ok, kind: "statement", weight: "agreed" })).not.toEqual([]);
    expect(validateDocMeta({ ...ok, kind: "joint-statement", weight: "agreed", issuerIds: ["nato"] })).toEqual([]);
  });

  it("남이 낸 공동성명을 반박하는 글은 합의문이 아니라 성명이다", () => {
    expect(classifyDocKind("MOFA solemnly refutes false claims regarding ROC (Taiwan) in China-Gabon joint statement")).toBe("statement");
    expect(classifyDocKind("Joint statement by the foreign ministers of Japan and Korea")).toBe("joint-statement");
  });
});
