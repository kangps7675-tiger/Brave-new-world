"use client";

import { OfficialDocCard } from "@/components/globe/OfficialDocCard";
import { SipriArmsRecord } from "@/components/globe/SipriArmsRecord";
import { AnalysisSection } from "@/components/globe/AnalysisSection";
import { PolledDocsSection } from "@/components/globe/PolledDocsSection";
import { OFFICIAL_DOCS } from "@/data/officialDocs";
import { useAnalysisItems } from "@/hooks/useAnalysisItems";
import { usePolledOfficialDocs } from "@/hooks/usePolledOfficialDocs";
import { analysisForFlash } from "@/lib/analysis/match";
import { articlesForFlash, docsForFlash } from "@/lib/officialDocs/match";
import { polledDocsForFlash } from "@/lib/officialDocs/matchPolled";
import { useAutoMissileRanges } from "@/hooks/useAutoMissileRanges";
import { impactClaimsOf } from "@/lib/missileRangeAuto";
import { compareFlight, flightFiguresOf, formatRangeKm, missileRangeForText } from "@/lib/missileRange";
import type { NewsStreamItem } from "@/lib/news/types";

type Props = {
  en: boolean;
  /** 속보의 제목·본문 */
  text: string;
  at: number;
  ownUrl?: string;
  newsPool: readonly NewsStreamItem[];
};

/** 속보의 근거 문서(공식 원문)와 같은 사건을 다룬 언론 기사. 둘 다 없으면 아무것도 그리지 않는다. */
export function FlashEvidence({ en, text, at, ownUrl, newsPool }: Props) {
  const docs = docsForFlash(text, OFFICIAL_DOCS);
  const articles = articlesForFlash(text, at, newsPool, ownUrl);
  const autoRanges = useAutoMissileRanges();
  const missile = missileRangeForText(text, autoRanges);
  const impact = missile ? impactClaimsOf(text) : [];
  const figures = flightFiguresOf(text);
  const cmp = missile ? compareFlight(missile.spec, figures) : null;
  const analysisItems = useAnalysisItems();
  const analysisMatches = analysisForFlash(text, at, analysisItems);
  const polled = usePolledOfficialDocs();
  const polledMatches = polledDocsForFlash(text, at, polled, { excludeUrls: new Set(docs.map((d) => d.sourceUrl)) });

  return (
    <div className="space-y-2 empty:hidden" data-flash-evidence>
      <SipriArmsRecord text={text} en={en} />
      {docs.length > 0 ? (
        <section>
          <p className="px-0.5 text-micro font-semibold text-[#5c4020]">{en ? "Source documents" : "근거 문서"}</p>
          <ul className="mt-1 grid gap-1.5">
            {docs.map((doc) => (
              <OfficialDocCard key={doc.id} doc={doc} en={en} />
            ))}
          </ul>
        </section>
      ) : null}
      {missile ? (
        <section data-missile-range>
          <p className="px-0.5 text-micro font-semibold text-[#5c4020]">{missile.spec.auto ? (en ? "Missile range (auto-extracted from news · not reviewed)" : "미사일 사거리 (뉴스에서 자동 추출 · 검수 전)") : en ? "Missile range (open-source estimate)" : "미사일 사거리 (공개 추정)"}</p>
          <div className="mt-1 rounded-sm border border-[#6b4a22]/20 bg-[#f7edd4]/70 px-2 py-1">
            <p className="text-micro leading-snug">
              {missile.spec.name} · {formatRangeKm(missile.spec)}
            </p>
            {figures.distanceKm != null ? (
              <p className="mt-0.5 text-micro leading-snug">
                {en ? "Reported flight" : "이번 발표"}: {en ? "distance" : "비행거리"} {en ? "about " : "약 "}{figures.distanceKm.toLocaleString("en-US")}km
                {cmp?.percentOfMax != null ? (en ? ` (${cmp.percentOfMax}% of the max range)` : ` (최대 사거리의 약 ${cmp.percentOfMax}%)`) : ""}
                {figures.apogeeKm != null ? (en ? ` · apogee about ${figures.apogeeKm.toLocaleString("en-US")}km` : ` · 정점 고도 약 ${figures.apogeeKm.toLocaleString("en-US")}km`) : ""}
                {cmp?.lofted ? (en ? " · apogee is higher than the distance flown, which reads as a lofted launch" : " · 정점이 비행거리보다 높아 고각 발사로 읽힘") : ""}
                {cmp?.exceedsMax ? (en ? " · reported distance exceeds this source's max range" : " · 발표 비행거리가 이 출처의 최대 사거리보다 김(수치 확인 필요)") : ""}
              </p>
            ) : null}
            {impact.length > 0 ? (
              <p className="mt-0.5 text-micro leading-snug">
                {en ? "Landing, as the report words it" : "발표문의 낙하 서술"}: {impact.join(" / ")}
                {en ? " (not plotted: the text gives no coordinates)" : " (좌표가 없어 지도에는 찍지 않음)"}
              </p>
            ) : null}
            {missile.spec.auto ? (
              <p className="mt-0.5 text-micro leading-snug text-[#5c4020]">
                {en ? "Sources: " : "근거 기사: "}
                {missile.spec.auto.links.map((l, i) => (
                  <span key={l.url}>
                    {i > 0 ? " · " : ""}
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="underline">{l.title.slice(0, 40)}</a>
                  </span>
                ))}
              </p>
            ) : null}
            <p className="mt-0.5 text-micro text-[#5c4020]">
              {missile.spec.note ? `${missile.spec.note}. ` : ""}
              {en
                ? "On the globe, the red area is the maximum range from this report's location (treated as the launch point) and the amber line is the distance actually reported. The line shows distance only, not direction. Estimates differ by source."
                : "지구본의 붉은 면은 이 속보의 위치를 발사 지점으로 보고 최대 사거리로 그린 것이고, 노란 선은 발표된 실제 비행거리입니다. 노란 선은 거리만 보여 주며 낙하 방향은 알려 주지 않습니다. 출처마다 추정이 다릅니다."}{" "}
              <a href={missile.spec.source.url} target="_blank" rel="noopener noreferrer" className="underline">
                {missile.spec.source.name}
              </a>
            </p>
          </div>
        </section>
      ) : null}
      <PolledDocsSection matches={polledMatches} en={en} />
      <AnalysisSection matches={analysisMatches} en={en} />
      {articles.length > 0 ? (
        <section>
          <p className="px-0.5 text-micro font-semibold text-[#5c4020]">{en ? "Related press reports" : "관련 언론 기사"}</p>
          <ul className="mt-1 grid gap-1">
            {articles.map((row) => (
              <li key={row.url} className="rounded-sm border border-[#6b4a22]/20 bg-[#f7edd4]/70 px-2 py-1">
                <p className="text-micro leading-snug">
                  <a href={row.url} target="_blank" rel="noopener noreferrer" className="underline">
                    {row.title}
                  </a>
                </p>
                <p className="mt-0.5 text-micro text-[#5c4020]">
                  {row.source}
                  {row.label || row.tier === 3 ? (
                    <span className="ml-1 rounded-sm bg-[#6b4a22]/15 px-1">{row.label ?? (en ? "Party outlet" : "당사자 매체")}</span>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
