import { describe, expect, it } from "vitest";
import { issuerNameKo } from "@/lib/countryName";
import { discoverFeeds, officialSiteFromHost, officialSiteFromUrl } from "@/lib/officialSites";

describe("정부 사이트 알아보기", () => {
  it.each([
    ["www.state.gov", "us", "government"],
    ["www.defense.gov", "us", "government"],
    ["www.centcom.mil", "us", "military"],
    ["www.gov.uk", "gb", "government"],
    ["www.mofa.go.kr", "kr", "government"],
    ["www.mofa.go.jp", "jp", "government"],
    ["www.diplomatie.gouv.fr", "fr", "government"],
    ["www.gob.mx", "mx", "government"],
    ["www.esteri.it", "it", "government"],
    ["en.mfa.ir", "ir", "government"],
    ["www.govt.nz", "nz", "government"],
    ["www.mfa.gov.cn", "cn", "government"],
    ["en.kremlin.ru", "ru", "government"],
    ["www.bundesregierung.de", "de", "government"],
    ["www.gov.il", "il", "government"],
    ["www.nato.int", "nato", "organization"],
    ["www.consilium.europa.eu", "eu", "organization"],
  ])("%s → %s", (host, id, kind) => {
    expect(officialSiteFromHost(host)).toEqual({ issuerId: id, kind });
  });

  it("정부가 아닌 사이트는 모른다고 한다", () => {
    for (const host of ["www.reuters.com", "goforward.com", "gov-watch.com", "example.com", "notgov.org", "mil.com"]) {
      expect(officialSiteFromHost(host)).toBeNull();
    }
    expect(officialSiteFromUrl("not a url")).toBeNull();
  });

  it("나라·기구 이름을 한국어로 푼다", () => {
    expect(issuerNameKo("ru")).toBe("러시아");
    expect(issuerNameKo("nato")).toBe("나토");
    expect(issuerNameKo("gb")).toBe("영국");
  });

  it("페이지의 피드 링크를 찾아 상대 주소를 푼다", () => {
    const html = `<head><link rel="alternate" type="application/rss+xml" title="보도자료" href="/rss/press.xml">
      <link rel="stylesheet" href="/a.css"><link rel="alternate" type="application/atom+xml" href="https://x.gov/atom"></head>`;
    expect(discoverFeeds(html, "https://x.gov/home")).toEqual([
      { url: "https://x.gov/rss/press.xml", title: "보도자료" },
      { url: "https://x.gov/atom", title: "" },
    ]);
  });
});
