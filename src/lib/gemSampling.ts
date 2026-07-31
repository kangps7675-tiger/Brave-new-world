/**
 * GEM 표본 공개 — "이건 전수가 아니라 표본입니다"를 화면에 밝힌다.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  왜 필요한가
 * ══════════════════════════════════════════════════════════════════════
 *
 * GEM 레이어는 성능 상한(cap) 때문에 **지리 층화 추출된 표본**이다.
 * 레코드 수를 세어보면 캡 값과 정확히 일치한다 — 전부 잘렸다는 뜻이다.
 *
 * 문제는 **사용자가 이걸 전수로 읽는다**는 것이다.
 * 지경학에서 "인도네시아 석탄발전소 20개"라고 보면 정책 판단이 달라진다 —
 * 실제로는 그보다 훨씬 많은데 캡에 잘린 것이다.
 *
 * B2B 실사에서 **반드시 묻는 항목**이기도 하다.
 * "이 숫자가 전수입니까?"에 답할 수 있어야 한다.
 *
 * ── 공정하게 평가할 점 ────────────────────────────────────────────
 *
 * `capArrayGeographic()` 은 단순 slice 가 아니라 지리 버킷 라운드로빈이고,
 * 상태 랭크(operating > construction > proposed) → 용량 순으로 정렬한 뒤 뽑는다.
 * 실제 분포를 세보면 중국 비중이 현실과 부합한다 — 우려했던 소국 과대표집은
 * 일어나지 않았다. **설계는 잘 됐다. 표기가 없었을 뿐이다.**
 */

export type GemLayerSampling = {
  file: string;
  /** 캡 적용 전 유효 레코드 수 */
  total: number;
  /** 실제로 실린 수 */
  shipped: number;
  truncated: boolean;
  sampling: "geo-stratified" | "complete";
  rank: string;
};

export type GemSamplingManifest = {
  generatedAt: string;
  profile: "lite" | "full";
  note: string;
  layers: Record<string, GemLayerSampling>;
};

/**
 * 표본 배지 문구.
 *
 * @returns 전수면 `null` — 굳이 "전수입니다"를 붙여 화면을 어지럽히지 않는다
 */
export function samplingBadge(
  info: GemLayerSampling | undefined,
  lang: "ko" | "en" = "ko",
): string | null {
  if (!info || !info.truncated) return null;
  const pct = info.total > 0 ? Math.round((info.shipped / info.total) * 100) : 0;
  return lang === "ko"
    ? `표본 ${info.shipped.toLocaleString()}/${info.total.toLocaleString()} (${pct}%)`
    : `sample ${info.shipped.toLocaleString()}/${info.total.toLocaleString()} (${pct}%)`;
}

/** 배지 호버 설명 — 어떻게 뽑았는지 밝힌다 */
export function samplingHint(
  info: GemLayerSampling | undefined,
  lang: "ko" | "en" = "ko",
): string | null {
  if (!info || !info.truncated) return null;
  return lang === "ko"
    ? "성능 상한 때문에 지리 층화 추출된 표본입니다. " +
        "가동 상태(가동 > 건설 > 계획) → 설비용량 순으로 정렬한 뒤 지역별로 고르게 뽑습니다. " +
        "전수가 아닙니다."
    : "A geo-stratified sample capped for performance. Sorted by operating status " +
        "(operating > construction > proposed) then capacity, then drawn evenly across regions. " +
        "This is not a census.";
}

/**
 * 레이어 상세 문구에 표본 표기를 덧붙인다.
 * 표본이 아니면 원래 문구를 그대로 돌려준다.
 */
export function withSamplingNote(
  detail: string,
  info: GemLayerSampling | undefined,
  lang: "ko" | "en" = "ko",
): string {
  const badge = samplingBadge(info, lang);
  return badge ? `${detail} · ${badge}` : detail;
}

/** `kind`(gem-coal-plant 등) → 매니페스트 조회 */
export function lookupSampling(
  manifest: GemSamplingManifest | null | undefined,
  kind: string,
): GemLayerSampling | undefined {
  return manifest?.layers?.[kind];
}

/**
 * 매니페스트가 없을 때의 안전 기본값.
 *
 * ⚠️ 없다고 "전수"라고 말하면 안 된다. `undefined` 를 돌려주면
 *    `samplingBadge` 가 `null` 을 내서 아무 주장도 하지 않는다.
 *    빌드에서 `gem-sampling-manifest.json` 이 생성되지 않았다는 뜻이므로
 *    `npm run gem:trackers:all` 을 다시 돌려야 한다.
 */
export const GEM_SAMPLING_MISSING_NOTE_KO =
  "표본 정보 없음 — gem-sampling-manifest.json 이 없습니다 (npm run gem:trackers:all)";
