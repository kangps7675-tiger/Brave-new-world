/**
 * SVG 문자열 조립 시 속성값 이스케이프.
 *
 * 이 저장소의 SVG 빌더 결과는 dangerouslySetInnerHTML 로 그대로 주입된다
 * (MapLegend·AnalysisPanel·WeeklyShipMovesPanel·LocationPinIcon).
 * 현재 인자는 전부 코드 내부 팔레트에서 오지만, 나중에 DB·API 값이 흘러들면
 * `fill="${x}"` 한 곳이 곧바로 XSS 싱크가 된다. 회귀 방지용 가드.
 *
 * SECURITY-ASSESSMENT-2026-07-30 HIGH-04.
 */

/** `#rgb` / `#rrggbb(aa)` / `rgb()` / `rgba()` / `hsl()` / CSS 키워드만 통과. */
const COLOR_RE =
  /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\(\s*[0-9.,%\s/deg]+\)|[a-z]{3,20})$/i;

/**
 * 색상값 검증. 통과하지 못하면 fallback 을 돌려준다.
 * `"` `<` `>` 등 속성 탈출 문자는 정규식에서 원천 배제된다.
 */
export function safeColor(value: string | undefined | null, fallback = "currentColor"): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 64) return fallback;
  return COLOR_RE.test(trimmed) ? trimmed : fallback;
}

/** 숫자 속성(width/height/좌표 등) — 유한수만 허용. */
export function safeNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** 임의 문자열을 XML 속성/텍스트에 넣을 때. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * `<script>` 태그 안에 JSON 을 넣을 때 (JSON-LD 등).
 *
 * JSON.stringify 는 `</script>` 를 이스케이프하지 않아서, 문자열 필드에
 * 그 시퀀스가 들어가면 스크립트 블록이 조기 종료되고 이후가 HTML 로 파싱된다.
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    // U+2028 LINE SEPARATOR / U+2029 PARAGRAPH SEPARATOR —
    // JSON 에서는 유효하지만 JS 소스에서는 개행으로 취급돼 파싱이 깨진다.
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
