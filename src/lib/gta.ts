/**
 * Global Trade Alert (GTA) — 무역정책 조치.
 *
 * 지경학 축의 "돈과 규칙" 쪽 정본 소스.
 * License: CC BY 4.0 · 비상업 무료 · https://globaltradealert.org
 *
 * ── 반드시 알아야 할 두 가지 ────────────────────────────────────────
 *
 * 1. **좌표가 없다.**
 *    GTA 레코드는 관할권(UN country code) · HS 품목 · CPC 섹터뿐이다.
 *    3D 지구본에서는 점이 아니라 implementer 중심 → affected 중심 **호**로
 *    렌더한다. `gtaTradePaths.ts` 가 그 변환을 담당한다.
 *
 * 2. **Red/Amber/Green 은 사실이 아니라 GTA 의 판단이다.**
 *    UI 에서 반드시 "GTA 평가"로 귀속 표기해야 한다.
 *    우리 EvidenceTier 로는 `reported` — 관보 등 공개 정책문서를 GTA 연구진이
 *    2차 코딩한 자료다. 관측(observed)이 아니다.
 */

/** GTA 자체 평가 — 객관 사실이 아님. 반드시 GTA 에 귀속시킬 것. */
export type GtaEvaluation = "Red" | "Amber" | "Green";

/** basic = 셀프서비스 API 키 · full = 별도 승인 (설명·출처·관세율) */
export type GtaAccessLevel = "basic" | "full";

export type GtaJurisdiction = {
  unCode: number;
  iso3: string;
  name: string;
};

export type GtaProduct = {
  hsCode: number;
  hsChapter: number;
  /** full access 전용 */
  priorLevel?: string | null;
  newLevel?: string | null;
  unit?: string | null;
};

export type GtaIntervention = {
  interventionId: number;
  stateActId: number | null;
  title: string;
  evaluation: GtaEvaluation;
  interventionType: string | null;
  mastChapter: string | null;
  implementationLevel: string | null;
  dateAnnounced: string | null;
  dateImplemented: string | null;
  dateRemoved: string | null;
  isInForce: boolean;
  interventionUrl: string | null;
  implementers: GtaJurisdiction[];
  affected: GtaJurisdiction[];
  products: GtaProduct[];
  sectors: number[];
  /** full access 전용 */
  description?: string | null;
  sourceNote?: string | null;
  isOfficialSource?: boolean | null;
  accessLevel: GtaAccessLevel;
};

export const GTA_ATTRIBUTION = "Global Trade Alert (globaltradealert.org) · CC BY 4.0";

export const GTA_EVALUATION_LABEL: Record<
  GtaEvaluation,
  { ko: string; en: string; hintKo: string; hintEn: string }
> = {
  Red: {
    ko: "유해",
    en: "Harmful",
    hintKo: "GTA 평가: 외국 상업 이익을 차별하는 조치",
    hintEn: "GTA assessment: discriminates against foreign commercial interests",
  },
  Amber: {
    ko: "불투명",
    en: "Murky",
    hintKo: "GTA 평가: 차별 여부가 불분명한 조치",
    hintEn: "GTA assessment: likely but not certainly discriminatory",
  },
  Green: {
    ko: "자유화",
    en: "Liberalising",
    hintKo: "GTA 평가: 외국 상업 이익을 개선하는 조치",
    hintEn: "GTA assessment: improves foreign commercial interests",
  },
};

/** 지도 호 색상 — 신호등 은유를 그대로 쓴다. */
export const GTA_EVALUATION_COLOR: Record<GtaEvaluation, string> = {
  Red: "rgba(220, 38, 38",
  Amber: "rgba(217, 119, 6",
  Green: "rgba(22, 163, 74",
};

/**
 * HS 챕터 → 우리 시설 레이어.
 *
 * **이게 GTA 통합의 핵심 가치다.** "중국이 철강 수출을 제한했다"는 정책 뉴스를
 * "그럼 중국 철강소가 어디 있나"로 곧장 연결한다.
 *
 * ⚠️ 2026-07-31 감사 P0-1 이전에는 아래 5개 레이어 좌표가 전부 널섬(0,0)이었다.
 *    `npm run gem:trackers:all` 재실행이 선행되어야 이 매핑이 의미를 갖는다.
 */
export const HS_CHAPTER_TO_LAYER: Record<number, { layer: string; labelKo: string }> = {
  25: { layer: "gem-cement", labelKo: "시멘트·석재" },
  26: { layer: "gem-iron-ore", labelKo: "광석·슬래그" },
  27: { layer: "gem-oil-gas-extraction", labelKo: "광물성 연료" },
  28: { layer: "gem-chemicals", labelKo: "무기화학" },
  29: { layer: "gem-chemicals", labelKo: "유기화학" },
  31: { layer: "gem-chemicals", labelKo: "비료" },
  72: { layer: "gem-steel", labelKo: "철강" },
  73: { layer: "gem-steel", labelKo: "철강제품" },
  74: { layer: "gem-iron-ore", labelKo: "구리" },
  76: { layer: "gem-iron-ore", labelKo: "알루미늄" },
  84: { layer: "gem-steel", labelKo: "기계류" },
  85: { layer: "ai-data-centers", labelKo: "전기·전자 (반도체 포함)" },
};

export function layerForHsChapter(chapter: number): string | null {
  return HS_CHAPTER_TO_LAYER[chapter]?.layer ?? null;
}

/** HS 6자리 → 챕터 2자리. 4자리·2자리 코드도 안전하게 처리한다. */
export function hsChapter(hsCode: number): number {
  const s = String(Math.trunc(Math.abs(hsCode)));
  if (s.length <= 2) return Number(s);
  if (s.length <= 4) return Number(s.slice(0, 2));
  return Number(s.slice(0, s.length - 4));
}

/**
 * 조치의 "무게" — 호 굵기·불투명도에 쓴다.
 * 영향 품목 수와 대상국 수를 함께 본다. 로그 스케일이라 한두 건과
 * 수백 건의 차이는 보이되 화면이 뭉개지지는 않는다.
 */
export function interventionWeight(iv: GtaIntervention): number {
  const products = Math.max(1, iv.products.length);
  const targets = Math.max(1, iv.affected.length);
  return Math.log2(products + 1) * Math.log2(targets + 1);
}

/**
 * 발표 → 시행 시차(일).
 *
 * 지경학에서 의미 있는 지표다. 시차가 0 이하면 소급 적용이고,
 * 아주 길면 예고형 압박(신호)일 수 있다.
 */
export function announcementLagDays(iv: GtaIntervention): number | null {
  if (!iv.dateAnnounced || !iv.dateImplemented) return null;
  const a = Date.parse(iv.dateAnnounced);
  const b = Date.parse(iv.dateImplemented);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

/** UI 라벨 — 항상 GTA 귀속을 붙인다. */
export function evaluationBadge(
  evaluation: GtaEvaluation,
  lang: "ko" | "en",
): { label: string; hint: string } {
  const e = GTA_EVALUATION_LABEL[evaluation];
  return {
    label: lang === "en" ? `GTA: ${e.en}` : `GTA 평가: ${e.ko}`,
    hint: lang === "en" ? e.hintEn : e.hintKo,
  };
}
