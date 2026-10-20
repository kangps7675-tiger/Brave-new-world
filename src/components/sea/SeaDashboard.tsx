"use client";

/**
 * 첫 화면 — "이 바다는 지금 다닐 만한가".
 *
 * 해역 하나를 고르면 한 흐름으로 본다:
 *   피격 선박(확인/유력) → 해상 속보 → 항행경보 → 보험료 → 해상 기상 → 통항량 → 뉴스
 *   (흑해: + 러시아·우크라이나 에너지·항만 시설 피격, 우크라이나 전쟁 동향 탭)
 * 왼쪽 지구본은 maplibre, 사건 하나를 깊게 볼 때는 세슘 위성 화면.
 */

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection } from "geojson";
import { SeaGlobe, type SeaGlobeHandle, type SeaGlobeSelection } from "@/components/sea/SeaGlobe";
import { StrikeCard, latestQuoteByRegion, type Quote, type Strike } from "@/components/strikes/StrikesClient";
import { EmailDigestSignup } from "@/components/globe/EmailDigestSignup";
import { ENERGY_FACILITY_KIND_KO } from "@/data/energyFacilities";
import type { AisVessel, FirmsFire, MilitaryAircraft } from "@/data/geoTypes";
import { energyStrikesFrom, ukraineWarEvents, type EnergyStrike } from "@/lib/sea/energyStrikes";
import { rankNewsForRegion } from "@/lib/sea/newsRelevance";
import { DEFAULT_SEA_REGION, SEA_REGIONS, getSeaRegion, seaRegionAt, type SeaRegionId } from "@/lib/sea/regions";
import { liveuaConfirmedStrike } from "@/lib/liveuamap/confirmedStrike";
import type { LiveuamapEvent, LiveuamapFeedPayload } from "@/lib/liveuamap/types";
import type { NewsStreamItem, NewsStreamPayload } from "@/lib/news/types";
import { parseNavareaApiPayload } from "@/lib/navareaHatch";
import type { UkmtoIncidentPoint } from "@/lib/ukmtoHatch";
import type { SeaCesiumPick } from "@/components/sea/SeaCesiumView";
import { SEA_BLOC_COLOR, SEA_BLOC_LABEL, paintBlocPolygons, type SeaBloc } from "@/lib/sea/blocPolygons";
import { StackItemParchment } from "@/components/globe/StackItemParchment";
import { flamesFromLiveua, mergeStrikeFlames } from "@/lib/strikeFlames";
import { buildWarCountryFeatures, warCountryIsos } from "@/lib/warCountries";
import { calloutFromStackItem, type EventCallout } from "@/lib/eventCallout";
import { stackItemFromLiveua, stackItemFromUkmto, type StackItem } from "@/lib/incidentStack/build";

const SeaCesiumView = dynamic(
  () => import("@/components/sea/SeaCesiumView").then((m) => m.SeaCesiumView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-black text-sm text-sky-100/70">
        위성 화면 불러오는 중…
      </div>
    ),
  },
);

const REFRESH_MS = 5 * 60_000;

type MarineRow = {
  pointId: string;
  nameKo: string;
  region: string;
  fhour: number;
  validTime: string;
  hsM: number | null;
  periodS: number | null;
  windMs: number | null;
  swellM: number | null;
  seaStateKo: string;
  beaufort: number | null;
};

type MarinePayload = { forecast?: MarineRow[]; attribution?: string; disclaimer?: string };

type Transit = { recentAvg: number; baselineAvg: number; changePct: number | null; latestDate: string | null };

type PortwatchPayload = { transits?: Record<string, Transit>; attribution?: string };

const MARITIME_RE =
  /ship|vessel|tanker|cargo|boat|port|harbou?r|navy|naval|frigate|sea drone|usv|maritime|strait|선박|유조선|화물선|항구|항만|해군|함정|해상|무인정|해협/i;

