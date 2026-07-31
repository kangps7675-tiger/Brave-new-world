/**
 * 상업 이용 게이트 — 유료 티어에 무엇을 노출해도 되는가.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  왜 필요한가
 * ══════════════════════════════════════════════════════════════════════
 *
 * 요금제를 붙이는 순간 제품 전체가 **상업적 이용**이 된다.
 * "데이터를 팔지 않고 화면만 보여준다"는 방어가 되지 않는다 —
 * CC NonCommercial 정의가 "commercial advantage **or monetary compensation**"
 * 이기 때문이다. 접근료를 받으면 그게 monetary compensation 이다.
 *
 * 그리고 이건 **레이어 하나만 잘못 섞여도 계약 위반**이다.
 * 예: adsb.fi 는 "personal, non-commercial use only" 를 약관에 명시했다.
 *     ACLED 는 "commercial entities may not access or use the Content
 *     without first obtaining a corporate license" 다.
 *
 * 레이어가 60개가 넘는데 사람 기억에 의존할 수 없다. 그래서 게이트를 건다.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  두 축을 혼동하지 말 것
 * ══════════════════════════════════════════════════════════════════════
 *
 *   재배포 축  — 원본 DB 를 넘기는가?  → viinaRenderGate 가 방어
 *   상업성 축  — 그 화면으로 돈을 받는가? → **이 파일이 방어**
 *
 * 렌더 전용이어도 유료면 상업적 이용이다. 두 게이트는 서로를 대체하지 않는다.
 */

import {
  NEWS_LAYER_SOURCE_CATALOG,
  type NewsLayerSourceNote,
} from "@/data/sourceCatalog";

export type CommercialUse = NewsLayerSourceNote["commercialUse"];

/** 제품 티어 — 유료 접근이 걸리는 지점 */
export type ProductTier = "free" | "paid";

/**
 * 유료 티어에 노출 가능한 상태.
 *
 * ⚠️ `unknown` 은 **의도적으로 차단**한다.
 *    "아직 안 알아봤다"와 "괜찮다"는 다르다. 확인 전까지는 못 판다.
 */
const PAID_SAFE: ReadonlySet<CommercialUse> = new Set<CommercialUse>(["allowed"]);

export function isCommercialSafe(use: CommercialUse): boolean {
  return PAID_SAFE.has(use);
}

/**
 * 공공누리 유형 → 유료 티어 노출 가부.
 *
 * ⚠️ 제3유형(변경금지)이 함정이다. 우리 파이프라인은 데이터를 **실제로 변경**한다:
 *    · `roundCoord(v, 2)` — 좌표를 1.1km 격자로 반올림
 *    · `capArrayGeographic()` — 지리 층화 표본 추출
 *    · `compactStaticPoint()` — 필드명 압축
 *    "그대로 표시"가 아니라 가공이므로 변경금지 조건에 걸릴 수 있다.
 */
export function isKoglPaidSafe(kogl: NewsLayerSourceNote["koglType"]): boolean {
  if (!kogl) return true; // 한국 공공데이터가 아니면 해당 없음
  // type-1(출처표시만) · none(순수 공공데이터)만 안전
  return kogl === "type-1" || kogl === "none";
}

export const KOGL_LABEL: Record<
  NonNullable<NewsLayerSourceNote["koglType"]>,
  { ko: string; paidOk: boolean }
> = {
  "type-1": { ko: "공공누리 제1유형 (출처표시)", paidOk: true },
  "type-2": { ko: "공공누리 제2유형 (출처표시 + 상업금지)", paidOk: false },
  "type-3": { ko: "공공누리 제3유형 (출처표시 + 변경금지)", paidOk: false },
  "type-4": { ko: "공공누리 제4유형 (상업금지 + 변경금지)", paidOk: false },
  none: { ko: "공공데이터 (공공누리 표시 없음)", paidOk: true },
};

