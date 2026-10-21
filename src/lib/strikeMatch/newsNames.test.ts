import { describe, expect, it } from "vitest";
import { extractNamedClaims, nameFromText, newsSearchDue, outletsByName, type NewsItem } from "./newsNames";

const AT = Date.parse("2026-10-21T01:45:00Z");
const item = (over: Partial<NewsItem> & { title: string }): NewsItem => ({
  description: null,
  url: `https://example.com/${encodeURIComponent(over.title).slice(0, 30)}`,
  outlet: "Example",
  publishedAt: "2026-10-21T09:00:00Z",
  ...over,
});

describe("nameFromText", () => {
  it("선종어 + 이름 + 피격 동사", () => {
    expect(nameFromText("The tanker Ever Lovely was struck by a drone near Bukha")).toMatchObject({ name: "Ever Lovely" });
  });
  it("IMO 번호가 같이 있으면 체크섬이 맞을 때만 쓴다", () => {
    expect(nameFromText("Bulk carrier Sounion (IMO 9378474) was hit in the Gulf")?.imo).toBe("9378474");
    expect(nameFromText("Bulk carrier Sounion (IMO 1234568) was hit in the Gulf")?.imo).toBeNull();
  });
  it("M/V 접두어는 기존 규칙으로", () => {
    expect(nameFromText("M/V Tutor reported damage after attack")).toMatchObject({ name: "Tutor" });
  });
  it("지명·국적·일반 단어는 이름으로 안 친다", () => {
    expect(nameFromText("A tanker in the Strait of Hormuz was struck")).toBeNull();
    expect(nameFromText("The tanker Iranian Navy was hit")).toBeNull();
    expect(nameFromText("Tanker Hormuz was struck by projectile")).toBeNull();
    expect(nameFromText("A tanker was struck by an unknown projectile")).toBeNull();
  });
  it("경보의 일반 단어(MERCHANT·TANKER)는 이름이 아니다", () => {
    expect(nameFromText("Vessel Merchant was struck off Oman")).toBeNull();
  });
  it("소문자 단어에서 이름을 자른다", () => {
    expect(nameFromText("Tanker Front Altair was struck off Fujairah")?.name).toBe("Front Altair");
  });
});

describe("extractNamedClaims", () => {
  const inc = { atMs: AT, place: "Strait of Hormuz" };
  it("피격 단어·해역 키워드·시간 창을 모두 만족하는 기사만", () => {
    const items = [
      item({ title: "Tanker Ever Lovely was struck by a drone near Bukha, Oman" }),
      item({ title: "Tanker Calm Star was struck off Oman", publishedAt: "2026-10-26T09:00:00Z" }), // 72h 밖
      item({ title: "Tanker Quiet One reported stable insurance rates in the Gulf" }), // 피격 단어 없음
      item({ title: "Tanker Far Away was hit by a missile off Norway" }), // 해역 아님
      item({ title: "Tanker No Date was struck off Oman", publishedAt: null }),
    ];
    const out = extractNamedClaims(items, inc);
    expect(out.map((c) => c.name)).toEqual(["Ever Lovely"]);
  });
  it("같은 이름을 낸 매체 수를 센다", () => {
    const items = [
      item({ title: "Tanker Ever Lovely was struck off Oman", outlet: "Lloyd's List", url: "https://a.example/1" }),
      item({ title: "Tanker Ever Lovely was hit by a drone in Hormuz", outlet: "TradeWinds", url: "https://b.example/2" }),
      item({ title: "Tanker Blue Orchid was struck off Oman", outlet: "Lloyd's List", url: "https://a.example/3" }),
    ];
    const m = outletsByName(extractNamedClaims(items, inc));
    expect([...m.values()].find((v) => v.name === "Ever Lovely")!.outlets.size).toBe(2);
    expect([...m.values()].find((v) => v.name === "Blue Orchid")!.outlets.size).toBe(1);
  });
});

describe("newsSearchDue", () => {
  const now = Date.parse("2026-10-21T12:00:00Z");
  it("첫 검색은 사건 1시간 뒤부터", () => {
    expect(newsSearchDue(0.5, 0, null, now)).toBe(false);
    expect(newsSearchDue(1, 0, null, now)).toBe(true);
  });
  it("24시간까지 2시간 간격, 이후 12시간 간격", () => {
    expect(newsSearchDue(5, 1, now - 90 * 60_000, now)).toBe(false);
    expect(newsSearchDue(5, 1, now - 120 * 60_000, now)).toBe(true);
    expect(newsSearchDue(30, 5, now - 5 * 3_600_000, now)).toBe(false);
    expect(newsSearchDue(30, 5, now - 12 * 3_600_000, now)).toBe(true);
  });
  it("72시간이 지나거나 시도 한도를 넘으면 멈춘다", () => {
    expect(newsSearchDue(73, 3, now - 99 * 3_600_000, now)).toBe(false);
    expect(newsSearchDue(10, 20, now - 99 * 3_600_000, now)).toBe(false);
  });
});
