"use client";

import { HoverHint } from "@/components/HoverHint";
import { useLocale } from "@/contexts/LocaleContext";

import { DISCLAIMER_EN, DISCLAIMER_KO } from "@/components/LegalDisclaimerFooter";
import {
  OPENALEX_ATTRIBUTION_EN,
  OPENALEX_ATTRIBUTION_KO,
  OPENALEX_POLICY,
} from "@/lib/licensing/openAlexPolicy";
import {
  VIINA_ATTRIBUTION_EN,
  VIINA_ATTRIBUTION_KO,
  VIINA_POLICY,
} from "@/lib/licensing/viinaPolicy";
import {
  SIPRI_ARMS_LENS_ENABLED,
  SIPRI_ATTRIBUTION_EN,
  SIPRI_ATTRIBUTION_KO,
  SIPRI_POLICY,
} from "@/lib/licensing/sipriPolicy";
import {
  VDEM_ATTRIBUTION_EN,
  VDEM_ATTRIBUTION_KO,
  VDEM_POLICY,
} from "@/lib/licensing/vdemPolicy";
import {
  IRONSIGHT_ATTRIBUTION_EN,
  IRONSIGHT_ATTRIBUTION_KO,
  IRONSIGHT_POLICY,
  IRONSIGHT_USAGE,
} from "@/lib/licensing/ironsightPolicy";
import {
  TELEGRAM_OSINT_ABSOLUTE_RULE_KO,
  TELEGRAM_OSINT_CHECKLIST,
} from "@/lib/licensing/telegramOsintPolicy";
import {
  FREESOUND_ATTRIBUTIONS,
  formatFreesoundCredit,
} from "@/lib/audioAttribution";
import { FONT_ATTRIBUTIONS } from "@/lib/fontAttribution";
import {
  NEWS_LAYER_SOURCE_CATALOG,
  PRIMARY_LIVE_SOURCES,
  SANCTIONS_ENTITY_SUMMARY,
  blockedSourceNotes,
  getSourceCatalogStats,
} from "@/data/sourceCatalog";
import { EvidenceTierBadge } from "@/components/EvidenceTierBadge";
import { getLayerReliability } from "@/lib/layerReliability";
import { EVIDENCE_TIER_LEGEND } from "@/lib/evidenceTierMarker";
import { gtiMethodologyCopy, gtiMethodologyProse } from "@/lib/gti";
import { getCorridorRankPipelineStatus } from "@/lib/corridorRanks";

type MethodologySourcesPanelProps = {
  open: boolean;
  onClose: () => void;
  /** 뉴스·OSINT 신뢰도 등급 패널로 이동 */
  onOpenTrust?: () => void;
  /** 8개 책갈피 양피지 안내서 */
  onOpenParchment?: () => void;
};

const VIINA_CHECKLIST = [
  "지도에 폴리곤·전선·지역명만 렌더링 (Produced Work)",
  "출처 표기: VIINA + ODbL v1.0 링크",
  "공개 API로 VIINA 원본/가공 데이터 제공 금지",
  "GeoJSON·CSV 등 사용자 export 기능 금지",
  "서버 내부 캐시만 허용, 클라이언트 bulk 응답 금지",
  "유료 SaaS 전 법률 자문 권장",
] as const;

