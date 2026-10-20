import { GPUInitializationError } from "maplibre-gl";

/**
 * MapLibre `onError` / ErrorEvent 중 **진짜 WebGL(GPU) 초기화 실패**만 가린다.
 *
 * 스프라이트 이미지 누락, Max vertices, 타일 404 같은 스타일·데이터 오류는
 * 지도가 이미 떠 있거나 곧 뜰 수 있는데도 `error`로 흘러온다. 이걸 전부
 * 초기화 실패로 치면 WebGL 오버레이가 오탐한다.
 *
 * MapLibre v6+는 컨텍스트 생성 실패를 {@link GPUInitializationError}로 올린다.
 */
export function isFatalWebglMapError(payload: unknown): boolean {
  const err = unwrapMapError(payload);
  if (err instanceof GPUInitializationError) return true;
  // 번들 경계/복제 객체에서도 name으로 인식
  return Boolean(err && typeof err === "object" && (err as Error).name === "GPUInitializationError");
}

function unwrapMapError(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  if ("error" in payload) return (payload as { error: unknown }).error;
  return payload;
}
