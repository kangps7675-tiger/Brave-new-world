import { describe, expect, it } from "vitest";
import { jmodReportForFlash, parseJmodList, parseJmodReport, type JmodReport } from "./jmodLaunch";

const item = { title: "北朝鮮のミサイル等関連情報", url: "https://www.mod.go.jp/j/press/news/2026/09/20e.html", date: "2026-09-20" };
const page = (body: string) => `<html><body><main><p>令和８年９月２０日</p><p>${body}</p></main></body></html>`;

describe("parseJmodReport", () => {
  it("2026-09-20 발표: 시각·고도·거리·낙하 영역", () => {
    const r = parseJmodReport(
      page("北朝鮮は本日１５時００分頃、北朝鮮東岸付近から、少なくとも１発の弾道ミサイルを、北東方向に向けて発射しました。発射された弾道ミサイルは、最高高度約６０ｋｍ程度で、約４４０ｋｍ程度飛翔し、落下したのは日本海の我が国の排他的経済水域（ＥＥＺ）外であると推定しています。"),
      item,
    )!;
    expect(r.launchAt).toBe("2026-09-20T06:00:00.000Z");
    expect(r).toMatchObject({ apogeeKm: 60, distanceKm: 440, distanceAtLeast: false, outsideJapanEez: true });
    expect(r.landing).toContain("日本海");
  });
  it("약 450km を超えて는 하한으로 표시", () => {
    const r = parseJmodReport(page("北朝鮮は本日１２時３４分頃、北朝鮮西岸から、１発の弾道ミサイルを発射しました。最高高度約５０ｋｍ程度で、約４５０ｋｍを超えて飛翔し、落下したのは朝鮮半島東の我が国の排他的経済水域（ＥＥＺ）外であると推定しています。"), item)!;
    expect(r).toMatchObject({ distanceKm: 450, distanceAtLeast: true, apogeeKm: 50 });
  });
  it("수치가 없는 짧은 속보는 버린다", () => {
    expect(parseJmodReport(page("北朝鮮は、本日１２時３６分頃、弾道ミサイルの可能性があるものを発射しました。"), item)).toBeNull();
  });
});

describe("parseJmodList", () => {
  it("북한 미사일 항목만, 연도는 주소에서", () => {
    const html = `<a href="/j/press/news/2026/10/29d.html">北朝鮮のミサイル等関連情報（続報）について</a><a href="/j/press/news/2026/10/29a.html">防衛大臣記者会見</a>`;
    expect(parseJmodList(html)).toEqual([{ title: "北朝鮮のミサイル等関連情報(続報)について", url: "https://www.mod.go.jp/j/press/news/2026/10/29d.html", date: "2026-10-29" }]);
  });
});

describe("jmodReportForFlash", () => {
  const r: JmodReport = { url: "u", title: "t", launchAt: "2026-09-20T06:00:00.000Z", outsideJapanEez: true, distanceKm: 440 };
  const at = Date.parse("2026-09-20T06:20:00Z");
  it("같은 시간대 북한 발사 속보에만 붙는다", () => {
    expect(jmodReportForFlash("North Korea fires ballistic missile", at, [r])).toBe(r);
    expect(jmodReportForFlash("North Korea fires ballistic missile", at + 14 * 3600_000, [r])).toBeNull();
    expect(jmodReportForFlash("Iran fires ballistic missile", at, [r])).toBeNull();
  });
  it("같은 시간대에 발표가 둘이고 구분이 안 되면 붙이지 않고, 충분히 떨어져 있으면 가까운 쪽에 붙인다", () => {
    const early: JmodReport = { ...r, url: "early", launchAt: "2026-09-20T03:00:00.000Z", distanceKm: 300 };
    const late: JmodReport = { ...r, url: "late", launchAt: "2026-09-20T06:00:00.000Z", distanceKm: 440 };
    // 속보 시각 06:20 — 두 발사가 3시간 떨어져 있어 06:00 쪽이 명확히 가깝다
    expect(jmodReportForFlash("North Korea fires ballistic missile", at, [early, late])).toBe(late);
    // 두 발사가 1시간 간격이라(05:00·06:00) 어느 속보인지 가를 수 없다
    const close: JmodReport = { ...r, url: "close", launchAt: "2026-09-20T05:00:00.000Z", distanceKm: 380 };
    expect(jmodReportForFlash("North Korea fires ballistic missile", at, [close, late])).toBeNull();
  });
});
