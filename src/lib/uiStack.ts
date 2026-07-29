/**
 * UI 스택 — z-index 단일 출처 (P1-2)
 *
 * ── 왜 필요한가 ────────────────────────────────────────────────────
 * 하드코딩 z 값이 128곳, 고유 값이 30종 이상이었다:
 *   1, 10, 30, 38, 40, 42, 48, 50, 55, 60, 70, 75, 80, 90, 95, 100, 110,
 *   119, 120, 125, 9000, 9600, 9990, 9999, 10000, 10010, 10020, 10025,
 *   10026, 10028, 10030, 10040, 10042, 10050, 12000
 *
 * `z-[10042]` 같은 값은 "위에 올려야 하니 일단 +2"의 흔적이다. 이 상태에서는
 * 새 오버레이를 추가할 때마다 겹침 버그가 재발하고, "누가 누구 위인가"를
 * 아는 사람이 사라진다.
 *
 * ── 층 구조 ────────────────────────────────────────────────────────
 * 층 사이 간격을 100 이상 벌려 뒀다. 같은 층 안에서 미세 조정이 필요하면
 * `Z.panel + 1`처럼 쓰되, **새 층을 임의로 만들지 말 것.**
 *
 *   base        0      지도 캔버스와 같은 평면
 *   mapChrome   100    지도 위 범례·워터마크·뱃지 (조작 대상 아님)
 *   mapControl  200    지도 위 토글·칩·호버카드 (조작 대상)
 *   nav         300    상단 네비게이션 본체
 *   navMenu     400    nav 드롭다운 — nav보다 위
 *   panelScrim  500    패널 뒤 스크림
 *   panel       600    닫기(✕)가 있는 창·시트·사이드바
 *   immersive   700    양피지·투어 등 전체화면 연출
 *   gate        800    진입 게이트·모달 (화면 점유)
 *   alert       900    공습 경보 등 — 게이트보다도 위
 *   toast       1000   전역 토스트 (항상 최상단)
 *
 * ── 규칙 ───────────────────────────────────────────────────────────
 * ① 새 코드에서 `z-[숫자]`를 직접 쓰지 않는다
 *    (scripts/check-z-index.mjs가 CI에서 잡는다)
 * ② 닫기 버튼이 있는 것은 최소 `panel`
 * ③ 사용자를 막는 것(게이트·모달)은 `gate` 이상
 */

export const Z = {
  base: 0,
  mapChrome: 100,
  mapControl: 200,
  nav: 300,
  navMenu: 400,
  panelScrim: 500,
  panel: 600,
  immersive: 700,
  gate: 800,
  alert: 900,
  toast: 1000,
} as const;

export type ZLayer = keyof typeof Z;

/** Tailwind 임의값 클래스 — `className={zc("panel")}` */
export function zc(layer: ZLayer): string {
  return `z-[${Z[layer]}]`;
}

/** 인라인 스타일용 — `style={{ zIndex: z("gate") }}` */
export function z(layer: ZLayer): number {
  return Z[layer];
}

/* ── 하위 호환 (기존 import 유지) ─────────────────────────────────
   기존 코드가 쓰던 이름. 신규 코드는 위의 Z/zc를 쓸 것. */

/** @deprecated Z.nav 사용 */
export const Z_NAV_MAX = Z.nav;
/** @deprecated zc("panel") 사용 */
export const Z_ABOVE_NAV = `z-[${Z.panel}]` as const;
/** @deprecated zc("panelScrim") 사용 */
export const Z_ABOVE_NAV_SCRIM = `z-[${Z.panelScrim}]` as const;
