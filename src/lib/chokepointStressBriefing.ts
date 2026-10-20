/**
 * 병목(초크포인트) 통항 이상 → 양피지 브리핑.
 * 선물 등가 연동 전: 그래프 슬롯은 자리만 두고, 인사이트는 시나리오 톤(단정 금지).
 */

import type { StaticPoint } from "@/data/geoTypes";
import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  chokepointTransitParchmentDirection,
  stressDisclaimer,
  stressLevelLabel,
  type ChokepointStress,
  type ChokepointTransitDirection,
} from "@/lib/logisticsStress";
import type { ChokepointAisObservation } from "@/lib/chokepointStressForUi";
import type { ChokepointAssetVolatility } from "@/lib/chokepointStressForUi";
import { josa } from "@/lib/koreanJosa";

export type ChokepointStressBriefing = {
  id: string;
  chokepointId: string;
  title: string;
  paragraphs: string[];
  lat: number;
  lng: number;
  direction: ChokepointTransitDirection | "elevated";
  /** 연동 예정 자산 라벨 (그래프 슬롯 헤더) */
  assetSlotLabel: string;
  /** 관측 통항 % — 스파크라인 자리 표시용 */
  transitChangePct: number | null;
  /** RSS/헤드라인에서 고른 짧은 인용 (없으면 null) */
  headlineSnippets: string[];
  insightTone: "tighten" | "ease" | "watch";
  /** 병목 통항 vs 우크라·러 에너지 인프라 타격 */
  kind?: "chokepoint" | "energy-infra";
};

function zoneName(point: StaticPoint, lang: LabelLanguage): string {
  if (lang === "en") {
    const en = point.meta?.nameEn;
    return typeof en === "string" && en.trim() ? en : point.name;
  }
  return point.name;
}

function relatedAssets(point: StaticPoint): string {
  const raw = point.meta?.relatedTickers;
  return typeof raw === "string" && raw.trim() ? raw.trim() : "Brent · Shipping · VIX";
}

export function insightToneForDirection(
  direction: ChokepointTransitDirection | "elevated",
): ChokepointStressBriefing["insightTone"] {
  if (direction === "blocked" || direction === "elevated") return "tighten";
  if (direction === "clearing") return "ease";
  return "watch";
}

/**
 * 규칙 기반 시나리오 문장 — 예측 확정이 아니라 관측 브리핑.
 */
export function buildInsightParagraph(
  lang: LabelLanguage,
  tone: ChokepointStressBriefing["insightTone"],
  headlines: string[],
): string {
  const en = lang === "en";
  const headBit =
    headlines.length > 0
      ? en
        ? ` Related headlines mention: ${headlines.slice(0, 2).join("; ")}.`
        : ` 관련 헤드라인에는 ${headlines.slice(0, 2).join("; ")} 등의 표현이 있습니다.`
      : "";

  if (tone === "tighten") {
    return en
      ? `Scenario tone: further tightness is possible if transit stays suppressed or incidents recur.${headBit} This is not a price forecast.`
      : `시나리오 톤: 통항이 계속 줄거나 사건이 이어지면 추가 타이트 가능성이 있습니다.${headBit} 가격 예측이 아닙니다.`;
  }
  if (tone === "ease") {
    return en
      ? `Scenario tone: easing transit can be temporary noise after a squeeze.${headBit} Do not treat a rebound as a confirmed clear.`
      : `시나리오 톤: 통항 회복은 압박 뒤의 일시 노이즈일 수 있습니다.${headBit} 회복을 완전 해소로 단정하지 마십시오.`;
  }
  return en
    ? `Scenario tone: watch only — observation is mixed.${headBit} Judgement is deferred.`
    : `시나리오 톤: 판단 보류 — 관측이 혼재합니다.${headBit} 단정하지 않습니다.`;
}

