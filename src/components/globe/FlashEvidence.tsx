"use client";

import { useEffect, useState, type ReactNode } from "react";
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
import { useJmodLaunches } from "@/hooks/useJmodLaunches";
import { jmodReportForFlash } from "@/lib/jmodLaunch";
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
  /** 3단(사진·영상). 원 보도에 첨부된 것이 없으면 넘기지 않는다 */
  media?: ReactNode;
  mediaCount?: number;
};

const ORDER_KEY = "straitdesk-evidence-order";

type Tier = { key: "article" | "media" | "analysis" | "official"; ko: string; en: string; hint: [string, string]; n: number; node: ReactNode };

/** 속보의 근거 문서(공식 원문)와 같은 사건을 다룬 언론 기사. 둘 다 없으면 아무것도 그리지 않는다. */
export function FlashEvidence({ en, text, at, ownUrl, newsPool, media, mediaCount = 0 }: Props) {
  // 기본은 기사에서 시작해 원문으로 내려가는 순서. 원문부터 보고 싶은 사람은 뒤집을 수 있다(고른 순서는 기억한다)
  const [reversed, setReversed] = useState(false);
  useEffect(() => {
    try {
      setReversed(localStorage.getItem(ORDER_KEY) === "official-first");
    } catch {
      /* 저장소를 못 쓰면 기본 순서 */
    }
  }, []);
  const flip = () => {
    const next = !reversed;
    setReversed(next);
    try {
      localStorage.setItem(ORDER_KEY, next ? "official-first" : "article-first");
    } catch {
      /* 무시 */
    }
  };

  const docs = docsForFlash(text, OFFICIAL_DOCS);
  const articles = articlesForFlash(text, at, newsPool, ownUrl);
  const autoRanges = useAutoMissileRanges();
  const missile = missileRangeForText(text, autoRanges);
  const impact = missile ? impactClaimsOf(text) : [];
  const jmodReports = useJmodLaunches();
  const jmod = missile ? jmodReportForFlash(text, at, jmodReports) : null;
  const textFigures = flightFiguresOf(text);
  // 속보 본문에 수치가 없으면 같은 발사에 대한 일본 방위성 발표의 수치를 쓴다(아래에 출처를 밝힌다)
  const figures = {
    distanceKm: textFigures.distanceKm ?? jmod?.distanceKm,
    apogeeKm: textFigures.apogeeKm ?? jmod?.apogeeKm,
  };
  const fromJmod = jmod != null && (textFigures.distanceKm == null || textFigures.apogeeKm == null);
  const cmp = missile ? compareFlight(missile.spec, figures) : null;
  const analysisItems = useAnalysisItems();
  const analysisMatches = analysisForFlash(text, at, analysisItems);
  const polled = usePolledOfficialDocs();
  const polledMatches = polledDocsForFlash(text, at, polled, { excludeUrls: new Set(docs.map((d) => d.sourceUrl)) });

  const counts = [
    docs.length + polledMatches.length > 0
      ? `${en ? "official documents" : "공식 문서"} ${docs.length + polledMatches.length}`
      : null,
    articles.length > 0 ? `${en ? "press reports" : "언론 기사"} ${articles.length}` : null,
    analysisMatches.length > 0 ? `${en ? "analyses" : "분석"} ${analysisMatches.length}` : null,
  ].filter(Boolean);

  const officialN = docs.length + polledMatches.length;
  const officialBody = (
    <>
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
                {en ? "Reported flight" : "이번 발표"}: {en ? "distance" : "비행거리"} {jmod?.distanceAtLeast && textFigures.distanceKm == null ? (en ? "over " : "최소 ") : en ? "about " : "약 "}{figures.distanceKm.toLocaleString("en-US")}km
                {cmp?.percentOfMax != null ? (en ? ` (${cmp.percentOfMax}% of the max range)` : ` (최대 사거리의 약 ${cmp.percentOfMax}%)`) : ""}
                {figures.apogeeKm != null ? (en ? ` · apogee about ${figures.apogeeKm.toLocaleString("en-US")}km` : ` · 정점 고도 약 ${figures.apogeeKm.toLocaleString("en-US")}km`) : ""}
                {cmp?.lofted ? (en ? " · apogee is higher than the distance flown, which reads as a lofted launch" : " · 정점이 비행거리보다 높아 고각 발사로 읽힘") : ""}
                {cmp?.exceedsMax ? (en ? " · reported distance exceeds this source's max range" : " · 발표 비행거리가 이 출처의 최대 사거리보다 김(수치 확인 필요)") : ""}
              </p>
            ) : null}
            {jmod ? (
              <p className="mt-0.5 text-micro leading-snug">
                <a href={jmod.url} target="_blank" rel="noopener noreferrer" className="underline">
                  {en ? "Japan Ministry of Defense report" : "일본 방위성 발표"}
                </a>
                {jmod.launchPlace ? `: ${en ? "launched from" : "발사"} ${jmod.launchPlace}` : ""}
                {jmod.landing ? ` · ${en ? "landing" : "낙하"}: ${jmod.landing}` : ""}
                {fromJmod ? (en ? " · flight figures above come from this report" : " · 위 비행 수치는 이 발표에서 가져옴") : ""}
                {en ? " (the report gives areas, not coordinates, so nothing is plotted)" : " (발표에 좌표가 없고 영역만 있어 지도에는 찍지 않음)"}
              </p>
            ) : null}
            {impact.length > 0 && !jmod ? (
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
    </>
  );

  const articleBody =
    articles.length > 0 ? (
      <section>
        <p className="px-0.5 text-micro font-semibold text-[#5c4020]">{en ? "Related press reports" : "관련 언론 기사"}</p>
        <ul className="mt-1 grid gap-1">
          {articles.map((row) => (
            <li key={row.url} className="rounded-sm border border-[#6b4a22]/20 bg-[#f7edd4]/70 px-2 py-1">
              <p className="text-micro leading-snug">
                {row.url ? (
                  <a href={row.url} target="_blank" rel="noopener noreferrer" className="underline">
                    {row.title}
                  </a>
                ) : (
                  row.title
                )}
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
    ) : null;

  const missileN = missile ? 1 : 0;
  const tiers: Tier[] = [
    { key: "article", ko: "언론 기사", en: "Press reports", hint: ["같은 사건을 다룬 보도", "reports on the same event"], n: articles.length, node: articleBody },
    { key: "media", ko: "사진·영상", en: "Photos & video", hint: ["원 보도에 첨부된 현장 자료", "attached to the original report"], n: mediaCount, node: media },
    { key: "analysis", ko: "싱크탱크 분석", en: "Think-tank analysis", hint: ["전문가 해석(링크와 요약)", "expert reading (links and summaries)"], n: analysisMatches.length, node: <AnalysisSection matches={analysisMatches} en={en} /> },
    { key: "official", ko: "공식 원문", en: "Official documents", hint: ["국가기관이 낸 문서", "issued by the government itself"], n: officialN + missileN, node: officialBody },
  ];
  if (reversed) tiers.reverse();
  const firstFilled = tiers.findIndex((t) => t.n > 0);
  const nothing = firstFilled < 0;

  return (
    <div className="evidence-cascade space-y-2 empty:hidden" data-flash-evidence data-evidence-order={reversed ? "official-first" : "article-first"}>
      {counts.length > 0 ? (
        <div className="rounded-sm bg-[#6b4a22]/10 px-2 py-1" data-flash-evidence-head>
          <p className="text-meta font-semibold text-[#3d2a12]">
            {en ? "Evidence for this flash" : "이 속보의 근거 자료"} · {counts.join(" · ")}
          </p>
          <p className="text-micro text-[#5c4020]/80">
            {en
              ? "Each entry has a link to the original. Documents below are collected automatically and not yet reviewed."
              : "아래 항목마다 원문으로 가는 링크가 있습니다. 공식 문서는 자동으로 모은 것이라 아직 검수 전입니다."}
          </p>
        </div>
      ) : null}
      <SipriArmsRecord text={text} en={en} />
      {nothing ? (
        <p className="px-0.5 text-micro text-[#5c4020]/70" data-flash-no-doc>
          {en
            ? "No press report, analysis, media or government source document is linked to this flash yet."
            : "이 속보에 연결된 기사·분석·사진·정부 원문이 아직 없습니다."}
        </p>
      ) : (
        <div className="space-y-1.5" data-evidence-tiers>
          <div className="flex items-center justify-between gap-2 px-0.5">
            <p className="text-micro text-[#5c4020]/80">
              {tiers.map((t) => (en ? t.en : t.ko)).join(" → ")}
              <span className="ml-1">{reversed ? (en ? "(original first)" : "(원문부터)") : en ? "(go deeper to the original)" : "(깊이 들어갈수록 원문)"}</span>
            </p>
            <button type="button" className="shrink-0 text-micro text-[#5c4020] underline" onClick={flip} data-evidence-flip>
              {reversed ? (en ? "Start from press" : "기사부터 보기") : en ? "Start from original" : "원문부터 보기"}
            </button>
          </div>
          {tiers.map((t, i) => {
            const label = `${i + 1}${en ? ". " : "단계 · "}${en ? t.en : t.ko}`;
            if (t.n === 0) {
              return (
                <p key={`${t.key}-${reversed}`} className="rounded-sm border border-dashed border-[#6b4a22]/25 px-2 py-1 text-micro text-[#5c4020]/70" data-evidence-tier={t.key} data-empty>
                  {label} · {en ? "nothing linked yet" : "연결된 자료 없음"}
                </p>
              );
            }
            return (
              <details key={`${t.key}-${reversed}`} open={i === firstFilled} className="rounded-sm border border-[#6b4a22]/25 bg-[#f7edd4]/40 px-2 py-1" data-evidence-tier={t.key}>
                <summary className="cursor-pointer select-none text-micro font-semibold text-[#3d2a12]">
                  {label} · {t.n}
                  <span className="ml-1 font-normal text-[#5c4020]/70">{en ? t.hint[1] : t.hint[0]}</span>
                </summary>
                <div className="mt-1 space-y-2">{t.node}</div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
