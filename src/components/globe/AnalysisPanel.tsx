"use client";

import type { DisputeArea, DisputeOverview, StaticPoint } from "@/data/geoTypes";
import { US_CARRIER_STATUS_COLORS, US_CARRIER_STATUS_LABELS } from "@/data/usCarriers";
import { isFreshEvent, TIER_LABELS } from "@/data/eventTiers";
import { useLocale } from "@/contexts/LocaleContext";
import { getDisputeHatchStyle, isCombatHazard } from "@/lib/disputeHatch";
import {
  disputeCategoryLabel,
  hatchStyleLabelLocalized,
  tensionLabel,
} from "@/lib/hoverLabels";
import { milAircraftIconSvg } from "@/lib/milAircraftIcon";
import { classifyMilAircraft, milAircraftRoleLabel } from "@/lib/milAircraftKind";
import { aisDisplayTypeLabel } from "@/lib/aisVesselClass";
import { ukraineControlStatusLabel } from "@/lib/ukraineSettlementLabels";
import type { AnalysisSelection } from "@/components/globe/types";
import { Metric } from "@/components/globe/Metric";
import { formatDateTime, hostFromUrl } from "@/components/globe/formatters";
import {
  reconCountryLabel,
  reconDisclaimer,
  reconSensorLabel,
} from "@/lib/reconSatellites";
import { reconCountryAccent } from "@/lib/reconSatellitePropagate";
import { LogisticsStressCard } from "@/components/LogisticsStressCard";
import { CountryEconomicRiskCard } from "@/components/CountryEconomicRiskCard";
import { stressForChokepoint, type ChokepointAisObservation } from "@/lib/chokepointStressForUi";
import type { UkmtoIncidentPoint } from "@/lib/ukmtoHatch";
import type { LabelLanguage } from "@/lib/layerPrefs";

function chokepointTitle(point: StaticPoint, lang: LabelLanguage): string {
  if (lang === "en") {
    const en = point.meta?.nameEn;
    return typeof en === "string" && en.trim() ? en : point.name;
  }
  return point.name;
}

function formatViinaDate(value: string | null | undefined) {
  if (!value || !/^\d{8}$/.test(value)) return value || "N/A";
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function hatchStyleLabel(style: string, dispute?: DisputeArea, lang: "ko" | "en" = "ko") {
  return hatchStyleLabelLocalized(style, lang, Boolean(dispute && isCombatHazard(dispute)));
}

function getTensionLabel(tension: DisputeArea["tension"], lang: "ko" | "en" = "ko") {
  return tensionLabel(tension, lang);
}

function formatCategories(categories: DisputeArea["categories"], lang: "ko" | "en" = "ko") {
  return categories.map((category) => disputeCategoryLabel(category, lang)).join(" · ");
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="break-words text-slate-200">{value}</dd>
    </div>
  );
}

function PanelHeader({
  eyebrow,
  title,
  badge,
  onClose,
}: {
  eyebrow: string;
  title: string;
  badge: string;
  onClose?: () => void;
}) {
  const { t } = useLocale();
  return (
    <header className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-[0.32em] text-sky-300/80">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-50">{title}</h2>
        <span className="mt-3 inline-flex rounded-full border border-sky-300/30 bg-sky-300/10 px-3 py-1 text-xs text-sky-100">
          {badge}
        </span>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={t("ariaCloseInfoPanel")}
          className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-400 transition hover:border-slate-500 hover:text-slate-100"
        >
          ✕
        </button>
      )}
    </header>
  );
}

