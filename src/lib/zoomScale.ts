/**
 * 마커/라벨 화면 배율.
 * altitude ≥ 0.2: 항상 1로 고정 (줌아웃해도 altitude=0.2 크기 유지)
 * altitude < 0.2: 줌인할수록 LOD로 축소
 */
export function getZoomOutScale(altitude: number): number {
  const a = Number.isFinite(altitude) ? altitude : 0.2;
  if (a >= 0.2) return 1;

  if (a <= 0.04) return 0.04;
  if (a <= 0.08) return 0.04 + ((a - 0.04) / 0.04) * 0.1; // → 0.14
  if (a <= 0.12) return 0.14 + ((a - 0.08) / 0.04) * 0.22; // → 0.36
  // 0.12 → 0.2
  return 0.36 + ((a - 0.12) / 0.08) * 0.64;
}

/**
 * LOD 표시 단계용 고도.
 * altitude ≥ 0.2 → 0.2로 고정 (주요도시 단계)
 * altitude < 0.2 → 실제 줌 (중소도시 → 마을)
 */
export function getLodEffectiveAltitude(altitude: number): number {
  const a = Number.isFinite(altitude) ? altitude : 0.2;
  return Math.min(a, 0.2);
}
