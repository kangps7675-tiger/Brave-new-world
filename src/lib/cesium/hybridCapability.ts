/**
 * Cesium underlay는 MapLibre와 WebGL 컨텍스트를 **두 개** 씁니다.
 * UHD 620 / 저 RAM 노트북에서는 바탕(인텔·지형)이 사라지고 오버레이만
 * 남는 패턴이 흔합니다 — 하드웨어가 약하면 하이브리드를 아예 올리지 않습니다.
 */

/** 통합·소프트웨어 GPU — Cesium 월드 지형·이매저리와 병행하기 버거움 */
const WEAK_GPU_RE =
  /swiftshader|llvmpipe|softpipe|microsoft basic render|apple software|ANGLE \(Microsoft|intel\s*\(?r\)?\s*(hd|uhd)\s*graphics\s*(4\d{2}|5\d{2}|6[0-3]\d)|intel\s*\(?r\)?\s*hd\s*graphics\s*P?[45]\d{2}|radeon\s*(r[45]|vega\s*[23])\b|mali-[234]|adreno\s*\(?[234]\d{2}\)?|powervr/i;

export function isWeakGpuRenderer(renderer: string): boolean {
  const s = renderer.trim();
  if (!s) return false;
  return WEAK_GPU_RE.test(s);
}

function releaseGl(gl: WebGLRenderingContext | WebGL2RenderingContext | null) {
  if (!gl) return;
  try {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    /* ignore */
  }
}

/** UNMASKED_RENDERER — 실패 시 null (확장 차단·SSR) */
export function probeGpuRenderer(): string | null {
  if (typeof document === "undefined") return null;
  let canvas: HTMLCanvasElement;
  try {
    canvas = document.createElement("canvas");
  } catch {
    return null;
  }
  const attrs: WebGLContextAttributes = {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    failIfMajorPerformanceCaveat: false,
  };
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  try {
    gl =
      (canvas.getContext("webgl2", attrs) as WebGL2RenderingContext | null) ||
      (canvas.getContext("webgl", attrs) as WebGLRenderingContext | null);
    if (!gl) return null;
    const ext = gl.getExtension("WEBGL_debug_renderer_info") as {
      UNMASKED_RENDERER_WEBGL: number;
    } | null;
    if (!ext) return null;
    const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
    return typeof renderer === "string" ? renderer : null;
  } catch {
    return null;
  } finally {
    releaseGl(gl);
  }
}

export type CesiumHybridHardwareInput = {
  ultraLite?: boolean;
  /** navigator.deviceMemory (GiB) */
  deviceMemoryGb?: number | null;
  hardwareConcurrency?: number | null;
  gpuRenderer?: string | null;
};

/**
 * Cesium 하이브리드를 올릴 만한지 (동기·부수효과 최소).
 * ultraLite / 저코어 / 저RAM+약체 GPU / 소프트웨어 GL → false
 */
export function isCesiumHybridHardwareOk(
  input: CesiumHybridHardwareInput = {},
): boolean {
  if (input.ultraLite) return false;

  const cores =
    input.hardwareConcurrency ??
    (typeof navigator !== "undefined" ? navigator.hardwareConcurrency : null);
  if (typeof cores === "number" && cores > 0 && cores <= 2) return false;

  const mem =
    input.deviceMemoryGb ??
    (typeof navigator !== "undefined"
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
      : null);
  const renderer =
    input.gpuRenderer !== undefined ? input.gpuRenderer : probeGpuRenderer();

  if (typeof mem === "number" && mem > 0 && mem <= 4) return false;

  if (renderer && isWeakGpuRenderer(renderer)) return false;

  // 8GB 이하면서 렌더러 문자열을 못 읽으면(프라이버시) 보수적으로 OFF
  if (typeof mem === "number" && mem > 0 && mem <= 8 && !renderer) return false;

  return true;
}
