/**
 * WebGL 지원 감지 (P0-1).
 *
 * `maplibre-gl` v5는 **WebGL2를 요구**한다. WebGL2가 없으면 지도는 아예 렌더되지
 * 않는데, 지금까지 앱은 그 사실을 사용자에게 알리지 않고 검은 화면만 보여줬다.
 * (`GlobeLoadingScreen`도 `if (!gl) return;` 으로 조용히 빠져나갔다.)
 *
 * 이 모듈은 **부트 최초 1회**만 실제 컨텍스트를 만들어 보고 결과를 캐시한다.
 * 컨텍스트 생성은 비싸고, 만든 즉시 `WEBGL_lose_context`로 반납해야 GPU 메모리를
 * 붙잡지 않는다.
 */

export type WebglSupport =
  /** maplibre-gl v5 정상 동작 */
  | "webgl2"
  /** WebGL1만 — 로딩 셰이더는 되지만 지도는 불가 */
  | "webgl1"
  /** WebGL 자체 불가 (정책 차단·구형 브라우저·GPU 블랙리스트) */
  | "none";

let cached: WebglSupport | null = null;

/** 만든 컨텍스트를 즉시 반납 — GPU 메모리 점유 방지 */
export function releaseWebglContext(
  gl: WebGLRenderingContext | WebGL2RenderingContext | null,
) {
  if (!gl) return;
  try {
    const ext = gl.getExtension("WEBGL_lose_context");
    ext?.loseContext();
  } catch {
    /* 확장 미지원 브라우저 — 무시 */
  }
}

function probe(): WebglSupport {
  if (typeof document === "undefined") return "none";

  let canvas: HTMLCanvasElement;
  try {
    canvas = document.createElement("canvas");
  } catch {
    return "none";
  }

  // 실제 렌더가 아니라 생성 가능 여부만 본다 — 옵션은 최소로.
  const attrs: WebGLContextAttributes = {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    failIfMajorPerformanceCaveat: false,
  };

  try {
    const gl2 = canvas.getContext("webgl2", attrs) as WebGL2RenderingContext | null;
    if (gl2) {
      releaseWebglContext(gl2);
      return "webgl2";
    }
  } catch {
    /* fallthrough */
  }

  try {
    const gl1 = (canvas.getContext("webgl", attrs) ||
      canvas.getContext("experimental-webgl", attrs)) as WebGLRenderingContext | null;
    if (gl1) {
      releaseWebglContext(gl1);
      return "webgl1";
    }
  } catch {
    /* fallthrough */
  }

  return "none";
}

/** 캐시된 감지 결과. SSR에서는 항상 "none"이 아니라 낙관값을 쓰지 않도록 주의. */
export function detectWebglSupport(): WebglSupport {
  if (cached != null) return cached;
  cached = probe();
  return cached;
}

/** 지도(maplibre-gl v5) 렌더 가능 여부 */
export function canRenderMap(): boolean {
  return detectWebglSupport() === "webgl2";
}

/** 로딩 셰이더(WebGL1) 렌더 가능 여부 */
export function canRenderLoadingShader(): boolean {
  const s = detectWebglSupport();
  return s === "webgl2" || s === "webgl1";
}

/** 테스트 전용 — 캐시 초기화 */
export function __resetWebglSupportCache() {
  cached = null;
}