/** 이 레이어를 유료 화면에 올려도 되는가. */
export function canShowInPaidTier(layerId: string): boolean {
  const note = NEWS_LAYER_SOURCE_CATALOG.find((n) => n.layerId === layerId);
  // 카탈로그에 없으면 판단 불가 → 막는다 (fail-closed)
  if (!note) return false;
  if (note.status === "blocked") return false;
  // 공공누리 유형과 commercialUse 를 **모두** 통과해야 한다
  if (!isKoglPaidSafe(note.koglType)) return false;
  return isCommercialSafe(note.commercialUse);
}

/** 티어별 노출 가능 여부. 무료 티어는 라이선스 조건만 지키면 된다. */
export function canShowInTier(layerId: string, tier: ProductTier): boolean {
  const note = NEWS_LAYER_SOURCE_CATALOG.find((n) => n.layerId === layerId);
  if (!note) return false;
  if (note.status === "blocked") return false;
  if (tier === "free") return true;
  return isCommercialSafe(note.commercialUse);
}

/** 유료 화면에서 걸러야 하는 레이어 목록 (사유 포함). */
export function paidTierBlockers(): Array<{
  layerId: string;
  commercialUse: CommercialUse;
  reason: string;
}> {
  return NEWS_LAYER_SOURCE_CATALOG.filter(
    (n) => n.status !== "blocked" && !isCommercialSafe(n.commercialUse),
  ).map((n) => ({
    layerId: n.layerId,
    commercialUse: n.commercialUse,
    reason: n.commercialNote ?? "사유 미기재",
  }));
}

/** 레이어 배열을 유료 티어용으로 거른다. */
export function filterForPaidTier<T extends { layerId?: string; id?: string }>(
  layers: readonly T[],
): T[] {
  return layers.filter((l) => {
    const id = l.layerId ?? l.id;
    return id ? canShowInPaidTier(id) : false;
  });
}

/**
 * 상업 이용 가능한 레이어만.
 * 유료 제품 패키지를 정의할 때 이 목록에서만 고르면 안전하다.
 */
export function commercialSafeLayerIds(): string[] {
  return NEWS_LAYER_SOURCE_CATALOG.filter(
    (n) => n.status !== "blocked" && isCommercialSafe(n.commercialUse),
  ).map((n) => n.layerId);
}

/** 상업 라이선스를 사면 열리는 레이어 — 협상 우선순위 판단용. */
export function licensableLayerIds(): string[] {
  return NEWS_LAYER_SOURCE_CATALOG.filter(
    (n) => n.commercialUse === "license-required",
  ).map((n) => n.layerId);
}

/** 확인만 하면 되는 레이어 — 가장 싸게 늘릴 수 있는 후보. */
export function unverifiedLayerIds(): string[] {
  return NEWS_LAYER_SOURCE_CATALOG.filter((n) => n.commercialUse === "unknown").map(
    (n) => n.layerId,
  );
}

export const COMMERCIAL_USE_LABEL: Record<
  CommercialUse,
  { ko: string; en: string; paidOk: boolean }
> = {
  allowed: { ko: "상업 이용 가능", en: "Commercial use allowed", paidOk: true },
  "license-required": {
    ko: "상업 라이선스 필요",
    en: "Commercial licence required",
    paidOk: false,
  },
  prohibited: { ko: "상업 이용 금지", en: "Commercial use prohibited", paidOk: false },
  unknown: { ko: "미확인", en: "Unverified", paidOk: false },
};

/**
 * 유료 사용자에게 보여줄 고지.
 * 무료 티어에만 있는 레이어가 왜 유료에 없는지 설명해야 한다 —
 * 안 그러면 "돈 냈는데 기능이 줄었다"는 불만이 나온다.
 */
export const PAID_TIER_NOTICE_KO =
  "일부 레이어는 제공처의 비상업 이용 약관 때문에 유료 플랜에서 제외됩니다. " +
  "무료 열람에서는 계속 보실 수 있습니다.";
export const PAID_TIER_NOTICE_EN =
  "Some layers are excluded from paid plans because their providers restrict commercial use. " +
  "They remain available in free viewing.";