export function MethodologySourcesPanel({
  open,
  onClose,
  onOpenTrust,
  onOpenParchment,
}: MethodologySourcesPanelProps) {
  const { lang } = useLocale();
  if (!open) return null;

  const catalogStats = getSourceCatalogStats();
  const shipped = NEWS_LAYER_SOURCE_CATALOG.filter((n) => n.status === "shipped");
  const planned = NEWS_LAYER_SOURCE_CATALOG.filter((n) => n.status === "planned");
  const blocked = blockedSourceNotes();
  const isEn = lang === "en";
  const gtiProse = gtiMethodologyProse(isEn ? "en" : "ko");
  const gtiMethod = gtiMethodologyCopy(isEn ? "en" : "ko");
  const corridorPipeline = getCorridorRankPipelineStatus();
  const sanctions = SANCTIONS_ENTITY_SUMMARY;

  return (
    <>
      <button
        type="button"
        aria-label={isEn ? "Close sources panel" : "데이터 출처 패널 닫기"}
        className="absolute inset-0 z-[500] bg-[#0a1528]/50 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <aside
        className="intel-panel absolute right-3 top-14 z-[600] flex max-h-[calc(100vh-4.5rem)] w-[min(calc(100vw-1.5rem),400px)] flex-col overflow-hidden rounded-2xl shadow-2xl"
        role="dialog"
        aria-label={isEn ? "Sources and licenses" : "데이터 출처 및 라이선스"}
      >
        <div className="flex items-start justify-between gap-3 border-b border-sky-300/15 px-4 py-3">
          <div>
            <p className="text-micro uppercase tracking-[0.28em] text-sky-200/70">Sources</p>
            <h2 className="mt-1 text-lg font-semibold text-sky-50">
              {isEn ? "Sources · Licenses" : "데이터 출처 · 라이선스"}
            </h2>
            <p className="mt-1 text-caption text-sky-100/60">
              {isEn
                ? `${catalogStats.shipped} shipped · ${catalogStats.planned} planned · ${catalogStats.blocked} blocked · ${PRIMARY_LIVE_SOURCES.length} live feeds`
                : `운영 ${catalogStats.shipped} · 계획 ${catalogStats.planned} · 차단 ${catalogStats.blocked} · 실시간 ${PRIMARY_LIVE_SOURCES.length}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-sky-200/15 px-2 py-1 text-xs text-sky-100/80 transition hover:border-sky-200/30 hover:text-sky-50"
          >
            {isEn ? "Close" : "닫기"}
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <section className="rounded-xl border border-sky-400/30 bg-sky-950/35 p-3">
            <h3 className="text-sm font-medium text-sky-50">
              {isEn ? "Catalog honesty (live)" : "소스 카탈로그 · 정직한 현황"}
            </h3>
            <p className="mt-1.5 text-caption leading-5 text-sky-100/80">
              {isEn
                ? "What ships vs what is demo or blocked — same truth as sourceCatalog.ts and the parchment guide."
                : "운영·데모·차단을 카탈로그와 양피지가 같은 기준으로 밝힙니다."}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-emerald-400/25 bg-emerald-950/30 px-2 py-2">
                <p className="text-lg font-semibold tabular-nums text-emerald-100">{catalogStats.shipped}</p>
                <p className="text-micro text-emerald-200/70">{isEn ? "shipped" : "운영"}</p>
              </div>
              <div className="rounded-lg border border-slate-500/30 bg-black/25 px-2 py-2">
                <p className="text-lg font-semibold tabular-nums text-slate-200">{catalogStats.planned}</p>
                <p className="text-micro text-slate-400">{isEn ? "planned" : "계획"}</p>
              </div>
              <div className="rounded-lg border border-rose-400/30 bg-rose-950/25 px-2 py-2">
                <p className="text-lg font-semibold tabular-nums text-rose-100">{catalogStats.blocked}</p>
                <p className="text-micro text-rose-200/70">{isEn ? "blocked" : "차단"}</p>
              </div>
            </div>
            <ul className="mt-3 space-y-1.5 text-meta leading-5 text-sky-100/75">
              <li>
                {isEn ? "Sanctions" : "제재"} — OFAC·UN{" "}
                <strong className="text-fuchsia-100">{sanctions.total.toLocaleString()}</strong>
                {isEn ? " entities" : "건"}
                {isEn ? " (" : " ("}
                {sanctions.withCoords.toLocaleString()}
                {isEn ? " with map coords; jurisdiction rollup for the rest" : "건 좌표 핀 · 나머지 관할권 집계"}
                ).
              </li>
              <li>
                {isEn ? "Corridor ranks" : "코리도 점수"} — PortWatch {corridorPipeline.portwatchHits} · Eurostat{" "}
                {corridorPipeline.railFreightHits} · Comtrade {corridorPipeline.comtradeHits} · LSBCI{" "}
                {corridorPipeline.lsbciHits}
              </li>
              <li className="text-amber-100/90">
                {isEn
                  ? "Still demo (2): UCDP GED, IXP — run npm run data:ucdp / fetch-peeringdb-ix on a PC."
                  : "아직 데모(2): UCDP GED, IXP — PC에서 npm run data:ucdp / fetch-peeringdb-ix 실행 필요."}
              </li>
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              {onOpenParchment ? (
                <button
                  type="button"
                  onClick={onOpenParchment}
                  className="rounded-lg border border-amber-300/35 bg-amber-500/10 px-3 py-2 text-caption font-medium text-amber-50 transition hover:border-amber-200/50 hover:bg-amber-500/15"
                >
                  {isEn ? "8 bookmark parchment guide →" : "8개 책갈피 양피지 →"}
                </button>
              ) : null}
              {onOpenTrust ? (
                <button
                  type="button"
                  onClick={onOpenTrust}
                  className="rounded-lg border border-sky-300/25 bg-sky-500/10 px-3 py-2 text-caption font-medium text-sky-50 transition hover:border-sky-200/40 hover:bg-sky-500/15"
                >
                  {isEn ? "News trust grades →" : "뉴스 신뢰도 등급 →"}
                </button>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-amber-500/30 bg-amber-950/25 p-3">
            <h3 className="text-sm font-medium text-amber-100">
              {isEn ? "Disclaimer" : "면책"}
            </h3>
            <p className="mt-2 text-caption leading-5 text-sky-100/85">
              {isEn ? DISCLAIMER_EN : DISCLAIMER_KO}
            </p>
          </section>

          <section className="rounded-xl border border-rose-400/30 bg-rose-950/25 p-3">
            <h3 className="text-sm font-medium text-rose-100">{gtiProse.title}</h3>
            <div className="mt-2 space-y-2 text-caption leading-5 text-sky-100/85">
              {gtiProse.paragraphs.map((p) => (
                <p key={p.slice(0, 48)}>{p}</p>
              ))}
            </div>
            <details className="mt-3 group">
              <summary className="cursor-pointer text-caption font-semibold text-rose-200/90 marker:text-rose-300/70">
                {isEn ? "Formula (technical)" : "산출식 (자세히)"}
              </summary>
              <div className="mt-2 space-y-2 border-t border-rose-400/20 pt-2 text-caption leading-5 text-sky-100/75">
                {gtiMethod.paragraphs.map((p) => (
                  <p key={p.slice(0, 48)}>{p}</p>
                ))}
              </div>
            </details>
          </section>

          <section className="rounded-xl border border-violet-400/30 bg-violet-950/25 p-3">
            <h3 className="text-sm font-medium text-violet-100">
              {isEn ? "Corridor rank pipeline" : "회랑 점수 파이프라인"}
            </h3>
            <p className="mt-1.5 text-caption leading-5 text-sky-100/80">
              {isEn
                ? `Built ${corridorPipeline.generatedAt.slice(0, 10)} — PortWatch ${corridorPipeline.portwatchHits}, Eurostat rail ${corridorPipeline.railFreightHits}, Comtrade ${corridorPipeline.comtradeHits}, UNCTAD ${corridorPipeline.unctadHits}, LSBCI ${corridorPipeline.lsbciHits}. Click a corridor for indicator n/m coverage.`
                : `빌드 ${corridorPipeline.generatedAt.slice(0, 10)} — PortWatch ${corridorPipeline.portwatchHits}건, Eurostat 철도 ${corridorPipeline.railFreightHits}건, Comtrade ${corridorPipeline.comtradeHits}건, UNCTAD ${corridorPipeline.unctadHits}건, LSBCI ${corridorPipeline.lsbciHits}건. 회랑 클릭 시 지표 n/m을 표시합니다.`}
            </p>
          </section>

          {onOpenTrust ? (
            <section className="rounded-xl border border-sky-400/25 bg-sky-950/30 p-3">
              <h3 className="text-sm font-medium text-sky-50">
                {isEn ? "News · OSINT trust grades" : "뉴스 · OSINT 신뢰도 등급"}
              </h3>
              <p className="mt-1.5 text-caption leading-5 text-sky-100/75">
                {isEn
                  ? "Media Tier 1/2/3 (editorial independence) is separate from layer evidence type (Observed / Reported / Unverified / Estimate)."
                  : "매체 Tier 1/2/3(편집독립)과 레이어 증거 종류(관측·보도·미확인·추정)는 다른 축입니다."}
              </p>
            </section>
          ) : null}
          <section className="rounded-xl border border-emerald-400/25 bg-emerald-950/20 p-3">
            <h3 className="text-sm font-medium text-emerald-50">
              {isEn ? "Layer evidence types" : "레이어 증거 종류"}
            </h3>
            <p className="mt-1.5 text-caption leading-5 text-sky-100/75">
              {isEn
                ? "Each map layer is labeled Observed, Reported, Unverified, or Estimate — plus freshness (live / daily / static). This is not a truth score."
                : "지도 레이어마다 관측·보도·미확인·추정과 신선도(실시간·일별·정적)를 붙입니다. 진실 점수가 아닙니다."}
            </p>
          </section>
          <section className="rounded-xl border border-sky-400/25 bg-sky-950/30 p-3">
            <h3 className="text-sm font-medium text-sky-50">
              {isEn ? "Freesound audio (attribution required)" : "Freesound 음원 (저작물 명시)"}
            </h3>
            <p className="mt-2 text-caption leading-5 text-sky-100/80">
              {isEn
                ? "Only CC-BY / CC-BY-NC samples are listed. CC0 (public domain dedication) assets are omitted — no attribution obligation."
                : "CC-BY · CC-BY-NC 만 수록합니다. CC0(저작권 포기) 음원은 명시 의무가 없어 제외했습니다."}
            </p>
            <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto text-meta leading-5 text-sky-100/75">
              {FREESOUND_ATTRIBUTIONS.map((credit) => (
                <li key={credit.freesoundId}>
                  <a
                    href={credit.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-sky-400/40 underline-offset-2 hover:text-sky-50"
                  >
                    {formatFreesoundCredit(credit)}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-micro leading-4 text-sky-100/55">
              Source: freesound.org · Creative Commons
            </p>
          </section>

          {/*
            폰트 고지 — SIL OFL 제2조는 폰트 파일 재배포 시 저작권 고지와 라이선스
            전문 동봉을 요구한다. 웹폰트 서빙도 배포에 해당하므로 이 섹션이 필요하다.
            전문: public/licenses/OFL-1.1.txt · 목록: public/licenses/fonts.md
            @see docs/copyright-audit-2026-08-01.md — R-1
          */}
          <section className="rounded-xl border border-sky-400/25 bg-sky-950/30 p-3">
            <h3 className="text-sm font-medium text-sky-50">
              {isEn ? "Typefaces (attribution required)" : "서체 (저작권 고지)"}
            </h3>
            <p className="mt-2 text-caption leading-5 text-sky-100/80">
              {isEn
                ? "Fonts served as webfonts by this service. SIL OFL requires the copyright notice and license text to accompany redistributed font files."
                : "이 서비스가 웹폰트로 제공하는 서체입니다. SIL OFL은 폰트 파일 재배포 시 저작권 고지와 라이선스 전문을 함께 두도록 요구합니다."}
            </p>
            <ul className="mt-3 space-y-2 text-meta leading-5 text-sky-100/75">
              {FONT_ATTRIBUTIONS.map((credit) => (
                <li key={credit.family}>
                  <a
                    href={credit.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-sky-400/40 underline-offset-2 hover:text-sky-50"
                  >
                    {credit.family}
                  </a>
                  <span className="text-sky-100/55">
                    {" — "}
                    {credit.holder} · {credit.license}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-micro leading-4 text-sky-100/55">
              <a
                href="/licenses/fonts.md"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-sky-400/40 underline-offset-2 hover:text-sky-50"
              >
                {isEn ? "Full font license notices" : "폰트 라이선스 전문 보기"}
              </a>
              {" · "}
              <a
                href="/licenses/OFL-1.1.txt"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-sky-400/40 underline-offset-2 hover:text-sky-50"
              >
                SIL OFL 1.1
              </a>
            </p>
          </section>

          <section className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-3">
            <h3 className="text-sm font-medium text-amber-100">
              {isEn ? "Logistics stress (chokepoints)" : "물류 스트레스 (초크포인트)"}
            </h3>
            <p className="mt-2 text-caption leading-5 text-sky-100/80">
              {isEn
                ? "Observation-based estimate at maritime chokepoints. Grade and siren require A-grade (UKMTO) only. B-grade vessel transit comes from IMF PortWatch (live). Oil volatility (C) is not connected yet."
                : "해상 초크포인트 관측 기반 추정. 등급·사이렌은 A급(UKMTO)만으로 확정합니다. B급 통과량은 IMF PortWatch 실측입니다. 유가 변동성(C)은 아직 미연결입니다."}
            </p>
            <p className="mt-2 text-meta leading-5 text-sky-100/65">
              {isEn
                ? "Chokepoint transits: IMF PortWatch (IMF/Oxford) · UKMTO(A·live) · oil volatility(C) pending"
                : "Chokepoint transits: IMF PortWatch (IMF/Oxford) · UKMTO(A·실측) · 유가변동성(C) 미연결"}
            </p>
          </section>
          <section className="rounded-xl border border-violet-800/40 bg-violet-950/20 p-3">
            <h3 className="text-sm font-medium text-violet-100">
              OpenAlex — 학술 참고문헌 ({OPENALEX_POLICY.product})
            </h3>
            <p className="mt-2 text-caption leading-5 text-sky-100/80">{OPENALEX_ATTRIBUTION_KO}</p>
            <p className="mt-2 text-meta italic leading-5 text-sky-100/60">{OPENALEX_ATTRIBUTION_EN}</p>
            <p className="mt-3 text-meta leading-5 text-violet-200/75">
              {OPENALEX_POLICY.fullName} · {OPENALEX_POLICY.licenseNote}
            </p>
            <p className="mt-2 text-meta leading-5 text-sky-100/65">
              API:{" "}
              <a
                href={OPENALEX_POLICY.apiUrl}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-violet-400/40 underline-offset-2 hover:text-sky-50"
              >
                {OPENALEX_POLICY.apiUrl}
              </a>
              {" · "}
              <a
                href={OPENALEX_POLICY.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-violet-400/40 underline-offset-2 hover:text-sky-50"
              >
                docs.openalex.org
              </a>
            </p>
          </section>

          <section className="rounded-xl border border-yellow-800/40 bg-yellow-950/20 p-3">
            <h3 className="text-sm font-medium text-yellow-100">
              핵탄두 보유량 — 각국 ICBM 마커 (Our World in Data)
            </h3>
            <p className="mt-2 text-caption leading-5 text-sky-100/80">
              각국 좌표 위에 ICBM 형상 아이콘과 최신(2026) 핵탄두 보유 수를 표시합니다.
              보유 9개국(러시아·미국·중국·프랑스·영국·인도·파키스탄·이스라엘·북한)만
              나타나며, 폐기국(남아공)과 세계 합계는 제외했습니다.
            </p>
            <p className="mt-2 text-meta leading-5 text-sky-100/65">
              인용: Our World in Data · FAS Nuclear Notebook.
            </p>
            <p className="mt-2 text-meta leading-5 text-sky-100/65">
              데이터:{" "}
              <a
                href="https://ourworldindata.org/grapher/nuclear-warhead-stockpiles-lines"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-yellow-400/40 underline-offset-2 hover:text-sky-50"
              >
                ourworldindata.org/grapher/nuclear-warhead-stockpiles-lines
              </a>
            </p>
          </section>

          <section className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-3">
            <h3 className="text-sm font-medium text-emerald-100">주요 출처</h3>
            <p className="mt-1.5 text-meta leading-5 text-sky-100/65">
              실시간 관측 레이어의 1차 출처입니다. 지도·패널에 NASA FIRMS · ADS-B ·
              MarineTraffic을 명시합니다.
            </p>
            <ul className="mt-3 space-y-3">
              {PRIMARY_LIVE_SOURCES.map((src) => (
                <li
                  key={src.id}
                  className="rounded-lg border border-emerald-800/30 bg-black/20 px-2.5 py-2"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-caption font-semibold text-emerald-50">{src.nameKo}</span>
                    <span className="text-micro text-emerald-200/55">{src.product}</span>
                  </div>
                  <p className="mt-1 text-micro italic text-sky-100/50">{src.nameEn}</p>
                  <p className="mt-1.5 text-meta leading-5 text-sky-100/75">{src.noteKo}</p>
                  <p className="mt-1 text-micro text-sky-100/45">{src.layers}</p>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-block text-micro text-emerald-200/80 underline decoration-emerald-400/35 underline-offset-2 hover:text-emerald-100"
                  >
                    {src.url.replace(/^https?:\/\//, "")}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-3">
            <h3 className="text-sm font-medium text-amber-100">
              {isEn
                ? "Energy infrastructure — GEM · EMODnet · OSM"
                : "에너지 인프라 — GEM · EMODnet · OSM"}
            </h3>
            <p className="mt-2 text-caption leading-5 text-sky-100/80">
              {isEn
                ? "Oil/gas pipelines and LNG terminals: Global Energy Monitor (CC BY 4.0). Subsea layer merges GEM offshore segments worldwide with EMODnet Human Activities (European seas). Zoomed-in detail merges OpenStreetMap Overpass (substance oil|gas|petroleum and location=underwater|offshore)."
                : "송유관·가스관·LNG: Global Energy Monitor (CC BY 4.0). 해저관: GEM 전 세계 offshore 구간 + EMODnet(유럽 해역). 줌인 시 OpenStreetMap Overpass(substance oil|gas|petroleum · location=underwater|offshore)로 보강합니다."}
            </p>
            <p className="mt-2 text-meta leading-5 text-sky-100/65">
              {isEn ? "APIs / data:" : "API·데이터:"}{" "}
              <a
                href="https://globalenergymonitor.org/download-data"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-amber-400/40 underline-offset-2 hover:text-sky-50"
              >
                globalenergymonitor.org
              </a>
              {" · "}
              <a
                href="https://emodnet.ec.europa.eu/en/human-activities"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-amber-400/40 underline-offset-2 hover:text-sky-50"
              >
                EMODnet Human Activities
              </a>
              {" · "}
              /api/pipelines-osm
            </p>
          </section>

          <section className="rounded-xl border border-violet-800/40 bg-violet-950/20 p-3">
            <h3 className="text-sm font-medium text-violet-100">
              {isEn
                ? "CelesTrak — recon / surveillance orbits"
                : "CelesTrak — 정찰·감시 위성 궤도"}
            </h3>
            <p className="mt-2 text-caption leading-5 text-sky-100/80">
              {isEn
                ? "Orbital elements: CelesTrak (T.S. Kelso). GP TLEs from the military and earth-resources groups plus recon-family name queries, filtered by public recon-family patterns; navigation, comms and early-warning series are excluded, as are debris and TLEs older than 45 days. Positions are SGP4-propagated in the browser. Horizon rings are theoretical footprints — not imaging tasking."
                : "궤도요소: CelesTrak (T.S. Kelso). military·resource 그룹과 정찰 계열 이름 질의로 받은 GP TLE를 공개 정찰 계열 패턴으로 걸러 쓰며, 항법·통신·조기경보 계열과 파편, 45일 지난 TLE는 제외합니다. 위치는 브라우저 SGP4로 계산합니다. 가시권 원은 이론상 지평선일 뿐 촬영 영역이 아닙니다."}
            </p>
            <p className="mt-2 text-meta leading-5 text-sky-100/65">
              API:{" "}
              <a
                href="https://celestrak.org/"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-violet-400/40 underline-offset-2 hover:text-sky-50"
              >
                celestrak.org
              </a>
              {" · "}
              /api/satellites
            </p>
          </section>

          <section className="rounded-xl border border-orange-800/40 bg-orange-950/20 p-3">
            <h3 className="text-sm font-medium text-orange-100">OSINT GitHub 시드 · 보강 DB</h3>
            <p className="mt-1.5 text-meta leading-5 text-sky-100/65">
              군용기 hex 보강·위장선박 시드는 아래 저장소에서 가져왔으며, 지도·API attribution에도
              동일 URL을 표기합니다.
            </p>
            <ul className="mt-3 space-y-3">
              <li className="rounded-lg border border-orange-800/30 bg-black/20 px-2.5 py-2">
                <p className="text-caption font-semibold text-orange-50">군용기 — Bellingcat Turnstone</p>
                <p className="mt-1 text-meta leading-5 text-sky-100/75">
                  adsb-history modes.csv (military=t, ~28k ICAO hex)로 군용 기체 판별 보강.
                </p>
                <a
                  href="https://github.com/bellingcat/adsb-history.git"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 inline-block break-all font-mono text-micro text-orange-200/90 underline decoration-orange-400/35 underline-offset-2 hover:text-orange-100"
                >
                  https://github.com/bellingcat/adsb-history.git
                </a>
              </li>
              <li className="rounded-lg border border-orange-800/30 bg-black/20 px-2.5 py-2">
                <p className="text-caption font-semibold text-orange-50">위장선박 — AIS_Tracker</p>
                <p className="mt-1 text-meta leading-5 text-sky-100/75">
                  vessels / dark_fleet 시드(무기고 개조·다크플리트). 레이어: 위장선박 ·
                  /api/ais-disguised.
                </p>
                <a
                  href="https://github.com/arandomguyhere/AIS_Tracker.git"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 inline-block break-all font-mono text-micro text-orange-200/90 underline decoration-orange-400/35 underline-offset-2 hover:text-orange-100"
                >
                  https://github.com/arandomguyhere/AIS_Tracker.git
                </a>
              </li>
            </ul>
          </section>

          <section className="rounded-xl border border-amber-900/35 bg-amber-950/15 p-3">
            <h3 className="text-sm font-medium text-amber-100">VIINA — 렌더링 전용 (ODbL)</h3>
            <p className="mt-2 text-caption leading-5 text-sky-100/80">{VIINA_ATTRIBUTION_KO}</p>
            <p className="mt-2 text-meta italic leading-5 text-sky-100/60">{VIINA_ATTRIBUTION_EN}</p>
            <div className="mt-3 space-y-2 text-meta">
              <p className="leading-5 text-sky-100/75">
                <span className="text-sky-200/55">GitHub · </span>
                <a
                  href={VIINA_POLICY.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all font-mono text-sky-200 underline decoration-sky-400/35 underline-offset-2 transition hover:text-sky-50 hover:decoration-sky-200/60"
                >
                  {VIINA_POLICY.sourceUrl}
                </a>
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={VIINA_POLICY.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-sky-300/25 px-2 py-1 text-sky-200 transition hover:border-sky-200/40"
                >
                  VIINA GitHub
                </a>
                <a
                  href={VIINA_POLICY.licenseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-sky-300/25 px-2 py-1 text-sky-200 transition hover:border-sky-200/40"
                >
                  ODbL v1.0
                </a>
              </div>
            </div>
            <p className="mt-3 text-meta leading-5 text-amber-200/75">
              ODbL 4.5(b): 데이터베이스 조회로 만든 <strong>제작물(지도 렌더)</strong>은 파생 DB가
              아닙니다. Share-Alike 의무는 가볍지만,{" "}
              <strong>원본·가공 DB를 API/export로 유저에게 주면 안 됩니다.</strong>
            </p>
            <ul className="mt-2.5 list-disc space-y-1 pl-4 text-meta leading-5 text-sky-100/70">
              {VIINA_CHECKLIST.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          {SIPRI_ARMS_LENS_ENABLED ? (
            <section className="rounded-xl border border-orange-900/35 bg-orange-950/15 p-3">
              <h3 className="text-sm font-medium text-orange-100">
                SIPRI — 재래식 무기이전 ({SIPRI_POLICY.product})
              </h3>
              <p className="mt-2 text-caption leading-5 text-sky-100/80">
                {SIPRI_ATTRIBUTION_KO}
              </p>
              <p className="mt-2 text-meta italic leading-5 text-sky-100/60">
                {SIPRI_ATTRIBUTION_EN}
              </p>
              <p className="mt-3 text-meta leading-5 text-orange-200/75">
                {SIPRI_POLICY.fullName} · {SIPRI_POLICY.licenseNote}
              </p>
              <p className="mt-2 text-meta leading-5 text-sky-100/65">
                별도 공식 딥링크를 UI에 고정하지 않습니다. SIPRI 웹사이트에서 Arms Transfers
                Database / Trade Register 문서를 직접 검색·인용해 주십시오. 화면의 호·목록은
                축 허브 필터가 적용된 요약이며, 연구·보도 인용 시 원자료를 확인하십시오.
              </p>
            </section>
          ) : null}

          <section className="rounded-xl border border-fuchsia-900/35 bg-fuchsia-950/15 p-3">
            <h3 className="text-sm font-medium text-fuchsia-100">
              V-Dem — 체제·권위주의 프레임 ({VDEM_POLICY.product})
            </h3>
            <p className="mt-2 text-caption leading-5 text-sky-100/80">{VDEM_ATTRIBUTION_KO}</p>
            <p className="mt-2 text-meta italic leading-5 text-sky-100/60">{VDEM_ATTRIBUTION_EN}</p>
            <p className="mt-3 text-meta leading-5 text-fuchsia-200/75">
              {VDEM_POLICY.fullName} · {VDEM_POLICY.licenseNote}
            </p>
            <p className="mt-2 text-meta leading-5 text-sky-100/65">
              별도 공식 딥링크를 UI에 고정하지 않습니다. V-Dem Institute(예: University of
              Gothenburg) 공개 데이터·문서를 검색해 인용하십시오. 분쟁 외교사 카드는 큐레이션
              에피소드이며 V-Dem 변수 전체를 시각화하지 않습니다.
            </p>
          </section>

          <section className="rounded-xl border border-violet-900/35 bg-violet-950/15 p-3">
            <h3 className="text-sm font-medium text-violet-100">
              IRONSIGHT — Telegram 채널 카탈로그 (MIT)
            </h3>
            <p className="mt-2 text-caption leading-5 text-sky-100/80">{IRONSIGHT_ATTRIBUTION_KO}</p>
            <p className="mt-2 text-meta italic leading-5 text-sky-100/60">
              {IRONSIGHT_ATTRIBUTION_EN}
            </p>
            <p className="mt-2 text-meta leading-5 text-violet-200/75">
              {IRONSIGHT_POLICY.copyright} · {IRONSIGHT_POLICY.license} License
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-meta">
              <a
                href={IRONSIGHT_POLICY.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded border border-sky-300/25 px-2 py-1 text-sky-200 transition hover:border-sky-200/40"
              >
                IRONSIGHT
              </a>
              <a
                href={IRONSIGHT_POLICY.licenseUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded border border-sky-300/25 px-2 py-1 text-sky-200 transition hover:border-sky-200/40"
              >
                MIT
              </a>
              <a
                href={IRONSIGHT_POLICY.licenseFilePath}
                target="_blank"
                rel="noreferrer"
                className="rounded border border-sky-300/25 px-2 py-1 text-sky-200 transition hover:border-sky-200/40"
              >
                MIT (bundled)
              </a>
            </div>
            <ul className="mt-2.5 list-disc space-y-1 pl-4 text-meta leading-5 text-sky-100/70">
              {IRONSIGHT_USAGE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-amber-900/35 bg-amber-950/15 p-3">
            <h3 className="text-sm font-medium text-amber-100">
              {isEn ? "Evidence tier — marker look" : "증거 등급 — 마커 모양"}
            </h3>
            <p className="mt-2 text-caption leading-5 text-sky-100/75">
              {isEn
                ? "Stroke style encodes how we know — not how important it is. Without this legend, dashed rings look like another color."
                : "선 스타일은 ‘얼마나 중요한가’가 아니라 ‘어떻게 아는가’입니다. 범례 없이는 파선이 그냥 다른 색으로 보입니다."}
            </p>
            <ul className="mt-2.5 space-y-2">
              {EVIDENCE_TIER_LEGEND.map((entry) => (
                <li
                  key={entry.tier}
                  className="flex items-center gap-2.5 text-meta leading-5 text-sky-100/80"
                >
                  <span
                    aria-hidden
                    className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border-[1.5px] border-amber-100/85 bg-amber-100/15"
                    style={{ borderStyle: entry.style }}
                    title={entry.style}
                  />
                  <EvidenceTierBadge tier={entry.tier} lang={lang} />
                  <span>{isEn ? entry.en : entry.ko}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-cyan-900/35 bg-cyan-950/15 p-3">
            <h3 className="text-sm font-medium text-cyan-100">
              {isEn ? "Telegram OSINT — LLM separation" : "텔레그램 OSINT — LLM 분리"}
            </h3>
            <p className="mt-2 text-caption leading-5 text-sky-100/80">{TELEGRAM_OSINT_ABSOLUTE_RULE_KO}</p>
            <ul className="mt-2.5 list-disc space-y-1 pl-4 text-meta leading-5 text-sky-100/70">
              {TELEGRAM_OSINT_CHECKLIST.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-sky-300/12 bg-black/20 p-3">
            <h3 className="text-sm font-medium text-sky-50/95">연동 중인 레이어</h3>
            <ul className="mt-2 space-y-2">
              {shipped.map((note) => {
                const rel = getLayerReliability(note.layerId);
                const caveat = rel
                  ? isEn
                    ? rel.caveatEn
                    : rel.caveatKo
                  : null;
                return (
                <li key={note.layerId} className="text-meta leading-5 text-sky-100/75">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-sky-50/90">{note.source}</span>
                    {rel ? (
                      <EvidenceTierBadge tier={rel.evidenceTier} lang={lang} />
                    ) : null}
                  </div>
                  <span className="text-sky-100/50"> · {note.attribution}</span>
                  {caveat ? (
                    <p className="mt-0.5 text-sky-100/55">{caveat}</p>
                  ) : note.notes ? (
                    <p className="mt-0.5 text-sky-100/55">{note.notes}</p>
                  ) : null}
                </li>
                );
              })}
            </ul>
          </section>

          {blocked.length > 0 ? (
            <section className="rounded-xl border border-rose-500/35 bg-rose-950/20 p-3">
              <h3 className="text-sm font-medium text-rose-100">
                {isEn ? "Blocked · not shown on map" : "차단 · 지도에 안 나옴"}
              </h3>
              <p className="mt-1.5 text-caption leading-5 text-sky-100/75">
                {isEn
                  ? "Wrong source labels or demo data — hidden rather than mislabeled."
                  : "출처 오표기·데모 데이터 — 잘못 보여주지 않고 숨깁니다."}
              </p>
              <ul className="mt-2 space-y-2">
                {blocked.map((note) => (
                  <li key={note.layerId} className="text-meta leading-5 text-rose-100/80">
                    <span className="font-medium text-rose-50/95">{note.source}</span>
                    {note.blockedReason ? (
                      <p className="mt-0.5 text-sky-100/60">{note.blockedReason}</p>
                    ) : note.notes ? (
                      <p className="mt-0.5 text-sky-100/60">{note.notes}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {planned.length > 0 ? (
            <section className="rounded-xl border border-slate-700/80 bg-black/15 p-3">
              <h3 className="text-sm font-medium text-slate-300">계획 · 정책만 확정</h3>
              <ul className="mt-2 space-y-2">
                {planned.map((note) => (
                  <li key={note.layerId} className="text-meta leading-5 text-slate-400">
                    <span className="font-medium text-slate-300">{note.source}</span>
                    <span> · {note.attribution}</span>
                    {note.notes ? <p className="mt-0.5">{note.notes}</p> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="text-micro leading-4 text-slate-500">
            상세 체크리스트: 저장소 <code className="text-slate-400">docs/copyright-checklist.md</code>
            . 본 안내는 법률 자문이 아닙니다.
          </p>
        </div>
      </aside>
    </>
  );
}

export function ParchmentLinkButton({ onClick }: { onClick: () => void }) {
  const { lang } = useLocale();
  const en = lang === "en";
  return (
    <HoverHint
      placement="bottom"
      title={en ? "Source parchment" : "출처 양피지"}
      detail={
        en
          ? "Eight bookmarks — honest limits and demo data disclosure"
          : "8개 책갈피 — 재료·한계·데모 데이터 고지"
      }
    >
      <button
        type="button"
        aria-label={en ? "Open source parchment guide" : "데이터 출처 양피지 열기"}
        onClick={onClick}
        className="flex h-10 shrink-0 items-center justify-center rounded-xl border border-amber-200/20 bg-[#3d2a10]/55 px-2.5 text-meta font-medium text-amber-50/90 shadow-lg backdrop-blur-md transition hover:border-amber-200/35 hover:bg-[#4a3518]/65"
      >
        {en ? "Guide" : "양피지"}
      </button>
    </HoverHint>
  );
}

export function SourcesLinkButton({ onClick }: { onClick: () => void }) {
  const { t } = useLocale();
  return (
    <HoverHint placement="bottom" title={t("hoverSources")} detail={t("hoverSourcesHint")}>
      <button
        type="button"
        aria-label={t("hoverSourcesAria")}
        onClick={onClick}
        className="flex h-10 shrink-0 items-center justify-center rounded-xl border border-sky-200/15 bg-[#1e3a5f]/55 px-2.5 text-meta font-medium text-sky-50/90 shadow-lg backdrop-blur-md transition hover:border-sky-200/30 hover:bg-[#254875]/65"
      >
        자료출처
      </button>
    </HoverHint>
  );
}
