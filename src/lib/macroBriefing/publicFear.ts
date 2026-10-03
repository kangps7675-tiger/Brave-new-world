/**
 * 대중 관심(불안·회담) 휴리스틱 — 「오늘 한눈에」순위용.
 * LLM 없음. 제목·요약 키워드만. 창작·판정 아님.
 *
 * 0 = 소프트(훈련만) · 1 = 기본 긴장 · 2 = 고관심 · 3 = 고공포·고외교 · 4 = 실존적
 * 외교·정상회담은 감쇠하지 않고 중요 축으로 올린다.
 */

import type { MacroGdeltInputEvent, MacroRssInputItem } from "./types";

/** 실존·대량살상·국가 간 전면전 신호 */
const FEAR_EXISTENTIAL =
  /\b(nuclear|tactical\s?nuke|warhead|dirty\s?bomb|wmd|chemical\s?weapon|biological\s?weapon|genocide|massacre|invasion|declare[sd]?\s?war|world\s?war|armageddon|extinction)\b|핵탄두|전술핵|핵전쟁|핵공격|핵무기|더티밤|대량살상|생화학|화학무기|학살|침공|선전포고|세계대전|방사능/i;

/** 민간 직격·도시 타격·봉쇄·시장 붕괴 */
const FEAR_HIGH =
  /\b(missile|airstrike|air[\s-]?raid|bomb(?:ing|ard)?|civilian\s?(?:dead|kill|casualt)|mass\s?casualt|evacuate|evacuation|blockade|hormuz|suez|malacca|taiwan\s?strait|red\s?sea|record\s?crash|black\s?swan|bank\s?run|sovereign\s?default|bankrupt)\b|미사일|공습|공습경보|폭격|민간인|사상자|대피령|대피|봉쇄|호르무즈|수에즈|말라카|대만해협|홍해|폭락|블랙스완|뱅크런|디폴트|파산/i;

/**
 * 정상회담·합의·주요 외교 — 공포와 동급으로 「오늘 한눈에」에 올린다.
 * (훈련·사열만 soft로 남김)
 */
const DIPLOMACY_HIGH =
  /\b(summit|peace\s?talks|bilateral|trilateral|multilateral|state\s?visit|ministerial|treaty|accord|peace\s?deal|joint\s?statement|communiqu[eé]|ceasefire\s?deal|normalization)\b|정상회담|평화회담|양자회담|다자회담|장관회담|국빈|정상회의|조약|협정|합의문|공동성명|양해각서|수교|정상화/i;

const DIPLOMACY_MED =
  /\b(diplomatic|diplomacy|negotiat|foreign\s?minister|talks?|deal\s?struck|hostage\s?release|de[\s-]?escalat)\b|외교|협상|회담|외무장관|인질\s?석방|긴장\s?완화|합의/i;

/** 확전·암살·항모·극초음속·에너지 쇼크 */
const FEAR_ELEVATED =
  /\b(escalat|hypersonic|assassinate|carrier\s?strike|offensive|drone\s?strike|explosion|shelling|kill(?:ed|ings)?|dead\b|plunge|sell[\s-]?off|default|embargo)\b|확전|극초음속|암살|항모|공세|드론\s?타격|폭발|포격|사망|급락|매도세|금수|제재\s?강화/i;

/** 훈련·사열만 — 볼륨이 Top을 밀지 않게 감쇠 */
const SOFT_EXERCISE =
  /\b(exercise|drill|maneuver|war\s?game|사열)\b|군사훈련|연합훈련|기동훈련|사열|모의전/i;

export type PublicFearLevel = 0 | 1 | 2 | 3 | 4;

export function scorePublicFearText(text: string): PublicFearLevel {
  const blob = text.trim();
  if (!blob) return 0;
  if (FEAR_EXISTENTIAL.test(blob)) return 4;
  if (FEAR_HIGH.test(blob) || DIPLOMACY_HIGH.test(blob)) return 3;
  if (FEAR_ELEVATED.test(blob) || DIPLOMACY_MED.test(blob)) return 2;
  if (SOFT_EXERCISE.test(blob)) return 0;
  return 1;
}

function rssFearBlob(item: MacroRssInputItem): string {
  return [item.title, item.titleKo, item.summary, item.bodyKo]
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .join(" · ");
}

export function scoreRssPublicFear(item: MacroRssInputItem): PublicFearLevel {
  return scorePublicFearText(rssFearBlob(item));
}

/** 버킷 RSS 관심도 — 최댓값 위주 */
export function bucketRssFear(items: MacroRssInputItem[]): {
  max: PublicFearLevel;
  avg: number;
} {
  if (items.length === 0) return { max: 0, avg: 0 };
  let max = 0;
  let sum = 0;
  for (const item of items) {
    const f = scoreRssPublicFear(item);
    if (f > max) max = f;
    sum += f;
  }
  return { max: max as PublicFearLevel, avg: sum / items.length };
}

/** GDELT만 있을 때 긴장·등급으로 대리 */
export function gdeltFearProxy(events24h: MacroGdeltInputEvent[]): PublicFearLevel {
  if (events24h.length === 0) return 0;
  let tensionSum = 0;
  let hasSA = false;
  for (const e of events24h) {
    tensionSum += e.tensionScore ?? 2;
    if (e.importanceGrade === "S" || e.importanceGrade === "A") hasSA = true;
    const titleFear = e.title ? scorePublicFearText(e.title) : 0;
    if (titleFear >= 3) return titleFear;
  }
  const avg = tensionSum / events24h.length;
  if (hasSA && avg >= 6) return 3;
  if (hasSA || avg >= 7) return 2;
  if (avg >= 4 || events24h.length >= 18) return 1;
  return 0;
}

/**
 * heat 배수. 실존·민간 직격·정상회담·합의가
 * 다매체 일상 긴장·훈련 볼륨을 이기게 한다.
 */
export function publicFearHeatMultiplier(maxFear: PublicFearLevel, avgFear: number): number {
  const avgNudge = Math.min(0.35, avgFear * 0.08);
  const curve = Math.pow(1.65, maxFear);
  if (maxFear <= 0) return 0.45;
  if (maxFear === 1) return 0.78 + avgNudge * 0.3;
  return curve * (0.85 + avgNudge);
}
