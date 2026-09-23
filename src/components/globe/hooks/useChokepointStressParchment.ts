"use client";

import { useEffect, useRef } from "react";
import { LOGISTICS_RISK_POINTS } from "@/data/logisticsRiskPoints";
import {
  buildChokepointStressBriefing,
  type ChokepointStressBriefing,
} from "@/lib/chokepointStressBriefing";
import {
  stressForChokepoint,
  type ChokepointAisObservation,
  type ChokepointAssetVolatility,
} from "@/lib/chokepointStressForUi";
import { shouldOfferChokepointStressParchment } from "@/lib/logisticsStress";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { UkmtoIncidentPoint } from "@/lib/ukmtoHatch";

type UseChokepointStressParchmentOptions = {
  paused: boolean;
  lang: LabelLanguage;
  ukmtoIncidents: UkmtoIncidentPoint[];
  aisByChokeId?: Record<string, ChokepointAisObservation>;
  assetByChokeId?: Record<string, ChokepointAssetVolatility>;
  /** 상위 양피지(공습·속보 등)가 열려 있으면 새 오퍼를 막음 */
  blockedByOtherBriefing?: boolean;
  onOffer: (briefing: ChokepointStressBriefing) => void;
};

type LampNewsPayload = {
  featuredNews?: Array<{ title?: string; headline?: string }>;
};

function zoneKeywords(name: string, nameEn?: string): string[] {
  const bits = [name, nameEn]
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .flatMap((s) => s.split(/[\s·,/()-]+/))
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length >= 3);
  return [...new Set(bits)];
}

async function fetchHeadlineSnippets(
  lang: LabelLanguage,
  keywords: string[],
): Promise<string[]> {
  if (keywords.length === 0) return [];
  try {
    const res = await fetch(`/api/lamp-news?mode=economy&lang=${lang === "en" ? "en" : "ko"}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as LampNewsPayload;
    const titles = (data.featuredNews ?? [])
      .map((n) => (n.title || n.headline || "").trim())
      .filter(Boolean);
    const matched = titles.filter((t) => {
      const lower = t.toLowerCase();
      return keywords.some((k) => lower.includes(k));
    });
    return (matched.length > 0 ? matched : titles).slice(0, 2);
  } catch {
    return [];
  }
}

/**
 * 병목 통항 급변 / A급 elevated 신규 진입 시 양피지 오퍼.
 * 사이렌 훅과 독립 — 통항(B) 중심, 선물 그래프는 슬롯만.
 */
export function useChokepointStressParchment({
  paused,
  lang,
  ukmtoIncidents,
  aisByChokeId = {},
  assetByChokeId = {},
  blockedByOtherBriefing = false,
  onOffer,
}: UseChokepointStressParchmentOptions) {
  const seenRef = useRef<Set<string> | null>(null);
  const busyRef = useRef(false);
  const onOfferRef = useRef(onOffer);
  onOfferRef.current = onOffer;
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => {
    if (paused || blockedByOtherBriefing || busyRef.current) return;

    const candidates = LOGISTICS_RISK_POINTS.map((p) => {
      const ais = aisByChokeId[p.id] ?? null;
      const asset = assetByChokeId[p.id] ?? null;
      const stress = stressForChokepoint(p, ukmtoIncidents, ais, asset);
      return { point: p, ais, asset, stress };
    }).filter(({ stress, ais }) => shouldOfferChokepointStressParchment(stress, ais ?? undefined));

    if (seenRef.current === null) {
      seenRef.current = new Set(
        candidates.map(({ point, ais, stress }) =>
          `${point.id}:${ais?.changePct ?? "na"}:${stress.level}`,
        ),
      );
      return;
    }

    const next = candidates.find(({ point, ais, stress }) => {
      const key = `${point.id}:${ais?.changePct ?? "na"}:${stress.level}`;
      return !seenRef.current!.has(key);
    });
    if (!next) return;

    const offerKey = `${next.point.id}:${next.ais?.changePct ?? "na"}:${next.stress.level}`;
    seenRef.current.add(offerKey);
    busyRef.current = true;

    const nameEn =
      typeof next.point.meta?.nameEn === "string" ? next.point.meta.nameEn : undefined;
    const keywords = zoneKeywords(next.point.name, nameEn);

    void (async () => {
      const headlines = await fetchHeadlineSnippets(langRef.current, keywords);
      const briefing = buildChokepointStressBriefing({
        point: next.point,
        stress: next.stress,
        aisObservation: next.ais,
        assetVolatility: next.asset,
        lang: langRef.current,
        headlineSnippets: headlines,
      });
      busyRef.current = false;
      if (briefing) onOfferRef.current(briefing);
    })();
  }, [
    paused,
    blockedByOtherBriefing,
    ukmtoIncidents,
    aisByChokeId,
    assetByChokeId,
  ]);
}
