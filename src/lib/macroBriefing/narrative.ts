/**
 * 거시 브리핑 단계 문장 — LLM 발명 금지.
 * RSS 헤드라인·전장 라벨·밀도 수치만 사용.
 */

import type { LabelLanguage } from "@/lib/layerPrefs";
import { josa } from "@/lib/koreanJosa";
import { densityLabel } from "./heat";
import { macroThemeTitle } from "./themes";
import type {
  MacroDensityBadge,
  MacroDomain,
  MacroRssInputItem,
  MacroThemeId,
  MacroTrustBadge,
} from "./types";

function truncate(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** KO: titleKo || title · EN: 원문 title만 */
export function macroRssDisplayTitle(
  item: Pick<MacroRssInputItem, "title" | "titleKo">,
  lang: LabelLanguage,
): string {
  if (lang === "en") return item.title;
  return item.titleKo?.trim() || item.title;
}

export function trustBadgeLabel(badge: MacroTrustBadge, lang: LabelLanguage): string {
  if (lang === "en") {
    if (badge === "high-confidence") return "High confidence";
    if (badge === "corroborated") return "Corroborated";
    return "Single source";
  }
  if (badge === "high-confidence") return "높은 신뢰";
  if (badge === "corroborated") return "교차 보도";
  return "단일 소스";
}

/** 오늘 촉매 — 대중 불안·공포가 가장 큰 RSS 한 건 */
export function catalystStepBody(
  item: MacroRssInputItem,
  themeId: MacroThemeId,
  lang: LabelLanguage,
): string {
  const place = macroThemeTitle(themeId, lang);
  const title = truncate(macroRssDisplayTitle(item, lang), 110);
  if (lang === "en") {
    return `What stands out as most alarming in ${place}: “${title}” (${item.source}). Headline cluster — not a finished judgment.`;
  }
  return `${josa(place, "은/는")} 지금 가장 불안하게 읽히는 보도로 “${title}”(${item.source})가 잡혔습니다. 헤드라인 묶음이며 확정 판정이 아닙니다.`;
}

/** RSS 교차 클러스터 단계 */
export function rssClusterStepBody(params: {
  themeId: MacroThemeId;
  independentSources: number;
  sampleTitle: string;
  trust: MacroTrustBadge;
  lang: LabelLanguage;
}): string {
  const place = macroThemeTitle(params.themeId, params.lang);
  const title = truncate(params.sampleTitle, 90);
  const trust = trustBadgeLabel(params.trust, params.lang);
  if (params.lang === "en") {
    return `Around ${place}, ${params.independentSources} independent outlets overlap on reports like “${title}”. Media check: ${trust}.`;
  }
  return `${josa(place, "을/를")} 중심으로 독립 매체 ${params.independentSources}곳이 “${title}” 계열 보도를 겹쳐 올렸습니다. 매체 확인: ${trust}.`;
}

/** GDELT 밀도만 — CAMEO로 스토리 창작 금지 */
export function gdeltDensityStepBody(params: {
  themeId: MacroThemeId;
  count: number;
  density: MacroDensityBadge;
  lang: LabelLanguage;
  hasRss: boolean;
}): string {
  const place = macroThemeTitle(params.themeId, params.lang);
  const dens = densityLabel(params.density, params.lang);
  if (params.lang === "en") {
    if (params.hasRss) {
      return `GDELT shows ${params.count} geo-coded events near ${place} in 24h (${dens}). Density is a map signal, not a verified narrative.`;
    }
    return `Event density near ${place} jumped (${params.count} GDELT points / 24h · ${dens}). Related outlet headlines are sparse — treat this as a map heat signal, not a finished story.`;
  }
  if (params.hasRss) {
    return `${josa(place, "은/는")} 근처에서 24시간 GDELT 포인트 ${params.count}건이 잡혔습니다(${dens}). 밀도는 지도 신호이며 교차 확인된 서사가 아닙니다.`;
  }
  return `${josa(place, "은/는")} 근처 이벤트 밀도가 올랐습니다(GDELT ${params.count}건 / 24시간 · ${dens}). 관련 매체 헤드라인이 드물어, 완성된 이야기로 읽지 말고 지도 열기로만 보세요.`;
}

export function topicLeadTitle(
  themeId: MacroThemeId,
  domain: MacroDomain,
  lang: LabelLanguage,
  catalystTitle: string | null,
): string {
  const place = macroThemeTitle(themeId, lang);
  if (catalystTitle) {
    return truncate(catalystTitle, 72);
  }
  if (lang === "en") {
    return domain === "econ"
      ? `${place}: rising geo-economic pressure`
      : `${place}: rising event density`;
  }
  return domain === "econ"
    ? `${place}: 지경학 압력 상승`
    : `${place}: 이벤트 밀도 상승`;
}