export function buildChokepointStressBriefing(params: {
  point: StaticPoint;
  stress: ChokepointStress;
  aisObservation: ChokepointAisObservation;
  assetVolatility?: ChokepointAssetVolatility;
  lang: LabelLanguage;
  headlineSnippets?: string[];
}): ChokepointStressBriefing | null {
  const { point, stress, aisObservation, assetVolatility, lang } = params;
  const en = lang === "en";
  const transitDir = chokepointTransitParchmentDirection(aisObservation ?? undefined);
  let direction: ChokepointTransitDirection | "elevated" | null = transitDir;
  if (!direction && stress.graded && stress.level === "elevated") {
    direction = "elevated";
  }
  if (!direction) return null;

  const name = zoneName(point, lang);
  const assets = relatedAssets(point);
  const pct =
    aisObservation && Number.isFinite(aisObservation.changePct)
      ? aisObservation.changePct
      : null;
  const headlines = (params.headlineSnippets ?? []).filter(Boolean).slice(0, 3);
  const tone = insightToneForDirection(direction);

  const title = en
    ? direction === "clearing"
      ? `Chokepoint · ${name} · transit easing`
      : direction === "blocked"
        ? `Chokepoint · ${name} · transit squeeze`
        : `Chokepoint · ${name} · elevated risk`
    : direction === "clearing"
      ? `병목 · ${name} · 통항 회복 조짐`
      : direction === "blocked"
        ? `병목 · ${name} · 통항 압박`
        : `병목 · ${name} · 위험 높음`;

  const paragraphs: string[] = [];

  if (en) {
    paragraphs.push(
      pct != null
        ? `${name} shows vessel-transit change of ${pct >= 0 ? "+" : ""}${pct.toFixed(0)}% on PortWatch/AIS observation. Stress grade: ${stressLevelLabel(stress.level, "en")}${stress.graded ? "" : " (not A-grade confirmed)"}.`
        : `${name} reached an elevated logistics stress reading. Grade: ${stressLevelLabel(stress.level, "en")}.`,
    );
    for (const s of stress.signals.slice(0, 3)) {
      paragraphs.push(`${s.labelEn} — ${s.sourceEn}.`);
    }
    if (assetVolatility && assetVolatility.hint !== "normal") {
      paragraphs.push(
        `Linked asset proxy ${assetVolatility.assetLabel} looks ${assetVolatility.hint}. Futures chart slot below is reserved until full equivalence wiring ships.`,
      );
    } else {
      paragraphs.push(
        `Related assets to watch: ${assets}. The chart slot below stays empty until futures equivalence is wired.`,
      );
    }
    paragraphs.push(buildInsightParagraph(lang, tone, headlines));
    paragraphs.push(stressDisclaimer(lang));
  } else {
    paragraphs.push(
      pct != null
        ? `${josa(name, "은/는")} 선박 통항 관측치가 ${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%로 잡혔습니다. 스트레스 등급은 ${stressLevelLabel(stress.level, "ko")}${stress.graded ? "" : "(A급 미확정)"}입니다.`
        : `${josa(name, "은/는")} 물류 스트레스가 높은 쪽으로 잡혔습니다. 등급은 ${stressLevelLabel(stress.level, "ko")}입니다.`,
    );
    for (const s of stress.signals.slice(0, 3)) {
      paragraphs.push(`${s.labelKo} — ${s.sourceKo}입니다.`);
    }
    if (assetVolatility && assetVolatility.hint !== "normal") {
      paragraphs.push(
        `연동 후보 자산 ${assetVolatility.assetLabel}의 변동성 힌트는 ${assetVolatility.hint === "high" ? "높음" : "다소 높음"}입니다. 아래 그래프 칸은 선물 등가 연동 전까지 자리만 비워 둡니다.`,
      );
    } else {
      paragraphs.push(
        `함께 볼 자산 후보는 ${assets}입니다. 아래 그래프 칸은 선물 등가 연동 전까지 자리만 비워 둡니다.`,
      );
    }
    paragraphs.push(buildInsightParagraph(lang, tone, headlines));
    paragraphs.push(stressDisclaimer(lang));
  }

  return {
    id: `${point.id}:${direction}:${pct ?? "na"}:${stress.latestObservedAt ?? "now"}`,
    chokepointId: point.id,
    title,
    paragraphs,
    lat: point.lat,
    lng: point.lng,
    direction,
    assetSlotLabel: assets.split("·")[0]?.trim() || "Brent",
    transitChangePct: pct,
    headlineSnippets: headlines,
    insightTone: tone,
    kind: "chokepoint",
  };
}