export function AnalysisPanel({
  selection,
  onClose,
  ukraineControlDate,
  ukraineRuCellCount,
  disputeOverview,
  ukmtoIncidents = [],
  aisByChokeId = {},
}: {
  selection: AnalysisSelection;
  onClose: () => void;
  ukraineControlDate?: string | null;
  ukraineRuCellCount?: number;
  disputeOverview?: DisputeOverview | null;
  /** 초크포인트 물류 스트레스 A급 신호 */
  ukmtoIncidents?: UkmtoIncidentPoint[];
  /** PortWatch B급 통과량 관측 */
  aisByChokeId?: Record<string, ChokepointAisObservation>;
}) {
  const { lang } = useLocale();
  if (selection.kind === "chokepoint") {
    const point = selection.item;
    const labelLang: LabelLanguage = lang === "en" ? "en" : "ko";
    const title = chokepointTitle(point, labelLang);
    const stress = stressForChokepoint(
      point,
      ukmtoIncidents,
      aisByChokeId[point.id] ?? null,
    );
    const riskNote = point.meta?.riskNote;
    const throughput = point.meta?.throughput;
    const relatedTickers = point.meta?.relatedTickers;
    return (
      <div className="flex flex-col gap-4">
        <PanelHeader
          eyebrow={labelLang === "en" ? "Maritime chokepoint" : "해상 초크포인트"}
          title={title}
          badge={labelLang === "en" ? "Logistics stress" : "물류 스트레스"}
          onClose={onClose}
        />
        <LogisticsStressCard title={title} stress={stress} lang={labelLang} />
        {(typeof riskNote === "string" && riskNote) ||
        (typeof throughput === "string" && throughput) ||
        (typeof relatedTickers === "string" && relatedTickers) ? (
          <section className="rounded-xl border border-slate-800 bg-black/25 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              {labelLang === "en" ? "Atlas note" : "아틀라스 메모"}
            </p>
            <dl className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
              {typeof riskNote === "string" && riskNote ? (
                <MetaRow
                  label={labelLang === "en" ? "Risk" : "리스크"}
                  value={riskNote}
                />
              ) : null}
              {typeof throughput === "string" && throughput ? (
                <MetaRow
                  label={labelLang === "en" ? "Throughput" : "통항"}
                  value={throughput}
                />
              ) : null}
              {typeof relatedTickers === "string" && relatedTickers ? (
                <MetaRow
                  label={labelLang === "en" ? "Related" : "관련 티커"}
                  value={relatedTickers}
                />
              ) : null}
            </dl>
          </section>
        ) : null}
      </div>
    );
  }
  if (selection.kind === "country") {
    const country = selection.item;
    const labelLang: LabelLanguage = lang === "en" ? "en" : "ko";
    return (
      <div className="flex flex-col gap-4">
        <PanelHeader
          eyebrow="Natural Earth Country"
          title={country.name}
          badge={country.isoA3 || "ISO 없음"}
          onClose={onClose}
        />
        <section className="grid grid-cols-2 gap-3">
          <Metric label="대륙" value={country.continent || "N/A"} />
          <Metric label="인구" value={country.population?.toLocaleString() || "N/A"} />
          <Metric label="Lat" value={country.center.lat.toString()} />
          <Metric label="Lng" value={country.center.lng.toString()} />
        </section>
        <CountryEconomicRiskCard iso3={country.isoA3} lang={labelLang} />
        <section className="rounded-xl border border-slate-800 bg-black/25 p-4 text-sm leading-6 text-slate-300">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">원본 이름</p>
          <p className="mt-3">{country.nameLong}</p>
        </section>
      </div>
    );
  }

  if (selection.kind === "us-carrier") {
    const carrier = selection.item;
    const statusColor = US_CARRIER_STATUS_COLORS[carrier.status];
    const operational = carrier.status === "deployed";
    return (
      <div className="flex flex-col gap-4">
        <PanelHeader
          eyebrow="US Navy Carrier"
          title={carrier.name}
          badge={carrier.hull}
          onClose={onClose}
        />
        <section
          className="rounded-xl border p-4"
          style={{
            borderColor: `${statusColor}66`,
            backgroundColor: `${statusColor}14`,
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-300/80">상태</p>
            {operational ? (
              <span className="rounded-full border border-red-400/40 bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-100">
                작전중
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm font-medium text-slate-100">
            {US_CARRIER_STATUS_LABELS[carrier.status]}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">{carrier.location}</p>
        </section>
        <section className="grid grid-cols-2 gap-3">
          <Metric label="Air Wing" value={carrier.airwing} />
          <Metric label="Lat" value={carrier.lat.toFixed(2)} />
          <Metric label="Lng" value={carrier.lng.toFixed(2)} />
        </section>
        <section className="rounded-xl border border-slate-800 bg-black/25 p-4 text-sm leading-6 text-slate-300">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Notes</p>
          <p className="mt-3">{carrier.notes}</p>
        </section>
      </div>
    );
  }

  if (selection.kind === "recon-sat") {
    const sat = selection.item;
    const langKey = lang === "en" ? "en" : "ko";
    const accent = reconCountryAccent(sat.country);
    const country = reconCountryLabel(sat.country, langKey);
    const sensor = reconSensorLabel(sat.sensor, langKey);
    const family = langKey === "en" ? sat.familyEn : sat.familyKo;
    return (
      <div className="flex flex-col gap-4">
        <PanelHeader
          eyebrow={langKey === "en" ? "Recon / surveillance sat" : "정찰·감시 위성"}
          title={sat.name}
          badge={`${country} · ${sensor}`}
          onClose={onClose}
        />
        <section
          className="rounded-xl border p-4"
          style={{ borderColor: `${accent}55`, backgroundColor: `${accent}12` }}
        >
          <p className="text-xs uppercase tracking-[0.24em] text-slate-300/80">
            {langKey === "en" ? "Family (inferred)" : "계열(추정)"}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-100">{family}</p>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {langKey === "en"
              ? "Passing overhead → theoretical horizon footprint (not an imaging tasking)."
              : "이 상공을 지남 → 이론상 가시권(촬영 임무가 아님)."}
          </p>
        </section>
        <section className="grid grid-cols-2 gap-3">
          <Metric label={langKey === "en" ? "Altitude" : "고도"} value={`${sat.altKm.toFixed(0)} km`} />
          <Metric label={langKey === "en" ? "Horizon≈" : "가시권≈"} value={`${sat.horizonDeg.toFixed(1)}°`} />
          <Metric label="Lat" value={sat.lat.toFixed(2)} />
          <Metric label="Lng" value={sat.lng.toFixed(2)} />
        </section>
        <section className="rounded-xl border border-amber-500/25 bg-amber-950/20 p-4 text-[12px] leading-5 text-amber-50/90">
          {reconDisclaimer(langKey)}
        </section>
        <p className="text-[10px] leading-4 text-slate-500">
          Orbital elements: CelesTrak (T.S. Kelso) · SGP4 in-browser
        </p>
      </div>
    );
  }

  if (selection.kind === "ukraine-control") {
    const zone = selection.item;
    return (
      <div className="flex flex-col gap-4">
        <PanelHeader
          eyebrow="VIINA Territorial Control"
          title={zone.name}
          badge={ukraineControlStatusLabel(zone.controlStatus)}
          onClose={onClose}
        />
        <section className="rounded-xl border border-red-900/50 bg-red-950/20 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-red-200/70">전황 설명</p>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            VIINA 거주지 단위 영토 통제 데이터입니다. 화면 렌더링 전용이며 원본 데이터는 공개 API로
            제공되지 않습니다 (ODbL Produced Work).
          </p>
        </section>
        <section className="grid grid-cols-2 gap-3">
          <Metric label="RU 셀" value={`${(ukraineRuCellCount ?? 0).toLocaleString()}곳`} />
          <Metric label="기준일" value={formatViinaDate(ukraineControlDate ?? null)} />
          <Metric label="Lat" value={zone.center.lat.toFixed(2)} />
          <Metric label="Lng" value={zone.center.lng.toFixed(2)} />
        </section>
      </div>
    );
  }

  if (selection.kind === "dispute") {
    const area = selection.item;
    return (
      <div className="flex flex-col gap-4">
        <PanelHeader
          eyebrow="Natural Earth Disputed Area"
          title={area.name}
          badge={formatCategories(area.categories)}
          onClose={onClose}
        />
        {disputeOverview?.overviewKo && (
          <section className="rounded-xl border border-amber-900/35 bg-amber-950/15 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-amber-200/70">지역 개요</p>
            <p className="mt-3 text-sm leading-6 text-slate-200">{disputeOverview.overviewKo}</p>
            {disputeOverview.parties.length > 0 && (
              <p className="mt-3 text-xs text-slate-400">
                관련 당사자: {disputeOverview.parties.join(" · ")}
              </p>
            )}
            {disputeOverview.updatedAt && (
              <p className="mt-1 text-[10px] text-slate-500">갱신 {disputeOverview.updatedAt}</p>
            )}
          </section>
        )}
        <section className="rounded-xl border border-slate-800 bg-black/25 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
            {disputeOverview ? "원본 메모" : "설명"}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {area.note || "Natural Earth 원본에 별도 메모가 없습니다."}
          </p>
        </section>
        <section className="grid grid-cols-2 gap-3">
          <Metric label="긴장도" value={getTensionLabel(area.tension)} />
          <Metric
            label="빗금 패턴"
            value={hatchStyleLabel(getDisputeHatchStyle(area), area)}
          />
          <Metric label="GDELT 매칭" value={`${area.matchedEventCount}건`} />
          <Metric label="관리 주체" value={area.admin || "N/A"} />
        </section>
        <p className="mt-auto text-xs leading-5 text-slate-500">
          빗금 박스에 마우스를 올리면 요약을, 클릭하면 이 패널을 볼 수 있습니다. 색·패턴 의미는 지도 하단 범례를 참고하세요.
        </p>
      </div>
    );
  }

  if (selection.kind === "conflict-zone") {
    const zone = selection.item;
    return (
      <div className="flex flex-col gap-4">
        <PanelHeader
          eyebrow="AI War Zone (Demo)"
          title={zone.name}
          badge={getTensionLabel(zone.tension)}
          onClose={onClose}
        />
        <section className="rounded-xl border border-red-900/35 bg-red-950/15 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-red-200/70">AI 전쟁지역 (데모)</p>
          <p className="mt-3 text-sm leading-6 text-slate-200">
            {zone.aiSummary ||
              "외부 AI API 없음 · 분쟁 구역 + GDELT 전투 뉴스 밀도 휴리스틱 데모입니다."}
          </p>
        </section>
        <section className="grid grid-cols-2 gap-3">
          <Metric label="긴장도" value={getTensionLabel(zone.tension)} />
          <Metric
            label="AI 신뢰도"
            value={typeof zone.aiScore === "number" ? `${zone.aiScore}%` : "데모"}
          />
          <Metric label="이벤트" value={`${zone.eventCount.toLocaleString()}건`} />
          <Metric label="탐지" value={zone.detectedBy === "ai-demo" ? "로컬 휴리스틱" : "—"} />
          <Metric label="Lat" value={zone.center.lat.toFixed(2)} />
          <Metric label="Lng" value={zone.center.lng.toFixed(2)} />
        </section>
      </div>
    );
  }

  if (selection.kind === "ais") {
    const vessel = selection.item;
    const categoryLabel =
      vessel.category === "military"
        ? "군용"
        : vessel.category === "commercial"
          ? "민간"
          : "기타";
    const typeLabel =
      aisDisplayTypeLabel(vessel, lang) ||
      vessel.shipTypeLabel ||
      (vessel.shipType != null ? String(vessel.shipType) : "N/A");
    return (
      <div className="flex flex-col gap-4">
        <PanelHeader
          eyebrow={`AIS · ${categoryLabel}`}
          title={vessel.shipName || `MMSI ${vessel.mmsi}`}
          badge={typeLabel || "AIS"}
          onClose={onClose}
        />
        <section className="grid grid-cols-2 gap-3">
          <Metric label="MMSI" value={vessel.mmsi} />
          <Metric label="유형" value={typeLabel} />
          <Metric
            label="SOG"
            value={vessel.speedOverGround === null ? "N/A" : `${vessel.speedOverGround} kn`}
          />
          <Metric
            label="COG"
            value={vessel.courseOverGround === null ? "N/A" : vessel.courseOverGround.toString()}
          />
          <Metric
            label="Heading"
            value={vessel.trueHeading === null ? "N/A" : vessel.trueHeading.toString()}
          />
          <Metric label="구분" value={categoryLabel} />
        </section>
        <section className="rounded-xl border border-slate-800 bg-black/25 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">실시간 위치</p>
          <dl className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
            <MetaRow label="좌표" value={`${vessel.lat}, ${vessel.lng}`} />
            <MetaRow label="수신 시각" value={vessel.timestamp || "N/A"} />
          </dl>
        </section>
        <p className="mt-auto text-xs leading-5 text-slate-500">
          출처: MarineTraffic · AIS. 지정학 창은 군용, 지경학 창은 민간(화물·탱커·여객)을 표시합니다.
        </p>
      </div>
    );
  }

  if (selection.kind === "mil") {
    const ac = selection.item;
    const kind = classifyMilAircraft(ac);
    const isCivil = selection.traffic === "civil";
    const fmt = (v: number | null | undefined, suffix = "") =>
      v == null || !Number.isFinite(v) ? "N/A" : `${v}${suffix}`;
    const flags = ac.dbFlags ?? 0;
    const flagBits = [
      (flags & 1) === 1 ? "military" : null,
      (flags & 2) === 2 ? "interesting" : null,
      (flags & 4) === 4 ? "PIA" : null,
      (flags & 8) === 8 ? "LADD" : null,
    ].filter(Boolean);
    return (
      <div className="flex flex-col gap-4">
        <PanelHeader
          eyebrow={isCivil ? "ADS-B Civilian" : "ADS-B Military"}
          title={ac.callsign || ac.hex.toUpperCase()}
          badge={milAircraftRoleLabel(kind, "ko")}
          onClose={onClose}
        />
        <section
          className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm text-slate-200 ${
            isCivil
              ? "border-sky-500/30 bg-sky-950/20"
              : "border-red-500/30 bg-red-950/20"
          }`}
        >
          <span
            className="inline-block shrink-0"
            style={{ width: 36, height: 36 }}
            dangerouslySetInnerHTML={{
              __html: milAircraftIconSvg(kind.role, { width: 36, height: 36 }, {
                palette: isCivil ? "civil" : "military",
              }),
            }}
          />
          <span>
            {milAircraftRoleLabel(kind, "ko")}
            {ac.type ? ` · ${ac.type}` : ""}
            <span className="mt-0.5 block text-[10px] text-slate-500">
              {isCivil
                ? "민간 운항 · 군용(dbFlags&1) 제외 · 출처 ADS-B"
                : "탑다운 실루엣 · 출처 ADS-B"}
            </span>
          </span>
        </section>
        {ac.emergency ? (
          <section className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100">
            Emergency: {ac.emergency}
          </section>
        ) : null}
        {ac.acasAdvisory ? (
          <section className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
            ACAS RA: {ac.acasAdvisory}
          </section>
        ) : null}
        <section className="grid grid-cols-2 gap-3">
          <Metric label="ICAO hex" value={ac.hex.toUpperCase()} />
          <Metric label="등록" value={ac.registration || "N/A"} />
          <Metric label="기종 (t)" value={ac.type || "N/A"} />
          <Metric label="Category" value={ac.category || "N/A"} />
          <Metric label="고도 baro" value={fmt(ac.altitude, " ft")} />
          <Metric label="고도 geom" value={fmt(ac.altitudeGeom, " ft")} />
          <Metric label="GS" value={fmt(ac.groundSpeed, " kn")} />
          <Metric label="IAS" value={fmt(ac.indicatedAirspeed, " kn")} />
          <Metric label="TAS" value={fmt(ac.trueAirspeed, " kn")} />
          <Metric label="Mach" value={fmt(ac.mach)} />
          <Metric label="Track" value={fmt(ac.track != null ? Math.round(ac.track) : null, "°")} />
          <Metric
            label="True HDG"
            value={fmt(ac.trueHeading != null ? Math.round(ac.trueHeading) : null, "°")}
          />
          <Metric
            label="Mag HDG"
            value={fmt(ac.magHeading != null ? Math.round(ac.magHeading) : null, "°")}
          />
          <Metric label="수직속도" value={fmt(ac.baroRate, " fpm")} />
          <Metric label="스쿼크" value={ac.squawk || "N/A"} />
          <Metric
            label="Wind"
            value={
              ac.windSpeed != null
                ? `${ac.windSpeed} kn @ ${ac.windDirection ?? "?"}°`
                : "N/A"
            }
          />
        </section>
        <section className="rounded-xl border border-slate-800 bg-black/25 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">상세</p>
          <dl className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
            <MetaRow label="좌표" value={`${ac.lat.toFixed(4)}, ${ac.lng.toFixed(4)}`} />
            <MetaRow
              label="dbFlags"
              value={flagBits.length ? flagBits.join(", ") : String(ac.dbFlags ?? "N/A")}
            />
            <MetaRow label="Nav MCP alt" value={fmt(ac.navAltitudeMcp, " ft")} />
            <MetaRow
              label="Nav modes"
              value={ac.navModes?.length ? ac.navModes.join(", ") : "N/A"}
            />
            <MetaRow label="Seen" value={ac.seen != null ? `${ac.seen.toFixed(1)} s` : "N/A"} />
            <MetaRow
              label="Seen pos"
              value={ac.seenPos != null ? `${ac.seenPos.toFixed(1)} s` : "N/A"}
            />
            <MetaRow label="RSSI" value={fmt(ac.rssi)} />
            <MetaRow label="수신" value={ac.timestamp || "N/A"} />
          </dl>
        </section>
      </div>
    );
  }

  if (selection.kind !== "event") return null;

  const event = selection.item;
  const tier = event.eventTier ? TIER_LABELS[event.eventTier] : "미분류";
  const fresh = isFreshEvent(event);

  return (
    <div className="flex flex-col gap-4">
      <PanelHeader
        eyebrow={tier}
        title={`Event ${event.globalEventId}`}
        badge={fresh ? "최신 속보" : tier}
        onClose={onClose}
      />
      <section className="grid grid-cols-2 gap-3">
        <Metric label="분류" value={tier} />
        <Metric label="Event Date" value={event.eventDate || "N/A"} />
        <Metric label="Country" value={event.country || "N/A"} />
        <Metric label="Goldstein" value={event.goldsteinScale?.toString() || "N/A"} />
      </section>
      <section className="rounded-xl border border-slate-800 bg-black/25 p-4">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">실제 이벤트 메타데이터</p>
        <dl className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
          <MetaRow label="좌표" value={`${event.lat}, ${event.lng}`} />
          <MetaRow label="카테고리" value={event.category} />
          {(event.actor1Country || event.actor2Country) && (
            <MetaRow
              label="행위자"
              value={`${event.actor1Country || "?"} ↔ ${event.actor2Country || "?"}`}
            />
          )}
          <MetaRow label="수집 시각" value={event.createdAt ? formatDateTime(event.createdAt) : "N/A"} />
          <MetaRow label="출처 호스트" value={hostFromUrl(event.sourceUrl)} />
        </dl>
      </section>
      <section className="rounded-xl border border-slate-800 bg-black/25 p-4">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">원문 링크</p>
        {event.sourceUrl ? (
          <a
            href={event.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block break-all rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm leading-6 text-emerald-200 transition hover:border-emerald-300/50"
          >
            {event.sourceUrl}
          </a>
        ) : (
          <p className="mt-3 text-sm text-slate-500">GDELT 이벤트에 source URL이 없습니다.</p>
        )}
      </section>
      <p className="mt-auto text-xs leading-5 text-slate-500">
        mock AI 요약은 제거했습니다. 실제 3줄 요약은 화이트리스트 뉴스/LLM 파이프라인을 붙인 뒤 다시 추가하는 영역입니다.
      </p>
    </div>
  );
}
