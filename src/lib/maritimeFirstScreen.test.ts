import { describe, expect, it } from "vitest";
import { FIRST_SCREEN_MARITIME_OFF, FIRST_SCREEN_MARITIME_ON } from "@/lib/firstScreenLayers";
import { buildDomainOverviewPrefs } from "@/lib/entryOverview";
import { LAB_LAYER_KEYS } from "@/lib/layerLab";
import {
  DEFAULT_PACKAGE_SELECTION,
  MARITIME_VIEWER_PACKAGE,
  mergeViewPackages,
  viewerModeFromPackages,
} from "@/lib/viewPackages";
import { feedsForPackages } from "@/lib/news/feedCatalog";
import { VALID_NEWS_PACKAGES } from "@/lib/news/newsStreamService";

/** 랜딩 「질문 넷」「화면 읽는 법」이 약속한 레이어 */
const PROMISED = [
  "showUkmtoIncidents", // 어느 배가 맞았나
  "showNavareaWarnings", // 국제 항행경보
  "showAis", // 주변 배 위치 신호
  "showUsCarriers", // 항공모함
  "showMilitaryActivity", // 군용기
  "showUkraineControl", // 붉은 면 + 불꽃(같은 스위치)
  "showAxisNetwork", // 빛나는 선
] as const;

describe("해운 위험 첫 화면 (랜딩 약속)", () => {
  it("신규 방문 기본 패키지는 해운 위험", () => {
    expect(DEFAULT_PACKAGE_SELECTION).toEqual([MARITIME_VIEWER_PACKAGE]);
    expect(viewerModeFromPackages([MARITIME_VIEWER_PACKAGE])).toBe("conflict");
  });

  it("패키지를 적용하면 약속한 레이어가 다 켜지고, 지정학 잡음은 꺼진다", () => {
    const { layers, ui } = mergeViewPackages([MARITIME_VIEWER_PACKAGE]);
    for (const k of PROMISED) expect(layers[k], k).toBe(true);
    for (const k of FIRST_SCREEN_MARITIME_OFF) expect(layers[k], k).toBe(false);
    expect(ui.defaultIntelTab).toBe("news");
  });

  it("다른 패키지와 겹치면 그 패키지가 켠 레이어는 끄지 않는다", () => {
    const { layers } = mergeViewPackages([MARITIME_VIEWER_PACKAGE, "frontline-live"]);
    expect(layers.showAlliedBlocs).toBe(true); // 해운이 끄지만 전선이 켬
  });

  it("첫 방문 히어로(언어 선택 직후)도 같은 레이어", () => {
    const hero = buildDomainOverviewPrefs("conflict", { maritime: true });
    for (const k of PROMISED) expect(hero[k], k).toBe(true);
    // 「전선·분쟁」을 고른 사람은 예전 지정학 히어로 그대로
    const conflict = buildDomainOverviewPrefs("conflict");
    expect(conflict.showNavareaWarnings).toBe(false);
    expect(conflict.showAlliedBlocs).toBe(true);
  });

  it("약속한 레이어는 실험실(숨김) 목록에 없다", () => {
    const lab = new Set<string>(LAB_LAYER_KEYS);
    for (const k of Object.keys(FIRST_SCREEN_MARITIME_ON)) expect(lab.has(k), k).toBe(false);
  });

  it("뉴스는 해협·유가·보험 기사가 있는 경제 피드까지 받는다", () => {
    const urls = feedsForPackages([MARITIME_VIEWER_PACKAGE]).map((f) => f.name);
    expect(urls.some((n) => /Chokepoint/i.test(n))).toBe(true);
    expect(VALID_NEWS_PACKAGES.has(MARITIME_VIEWER_PACKAGE)).toBe(true);
  });
});

describe("신규 방문 레이어 (loadLayerPrefs 첫 방문 경로)", () => {
  it("firstVisitLayerPrefs 는 해운 레이어를 켜고 지정학 잡음을 끈다", async () => {
    const { firstVisitLayerPrefs, DEFAULT_LAYER_PREFS } = await import("@/lib/layerPrefs");
    const v = firstVisitLayerPrefs(DEFAULT_LAYER_PREFS);
    for (const k of PROMISED) expect(v[k], k).toBe(true);
    for (const k of FIRST_SCREEN_MARITIME_OFF) expect(v[k], k).toBe(false);
    // 기본값 객체 자체는 그대로 (재방문자 저장값 병합 기준)
    expect(DEFAULT_LAYER_PREFS.showNavareaWarnings).toBe(false);
  });
});
