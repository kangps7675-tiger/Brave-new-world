/**
 * 속보·사건 좌표로 갈 때 송유·가스·해저관을 잠깐 켠다.
 * 지경학을 상시 배관으로 더럽히지 않고, “여기 인프라가 위험”만 보여 준다.
 */

import type { LayerPrefs } from "@/lib/layerPrefs";

export const PIPELINE_REVEAL_MS = 45_000;

export type PipelineRevealSnap = Pick<
  LayerPrefs,
  "showOilPipelines" | "showGasPipelines" | "showSubseaPipelines"
>;

/** 배관 레이어를 켠 패치 */
export const PIPELINE_REVEAL_ON: PipelineRevealSnap = {
  showOilPipelines: true,
  showGasPipelines: true,
  showSubseaPipelines: true,
};

/** 에너지 배관이 사건과 잘 맞는 전장·키워드 */
const ENERGY_THEATER_RE =
  /middle.?east|ukraine|russia|red.?sea|persian|gulf|hormuz|yemen|israel|syria|iraq|iran|caucasus|black.?sea|europe/i;

const ENERGY_TEXT_RE =
  /\b(pipeline|oil|gas|lng|refiner|tanker|energy|fuel|petro|nord\s?stream|druzhba|btc\b|cpc\b)\b|송유|가스관|파이프|원유|정유|LNG|에너지|유조선|노르드스트림|드루즈바/i;

export function incidentSuggestsEnergyPipelines(input: {
  theater?: string | null;
  title?: string | null;
  body?: string | null;
}): boolean {
  const theater = (input.theater ?? "").trim();
  if (theater && ENERGY_THEATER_RE.test(theater)) return true;
  const text = `${input.title ?? ""} ${input.body ?? ""}`;
  return ENERGY_TEXT_RE.test(text);
}

/** 열기 전 스냅에서 “원래 꺼져 있던” 키만 복원용 패치 */
export function pipelineRevealRestorePatch(
  snap: PipelineRevealSnap | null | undefined,
): Partial<LayerPrefs> {
  if (!snap) return {};
  const out: Partial<LayerPrefs> = {};
  if (snap.showOilPipelines === false) out.showOilPipelines = false;
  if (snap.showGasPipelines === false) out.showGasPipelines = false;
  if (snap.showSubseaPipelines === false) out.showSubseaPipelines = false;
  return out;
}

export function snapshotPipelinePrefs(prefs: LayerPrefs): PipelineRevealSnap {
  return {
    showOilPipelines: prefs.showOilPipelines,
    showGasPipelines: prefs.showGasPipelines,
    showSubseaPipelines: prefs.showSubseaPipelines,
  };
}