async function getJson<T>(url: string): Promise<T | null> {
  try {
    // 응답이 안 오는 요청 하나가 화면 전체를 "불러오는 중"에 붙잡지 않게 20초에서 끊는다
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20_000);
    try {
      const r = await fetch(url, { signal: ctl.signal });
      if (!r.ok) return null;
      return (await r.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return "시각 미상";
  return `${iso.slice(5, 10)} ${iso.slice(11, 16)} UTC`;
}

function navareaLatLng(f: FeatureCollection["features"][number]): { lat: number; lng: number } | null {
  const p = f.properties as { lat?: number | null; lng?: number | null } | null;
  if (p && typeof p.lat === "number" && typeof p.lng === "number") return { lat: p.lat, lng: p.lng };
  const g = f.geometry;
  if (g?.type === "Point") return { lat: g.coordinates[1], lng: g.coordinates[0] };
  if (g?.type === "Polygon") return { lat: g.coordinates[0][0][1], lng: g.coordinates[0][0][0] };
  if (g?.type === "LineString") return { lat: g.coordinates[0][1], lng: g.coordinates[0][0] };
  return null;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-white/10 px-4 py-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">{title}</h2>
      {hint ? <p className="mt-1 text-xs text-white/35">{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-white/40">{children}</p>;
}

function EventRow({
  e,
  onLocate,
  badge,
}: {
  e: LiveuamapEvent;
  onLocate: (e: LiveuamapEvent) => void;
  badge?: React.ReactNode;
}) {
  return (
    <li className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm leading-snug text-white/85">{e.titleKo || e.title}</p>
        {badge}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-white/40">
        <span>{fmtWhen(e.publishedAt)}</span>
        <button type="button" onClick={() => onLocate(e)} className="underline underline-offset-4 hover:text-white">
          위치
        </button>
        <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-white">
          출처
        </a>
      </div>
    </li>
  );
}

function EnergyRow({ s, onLocate }: { s: EnergyStrike; onLocate: (e: LiveuamapEvent) => void }) {
  const f = s.facility;
  return (
    <li className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-white/45">
            {f ? `${f.country === "RU" ? "러시아" : "우크라이나"} · ${ENERGY_FACILITY_KIND_KO[f.kind]} · ${f.coastal ? "해안" : "내륙"}` : "시설 미상"}
            {f?.occupied ? " · 점령지" : ""}
          </p>
          <p className="mt-0.5 text-sm font-medium text-white">{f ? f.nameKo : s.event.titleKo || s.event.title}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${
            s.evidence === "firms"
              ? "border-orange-400/50 bg-orange-500/15 text-orange-200"
              : "border-white/15 text-white/50"
          }`}
          title={s.evidence === "firms" ? `시설 반경 안 위성 열점 ${s.firmsHits}개` : "속보만 있음"}
        >
          {s.evidence === "firms" ? "위성 열점 확인" : "보도"}
        </span>
      </div>
      {f ? <p className="mt-1.5 text-sm leading-snug text-white/65">{s.event.titleKo || s.event.title}</p> : null}
      <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-white/40">
        <span>{fmtWhen(s.event.publishedAt)}</span>
        <button type="button" onClick={() => onLocate(s.event)} className="underline underline-offset-4 hover:text-white">
          위치
        </button>
        <a href={s.event.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-white">
          출처
        </a>
      </div>
    </li>
  );
}

type SatTarget = { lat: number; lng: number; title: string };

export default function SeaDashboard() {
  const globeRef = useRef<SeaGlobeHandle | null>(null);

  const [regionId, setRegionId] = useState<SeaRegionId>(DEFAULT_SEA_REGION);
  const region = getSeaRegion(regionId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showWar, setShowWar] = useState(false);
  const [sat, setSat] = useState<SatTarget | null>(null);
  const [satPick, setSatPick] = useState<SeaCesiumPick | null>(null);

  const [strikes, setStrikes] = useState<Strike[] | null>(null);
  const [ukmto, setUkmto] = useState<UkmtoIncidentPoint[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [navarea, setNavarea] = useState<FeatureCollection>({ type: "FeatureCollection", features: [] });
  const [liveua, setLiveua] = useState<LiveuamapEvent[]>([]);
  const [fires, setFires] = useState<FirmsFire[]>([]);
  const [news, setNews] = useState<NewsStreamItem[]>([]);
  const [marine, setMarine] = useState<MarinePayload | null>(null);
  const [portwatch, setPortwatch] = useState<PortwatchPayload | null>(null);

  // ── 전역 데이터 (해역 무관) ──────────────────────────────────────
  useEffect(() => {
    let alive = true;
    // 소스마다 따로 받아 오는 대로 채운다 — 가장 느린 소스(뉴스 등)가 피격 카드를 막지 않게.
    const pull = <T,>(url: string, apply: (d: T | null) => void) =>
      void getJson<T>(url).then((d) => {
        if (alive) apply(d);
      });
    const load = () => {
      pull<{ strikes?: Strike[] }>("/api/strikes?days=60&limit=30", (s) =>
        setStrikes(Array.isArray(s?.strikes) ? s!.strikes! : []),
      );
      pull<{ incidents?: UkmtoIncidentPoint[] }>("/api/ukmto", (u) =>
        setUkmto(Array.isArray(u?.incidents) ? u!.incidents! : []),
      );
      pull<{ quotes?: Quote[] }>("/api/war-risk?days=180", (q) => setQuotes(Array.isArray(q?.quotes) ? q!.quotes! : []));
      pull<FeatureCollection>("/api/navarea", (n) => {
        if (n?.type === "FeatureCollection") setNavarea(n);
      });
      pull<LiveuamapFeedPayload>("/api/liveuamap", (l) => setLiveua(Array.isArray(l?.events) ? l!.events : []));
      pull<{ fires?: FirmsFire[] }>("/api/firms-fires?days=2&west=22&south=40&east=70&north=66", (f) =>
        setFires(Array.isArray(f?.fires) ? f!.fires! : []),
      );
      pull<NewsStreamPayload>("/api/news-stream?lang=ko", (ns) =>
        setNews([...(ns?.verified ?? []), ...(ns?.stateMedia ?? [])]),
      );
      pull<PortwatchPayload>("/api/portwatch", (pw) => setPortwatch(pw));
    };
    void load();
    const t = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // ── 폴리곤: LiveUAMap 통제면 + 전쟁 중인 나라 국경 ────────────────────
  const [control, setControl] = useState<FeatureCollection>({ type: "FeatureCollection", features: [] });
  const [warBorders, setWarBorders] = useState<FeatureCollection | null>(null);
  useEffect(() => {
    let alive = true;
    void getJson<FeatureCollection>("/data/war-countries.json").then((d) => {
      if (alive && d?.type === "FeatureCollection") setWarBorders(d);
    });
    const loadControl = () =>
      getJson<FeatureCollection>("/api/control").then((d) => {
        if (alive && d?.type === "FeatureCollection") setControl(d);
      });
    void loadControl();
    const t = setInterval(loadControl, 10 * 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // 진영 국가 면 (CRINK·CSTO·NATO·QUAD·미국 양자조약) — 켜고 끌 수 있다
  const [blocRaw, setBlocRaw] = useState<FeatureCollection | null>(null);
  const [showBlocs, setShowBlocs] = useState(true);
  useEffect(() => {
    let alive = true;
    void getJson<FeatureCollection>("/data/allied-bloc-countries.json").then((d) => {
      if (alive && d?.type === "FeatureCollection") setBlocRaw(d);
    });
    return () => {
      alive = false;
    };
  }, []);
  const blocs = useMemo(() => (showBlocs ? paintBlocPolygons(blocRaw) : paintBlocPolygons(null)), [blocRaw, showBlocs]);

  const warCountries = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: buildWarCountryFeatures(warCountryIsos(liveua), [warBorders]),
    }),
    [liveua, warBorders],
  );

  // 드론·미사일 공습 — 러-우전과 중동 깊숙한 곳을 같은 촛불 불꽃으로, 최근 72시간
  const flames = useMemo(() => {
    const since = Date.now() - 72 * 3_600_000;
    return mergeStrikeFlames([flamesFromLiveua(liveua, true).filter((f) => Date.parse(f.publishedAt) >= since)]);
  }, [liveua]);

  // ── 해역별 기상 ─────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    setMarine(null);
    void getJson<MarinePayload>(`/api/marine-weather?region=${regionId}&historyDays=0`).then((m) => {
      if (alive) setMarine(m);
    });
    return () => {
      alive = false;
    };
  }, [regionId]);

  // ── 파생 ────────────────────────────────────────────────────────
  const strikeStatus = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of strikes ?? []) m[s.incident.id] = s.status;
    return m;
  }, [strikes]);

  const latestByRegion = useMemo(() => latestQuoteByRegion(quotes), [quotes]);

  const energyStrikes = useMemo(() => energyStrikesFrom(liveua, fires), [liveua, fires]);
  const warEvents = useMemo(() => ukraineWarEvents(liveua), [liveua]);

  /** 해상 사건 속보 — 우크라이나 슬롯은 흑해 안 + 선박·항구 단어가 있을 때만 */
  const maritimeEvents = useMemo(
    () =>
      liveua.filter((e) => {
        const r = seaRegionAt(e.lat, e.lng);
        if (!r) return e.regionId === "pirates";
        if (e.regionId !== "ukraine") return true;
        return MARITIME_RE.test(`${e.title} ${e.body} ${e.titleKo ?? ""}`);
      }),
    [liveua],
  );

  const regionStrikes = useMemo(
    () => (strikes ?? []).filter((s) => s.warRiskRegion === regionId),
    [strikes, regionId],
  );
  const regionEvents = useMemo(
    () => maritimeEvents.filter((e) => seaRegionAt(e.lat, e.lng) === regionId).slice(0, 12),
    [maritimeEvents, regionId],
  );
  const regionNavarea = useMemo(
    () =>
      navarea.features
        .filter((f) => {
          const p = navareaLatLng(f);
          return p ? seaRegionAt(p.lat, p.lng) === regionId : false;
        })
        .slice(0, 10),
    [navarea, regionId],
  );
  const regionQuotes = useMemo(
    () => quotes.filter((q) => q.region === regionId && q.ratePct !== null).slice(0, 8),
    [quotes, regionId],
  );
  const rankedNews = useMemo(() => rankNewsForRegion(news, region).slice(0, 20), [news, region]);

  const weatherNow = useMemo(() => {
    const rows = marine?.forecast ?? [];
    const byPoint = new Map<string, { now: MarineRow; max24: number | null }>();
    for (const r of rows) {
      const cur = byPoint.get(r.pointId);
      if (!cur) byPoint.set(r.pointId, { now: r, max24: r.fhour <= 24 ? r.hsM : null });
      else {
        if (r.fhour < cur.now.fhour) cur.now = r;
        if (r.fhour <= 24 && r.hsM !== null) cur.max24 = Math.max(cur.max24 ?? 0, r.hsM);
      }
    }
    return [...byPoint.values()];
  }, [marine]);

  const latestQuote = latestByRegion.get(regionId) ?? null;
  const strikeCount30 = useMemo(() => {
    const since = Date.now() - 30 * 86_400_000;
    return regionStrikes.filter((s) => Date.parse(s.incident.occurredAt) >= since).length;
  }, [regionStrikes]);

  // ── 동작 ────────────────────────────────────────────────────────
  const pickRegion = useCallback((id: SeaRegionId) => {
    setRegionId(id);
    setSelectedId(null);
    const r = getSeaRegion(id);
    globeRef.current?.flyTo(r.center.lat, r.center.lng, r.center.zoom);
  }, []);

  const locate = useCallback((id: string, lat: number, lng: number) => {
    setSelectedId(id);
    const r = seaRegionAt(lat, lng);
    if (r) setRegionId(r);
    globeRef.current?.flyTo(lat, lng, 6.5);
  }, []);

  // 지도에서 사건을 누르면 큰 양피지, 닫으면 그 좌표에 콜아웃이 남는다.
  const [parchment, setParchment] = useState<StackItem | null>(null);
  const [callout, setCallout] = useState<EventCallout | null>(null);

  const onGlobeSelect = useCallback(
    (sel: SeaGlobeSelection) => {
      let item: StackItem | null = null;
      if (sel.type === "ukmto") {
        const u = ukmto.find((x) => x.id === sel.id);
        if (u) {
          locate(u.id, u.lat, u.lng);
          item = stackItemFromUkmto(u, true);
        }
      } else if (sel.type === "liveua" || sel.type === "energy" || sel.type === "flame") {
        const e = liveua.find((x) => x.id === sel.id);
        if (e) {
          locate(e.id, e.lat, e.lng);
          if (e.regionId === "ukraine" && sel.type === "energy") setRegionId("black-sea");
          item = stackItemFromLiveua(e, true);
        }
      }
      if (item) {
        setCallout(null);
        setParchment(item);
      }
    },
    [ukmto, liveua, locate],
  );

  const dismissParchment = useCallback(() => {
    setParchment((cur) => {
      if (cur) setCallout(calloutFromStackItem(cur, "ko"));
      return null;
    });
  }, []);

  // ── 세슘 (사건 하나 깊게 보기) ──────────────────────────────────
  const [satAis, setSatAis] = useState<AisVessel[]>([]);
  const [satAir, setSatAir] = useState<MilitaryAircraft[]>([]);
  useEffect(() => {
    if (!sat) return;
    let alive = true;
    void getJson<{ vessels?: AisVessel[] }>(`/api/ais?lat=${sat.lat}&lng=${sat.lng}&dist=300&max=800`).then(
      (d) => alive && setSatAis(d?.vessels ?? []),
    );
    // ADS-B — 사건 카드 안에서만 (사건 주변 600km 군용기·정찰기)
    void getJson<{ aircraft?: MilitaryAircraft[] }>(`/api/adsb-mil?max=1500`).then((d) => {
      if (!alive) return;
      const near = (d?.aircraft ?? []).filter(
        (a) => Math.abs(a.lat - sat.lat) < 6 && Math.abs(a.lng - sat.lng) < 7,
      );
      setSatAir(near);
    });
    return () => {
      alive = false;
    };
  }, [sat]);

  const satStrikes = useMemo(
    () =>
      liveua
        .map((e) => {
          const k = liveuaConfirmedStrike(e);
          return k ? { id: e.id, lat: e.lat, lng: e.lng, title: e.titleKo || e.title, kind: k.kind, publishedAt: e.publishedAt } : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    [liveua],
  );
  const navareaPoints = useMemo(() => parseNavareaApiPayload(navarea), [navarea]);

  const openSatStrike = useCallback((s: Strike) => {
    setSat({ lat: s.incident.lat, lng: s.incident.lng, title: s.incident.place || s.incident.typeName });
  }, []);

  return (
    <div className="flex h-dvh w-full flex-col bg-black text-white lg:flex-row">
      {/* 지구본 */}
      <div className="relative h-[46dvh] w-full shrink-0 lg:h-full lg:flex-1">
        <SeaGlobe
          ref={globeRef}
          initial={region.center}
          ukmto={ukmto}
          strikeStatus={strikeStatus}
          navarea={navarea}
          maritimeEvents={maritimeEvents}
          energyStrikes={energyStrikes}
          warEvents={warEvents}
          showWar={showWar}
          selectedId={selectedId}
          onSelect={onGlobeSelect}
          control={control}
          blocs={blocs}
          warCountries={warCountries}
          flames={flames}
          callout={callout}
          onCalloutClose={() => setCallout(null)}
        />
        {parchment ? (
          <StackItemParchment
            lang="ko"
            items={[parchment]}
            index={0}
            onIndexChange={() => {}}
            onDismiss={dismissParchment}
            onGoToLocation={(it) => {
              dismissParchment();
              globeRef.current?.flyTo(it.lat, it.lng, 7);
            }}
            onViewSatellite={(it) => {
              setParchment(null);
              setSat({ lat: it.lat, lng: it.lng, title: it.title });
            }}
          />
        ) : null}
        <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs leading-relaxed text-white/60 backdrop-blur">
          <p>
            <span className="text-rose-400">●</span> 피격 확인 <span className="ml-2 text-amber-400">●</span> 유력{" "}
            <span className="ml-2 text-zinc-300">●</span> 미판정
          </p>
          <p>
            <span className="text-sky-400">●</span> 해상 속보 <span className="ml-2 text-orange-400">●</span> 에너지 시설 피격{" "}
            <span className="ml-2 text-purple-400">■</span> 항행경보
          </p>
          <p className="pointer-events-auto mt-1 border-t border-white/10 pt-1">
            <label className="flex cursor-pointer items-center gap-1.5">
              <input type="checkbox" checked={showBlocs} onChange={(e) => setShowBlocs(e.target.checked)} />
              <span>진영 색칠</span>
            </label>
          </p>
          {showBlocs ? (
            <p>
              {(["aukus", "nato", "quad", "us-treaty", "us-base", "crink", "csto"] as SeaBloc[]).map((b) => (
                <span key={b} className="mr-2 inline-block whitespace-nowrap">
                  <span style={{ color: SEA_BLOC_COLOR[b] }}>■</span> {SEA_BLOC_LABEL[b]}
                </span>
              ))}
            </p>
          ) : null}
        </div>

        {sat ? (
          <div className="absolute inset-0 z-20 bg-black">
            <SeaCesiumView
              key={`${sat.lat},${sat.lng}`}
              initial={{ lat: sat.lat, lng: sat.lng, heightM: 450_000 }}
              vessels={satAis}
              aircraft={satAir}
              ukmto={ukmto}
              navarea={navareaPoints}
              strikes={satStrikes}
              fires={fires}
              onPick={setSatPick}
            />
            {satPick ? (
              <div className="absolute bottom-3 left-3 max-w-sm rounded-lg border border-white/15 bg-black/75 px-3 py-2 text-sm backdrop-blur">
                <p className="font-medium text-white">{satPick.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-white/60">{satPick.detail}</p>
              </div>
            ) : null}
            <div className="absolute left-3 top-3 flex items-center gap-3 rounded-lg border border-white/15 bg-black/70 px-3 py-2 text-sm backdrop-blur">
              <span className="text-white/80">{sat.title}</span>
              <span className="text-xs text-white/45">
                주변 선박 {satAis.length} · 군용기 {satAir.length}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSat(null);
                  setSatPick(null);
                }}
                className="rounded border border-white/20 px-2 py-0.5 text-xs text-white/80 hover:bg-white/10"
              >
                ✕ 지구본으로
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* 해역 패널 */}
      <aside className="flex min-h-0 w-full flex-1 flex-col border-white/10 lg:h-full lg:w-[440px] lg:flex-none lg:border-l">
        <header className="px-4 pb-3 pt-4">
          <p className="text-xs tracking-wider text-white/40">BRAVE NEW WORLD · 해역 위험</p>
          <h1 className="mt-1 text-lg font-semibold">이 바다는 지금 다닐 만한가</h1>
          <nav className="mt-3 flex flex-wrap gap-1.5">
            {SEA_REGIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => pickRegion(r.id)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  r.id === regionId ? "border-white/60 bg-white/15 text-white" : "border-white/15 text-white/55 hover:text-white"
                }`}
              >
                {r.nameKo}
              </button>
            ))}
          </nav>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2">
              <p className="text-xs text-white/40">30일 피격</p>
              <p className="text-base font-semibold tabular-nums">{strikes === null ? "…" : `${strikeCount30}건`}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2">
              <p className="text-xs text-white/40">보험료(보도)</p>
              <p className="text-base font-semibold tabular-nums">
                {latestQuote
                  ? latestQuote.rateHighPct !== null
                    ? `${latestQuote.ratePct}–${latestQuote.rateHighPct}%`
                    : `${latestQuote.ratePct}%`
                  : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2">
              <p className="text-xs text-white/40">최대 파고 24h</p>
              <p className="text-base font-semibold tabular-nums">
                {weatherNow.length
                  ? `${Math.max(...weatherNow.map((w) => w.max24 ?? w.now.hsM ?? 0)).toFixed(1)}m`
                  : "—"}
              </p>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <Section title="피격 선박" hint="UKMTO 경보 × AIS 항적. 선명 일치 = 확인, 정황이 하나로 좁혀짐 = 유력.">
            {strikes === null ? (
              <Empty>불러오는 중…</Empty>
            ) : regionStrikes.length === 0 ? (
              <Empty>최근 60일 이 해역 피격 경보 없음.</Empty>
            ) : (
              <div className="space-y-3">
                {regionStrikes.map((s) => (
                  <StrikeCard
                    key={s.incident.id}
                    s={s}
                    latestQuote={latestByRegion.get(s.warRiskRegion) ?? null}
                    selected={selectedId === s.incident.id}
                    onLocate={(x) => locate(x.incident.id, x.incident.lat, x.incident.lng)}
                    onSatellite={openSatStrike}
                  />
                ))}
              </div>
            )}
          </Section>

          {regionId === "black-sea" ? (
            <Section
              title="에너지·항만 시설 피격"
              hint="러시아 정유소·저장소·펌프장·수출터미널, 우크라이나 정유·가스·항구·철도. 위성 열점(NASA FIRMS)이 시설 반경 안에 잡히면 '위성 열점 확인'."
            >
              {energyStrikes.length === 0 ? (
                <Empty>최근 속보에서 시설 피격이 잡히지 않았음.</Empty>
              ) : (
                <ul className="space-y-2">
                  {energyStrikes.slice(0, 15).map((s) => (
                    <EnergyRow key={s.id} s={s} onLocate={(e) => locate(e.id, e.lat, e.lng)} />
                  ))}
                </ul>
              )}
            </Section>
          ) : null}

          <Section title="해상 속보" hint="LiveUAMap 해역 슬롯. 사건 좌표가 이 해역 안인 것만.">
            {regionEvents.length === 0 ? (
              <Empty>최근 해상 속보 없음.</Empty>
            ) : (
              <ul className="space-y-2">
                {regionEvents.map((e) => (
                  <EventRow
                    key={e.id}
                    e={e}
                    onLocate={(x) => locate(x.id, x.lat, x.lng)}
                    badge={
                      <button
                        type="button"
                        onClick={() => setSat({ lat: e.lat, lng: e.lng, title: e.titleKo || e.title })}
                        className="shrink-0 text-xs text-sky-200/80 underline underline-offset-4 hover:text-white"
                      >
                        위성
                      </button>
                    }
                  />
                ))}
              </ul>
            )}
          </Section>

          <Section title="항행경보" hint="NGA NAVAREA 경보 중 이 해역에 걸친 것.">
            {regionNavarea.length === 0 ? (
              <Empty>유효한 항행경보 없음.</Empty>
            ) : (
              <ul className="space-y-2">
                {regionNavarea.map((f) => {
                  const p = f.properties as { id: string; region: string; date: string; description: string; areaHint: string };
                  return (
                    <li key={p.id} className="rounded-lg border border-purple-400/20 bg-purple-500/[0.06] p-3">
                      <p className="text-xs text-purple-200/70">
                        NAVAREA {p.region} · {p.date?.slice(0, 10)} {p.areaHint ? `· ${p.areaHint}` : ""}
                      </p>
                      <p className="mt-1 line-clamp-3 text-sm leading-snug text-white/70">{p.description}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section title="전쟁위험 보험료" hint="공개 시세가 없어 해운·보험 매체 보도에서 뽑은 값. 선가 대비 %.">
            {regionQuotes.length === 0 ? (
              <Empty>최근 180일 보도된 수치 없음.</Empty>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {regionQuotes.map((q) => (
                  <li key={q.url} className="flex items-baseline justify-between gap-3">
                    <span className="tabular-nums text-white">
                      {q.rateHighPct !== null ? `${q.ratePct}–${q.rateHighPct}%` : `${q.ratePct}%`}
                      {q.confidence !== "strong" ? <span className="ml-1 text-xs text-white/35">(추정)</span> : null}
                    </span>
                    <a
                      href={q.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-xs text-white/45 underline underline-offset-4 hover:text-white"
                    >
                      {q.publishedAt?.slice(0, 10) ?? "날짜 미상"} · {q.outlet ?? "기사"}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <Link href={region.page} className="mt-3 inline-block text-xs text-white/45 underline underline-offset-4 hover:text-white">
              해역 문서·추이 보기
            </Link>
          </Section>

          <Section title="해상 기상" hint={marine?.disclaimer}>
            {marine === null ? (
              <Empty>불러오는 중…</Empty>
            ) : weatherNow.length === 0 ? (
              <Empty>이 해역 기상 자료 없음{regionId === "black-sea" ? " (흑해는 전구 모델이 해상 격자로 잡지 않음 — 다른 소스 필요)" : ""}.</Empty>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-white/40">
                    <th className="pb-1 font-normal">지점</th>
                    <th className="pb-1 font-normal">파고</th>
                    <th className="pb-1 font-normal">24h 최대</th>
                    <th className="pb-1 font-normal">바람</th>
                  </tr>
                </thead>
                <tbody>
                  {weatherNow.map(({ now, max24 }) => (
                    <tr key={now.pointId} className="border-t border-white/5">
                      <td className="py-1.5 text-white/75">{now.nameKo}</td>
                      <td className="py-1.5 tabular-nums">
                        {now.hsM !== null ? `${now.hsM.toFixed(1)}m` : "—"}
                        <span className="ml-1 text-xs text-white/40">{now.seaStateKo}</span>
                      </td>
                      <td className="py-1.5 tabular-nums">{max24 !== null ? `${max24.toFixed(1)}m` : "—"}</td>
                      <td className="py-1.5 tabular-nums">{now.windMs !== null ? `${now.windMs.toFixed(0)}m/s` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {marine?.attribution ? <p className="mt-2 text-xs text-white/30">{marine.attribution}</p> : null}
          </Section>

          <Section title="통항량 변화" hint="IMF PortWatch 일일 통과 선박 수 — 최근 7일 평균 vs 30일 기준선.">
            <ul className="space-y-1.5 text-sm">
              {region.chokepoints.map((c) => {
                const t = portwatch?.transits?.[c.id];
                return (
                  <li key={c.id} className="flex items-baseline justify-between gap-3">
                    <span className="text-white/75">{c.nameKo}</span>
                    {t && t.changePct !== null ? (
                      <span className="tabular-nums">
                        <span className={t.changePct < -10 ? "text-rose-300" : t.changePct > 10 ? "text-emerald-300" : "text-white"}>
                          {t.changePct > 0 ? "+" : ""}
                          {t.changePct.toFixed(0)}%
                        </span>
                        <span className="ml-2 text-xs text-white/40">
                          하루 {t.recentAvg.toFixed(0)}척 · {t.latestDate ?? ""}
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-white/35">자료 없음</span>
                    )}
                  </li>
                );
              })}
            </ul>
            {portwatch?.attribution ? <p className="mt-2 text-xs text-white/30">{portwatch.attribution}</p> : null}
          </Section>

          {regionId === "black-sea" ? (
            <Section title="우크라이나 전쟁 동향" hint="전선 교전·도시 공습 속보 (LiveUAMap). 지구본에도 회색 점으로 표시.">
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input type="checkbox" checked={showWar} onChange={(e) => setShowWar(e.target.checked)} />
                전쟁 동향 보기 ({warEvents.length}건)
              </label>
              {showWar ? (
                <ul className="mt-3 space-y-2">
                  {warEvents.slice(0, 15).map((e) => (
                    <EventRow key={e.id} e={e} onLocate={(x) => locate(x.id, x.lat, x.lng)} />
                  ))}
                </ul>
              ) : null}
            </Section>
          ) : null}

          <Section title="지정학 뉴스" hint={`전세계 피드 — ${region.nameKo} 관련 기사가 위로.`}>
            {rankedNews.length === 0 ? (
              <Empty>뉴스를 불러오지 못함.</Empty>
            ) : (
              <ul className="space-y-2">
                {rankedNews.map((n) => (
                  <li key={n.id} className={n.relevance === 0 ? "opacity-60" : ""}>
                    <a href={n.link} target="_blank" rel="noopener noreferrer" className="block hover:text-white">
                      <p className="text-sm leading-snug text-white/85">
                        {n.relevance === 2 ? <span className="mr-1.5 text-xs text-sky-300">해역·해운</span> : null}
                        {n.relevance === 1 ? <span className="mr-1.5 text-xs text-white/45">해역</span> : null}
                        {n.titleKo || n.title}
                      </p>
                      <p className="mt-0.5 text-xs text-white/35">
                        {n.publisher || n.source} · {fmtWhen(n.pubDate)}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="알림 받기" hint="해역 보험료 동향·피격 경보 요약을 매일 아침 메일로.">
            <EmailDigestSignup lang="ko" />
          </Section>

          <footer className="border-t border-white/10 px-4 py-4 text-xs leading-relaxed text-white/35">
            <p>
              AIS 수신이 끊긴 구간은 &quot;배가 없었다&quot;가 아니라 &quot;자료가 없다&quot;입니다. 이 화면은 공식 항행 경보나
              보험 견적이 아닙니다. 운항 판단은 선사·보험사 공식 채널과 함께 하세요.
            </p>
            <p className="mt-2">
              <Link href="/strikes" className="underline underline-offset-4 hover:text-white">
                피격 확인 전체
              </Link>
              <span className="mx-2">·</span>
              <Link href="/chokepoints" className="underline underline-offset-4 hover:text-white">
                해협 문서
              </Link>
            </p>
          </footer>
        </div>
      </aside>
    </div>
  );
}
