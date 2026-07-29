"use client";

import { useMemo } from "react";
import { trustChipLabel, type TrustLang } from "@/data/newsTrustTiers";
import type { LabelLanguage, LayerPrefs } from "@/lib/layerPrefs";
import { activeSourceCredits } from "@/lib/layerAttribution";

type MapAttributionBarProps = {
  lang: LabelLanguage;
  /** 현재 레이어 on/off 상태 — 켜진 레이어의 출처만 노출 */
  layerPrefs: LayerPrefs | null;
  /** 클릭 시 전체 자료출처·방법론 패널 열기 */
  onOpenSources: () => void;
  /** 클릭 시 뉴스·OSINT 신뢰도 등급 패널 열기 — 메뉴 밖(지구본)에 상시 노출 */
  onOpenTrust?: () => void;
  className?: string;
};

/** 상시 노출 바가 길어지지 않도록 최대 표시 개수 */
const MAX_SHOWN = 6;

function toTrustLang(lang: LabelLanguage): TrustLang {
  return lang === "en" ? "en" : "ko";
}

/**
 * 지도 좌하단 상시 노출 출처 크레딧 (데스크톱·태블릿 = 지구본 뷰 전용).
 * 베이스맵 저작자 표시(OSM/OpenFreeMap)는 라이선스상 항상 노출하고,
 * 그 뒤에 "현재 켜진 레이어"의 출처만 자동으로 이어 붙인다(레이어를 끄면 사라짐).
 * 신뢰도·자료출처는 유틸 메뉴가 아니라 이 바에서 연다.
 * ISW 등 개별 레이어 출처는 각 레이어 카드에도 직접 표기(정책상 "자료와 함께 명확히").
 */
export function MapAttributionBar({
  lang,
  layerPrefs,
  onOpenSources,
  onOpenTrust,
  className = "",
}: MapAttributionBarProps) {
  const en = lang === "en";
  const credits = useMemo(() => activeSourceCredits(layerPrefs), [layerPrefs]);
  const shown = credits.slice(0, MAX_SHOWN);
  const extra = credits.length - shown.length;
  const trustLabel = trustChipLabel(toTrustLang(lang));

  return (
    <div
      className={`map-attribution-bar pointer-events-auto absolute bottom-2 left-2 z-30 flex max-w-[94vw] flex-wrap items-center gap-1.5 overflow-hidden rounded-md border border-white/10 bg-[#04070f]/75 px-2 py-1 text-micro leading-none text-slate-400 backdrop-blur-sm ${className}`}
    >
      {/* 베이스맵 — 라이선스상 상시 노출 */}
      <span aria-hidden className="text-slate-500">
        ©
      </span>
      <a
        href="https://openfreemap.org/"
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 transition hover:text-slate-200"
      >
        OpenFreeMap
      </a>
      <span aria-hidden className="text-slate-600">
        ·
      </span>
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 transition hover:text-slate-200"
      >
        OSM
      </a>

      {/* 켜진 레이어 출처 */}
      {shown.length > 0 ? (
        <>
          <span aria-hidden className="text-slate-600">
            |
          </span>
          <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
            {shown.map((c, i) => (
              <span key={c.label} className="flex shrink-0 items-center gap-1.5">
                {i > 0 ? (
                  <span aria-hidden className="text-slate-600">
                    ·
                  </span>
                ) : null}
                {c.url ? (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whitespace-nowrap transition hover:text-slate-200"
                  >
                    {c.label}
                  </a>
                ) : (
                  <span className="whitespace-nowrap">{c.label}</span>
                )}
              </span>
            ))}
            {extra > 0 ? (
              <span className="shrink-0 text-slate-500">+{extra}</span>
            ) : null}
          </div>
        </>
      ) : null}

      <span aria-hidden className="mx-0.5 shrink-0 text-slate-600">
        |
      </span>
      {onOpenTrust ? (
        <>
          <button
            type="button"
            onClick={onOpenTrust}
            className="shrink-0 font-medium text-amber-200/85 transition hover:text-amber-100"
          >
            {trustLabel} ▸
          </button>
          <span aria-hidden className="text-slate-600">
            ·
          </span>
        </>
      ) : null}
      <button
        type="button"
        onClick={onOpenSources}
        className="shrink-0 font-medium text-sky-300/85 transition hover:text-sky-200"
      >
        {en ? "Data sources ▸" : "데이터 출처 ▸"}
      </button>
    </div>
  );
}
