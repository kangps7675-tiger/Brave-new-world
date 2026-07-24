/**
 * VIINA (ODbL) — 멋진 신세계 데이터 사용 정책
 *
 * Produced Work(제작물)만 허용: 지도 렌더링·UI 패널 텍스트.
 * 파생 DB 재배포·공개 API export 금지.
 *
 * @see docs/copyright-checklist.md
 */

export const VIINA_POLICY = {
  /** 지구본/맵 렌더링 및 클릭 패널 표시만 허용 */
  renderingOnly: true,
  /** /api/* 등으로 VIINA raw·bulk 데이터 제공 금지 */
  publicApiExportForbidden: true,
  /** GeoJSON/CSV 등 사용자 다운로드 금지 */
  userExportForbidden: true,
  /** 앱 밖에서의 렌더 캐시 스크rape 차단 (세션·same-origin 게이트) */
  scrapeGateRequired: true,
  license: "ODbL-1.0",
  licenseUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
  sourceName: "VIINA",
  /** 공식 프로젝트 URL — attribution 링크용 */
  sourceUrl: "https://github.com/zhukovyuri/VIINA",
} as const;

/** ODbL 4.3 Produced Work attribution (영문 표준 예시) */
export const VIINA_ATTRIBUTION_EN =
  "Contains information from VIINA, which is made available here under the Open Database License (ODbL).";

/** UI용 한국어 요약 */
export const VIINA_ATTRIBUTION_KO =
  "본 지도에는 VIINA(Open Database License, ODbL v1.0)에 따라 제공된 정보가 포함됩니다. 데이터는 화면 렌더링 전용이며, 원본 추출·API 제공은 하지 않습니다.";

export type ViinaPublicApiBlockReason =
  | "public-api-forbidden"
  | "user-export-forbidden"
  | "static-bulk-distribution";

const BLOCK_MESSAGES: Record<ViinaPublicApiBlockReason, string> = {
  "public-api-forbidden":
    "VIINA data is not available via public API (rendering-only policy). See docs/copyright-checklist.md",
  "user-export-forbidden":
    "VIINA data export is disabled (rendering-only policy).",
  "static-bulk-distribution":
    "VIINA derivative database must not be distributed without ODbL Share-Alike compliance.",
};

/**
 * 신규 API 라우트에서 VIINA raw/bulk 응답을 막을 때 호출.
 * @example return rejectViinaPublicDataApi("public-api-forbidden");
 */
export function rejectViinaPublicDataApi(
  reason: ViinaPublicApiBlockReason = "public-api-forbidden",
): Response {
  return Response.json(
    {
      error: BLOCK_MESSAGES[reason],
      policy: "viina-rendering-only",
      renderingOnly: VIINA_POLICY.renderingOnly,
    },
    { status: 403 },
  );
}

/** 빌드·라우트 가드: VIINA 공개 API 경로 패턴 (미래 실수 방지) */
export const VIINA_FORBIDDEN_API_PATH_PATTERNS = [
  /^\/api\/viina/i,
  /^\/api\/layers\/ukraine-control/i,
  /^\/api\/layers\/viina/i,
  /^\/api\/export\/viina/i,
  /^\/api\/download\/viina/i,
] as const;

export function isForbiddenViinaApiPath(pathname: string): boolean {
  return VIINA_FORBIDDEN_API_PATH_PATTERNS.some((re) => re.test(pathname));
}
