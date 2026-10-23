"use client";

import { useEffect, useMemo, useState } from "react";
import type { AisVessel } from "@/data/geoTypes";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { StackItem } from "@/lib/incidentStack/build";
import { aisShipTypeLabel } from "@/lib/aisVesselClass";
import { flagFromMmsi } from "@/lib/mmsiFlag";
import { loadIncidentVessels, type IncidentVessel } from "@/lib/incidentVesselsClient";
import { caseIdOfStackItem } from "@/lib/strikeMatch/matchedVessel";
import { fetchShipPhotos, type ShipPhoto } from "@/lib/shipPhoto";
import { loadStrikeDetail, type StrikeCandidateView, type StrikeDetailView } from "@/lib/strikeMatch/strikeDetailClient";

const TYPE_KO: Record<string, string> = {
  Fishing: "어선", Military: "군용", Sailing: "범선", Pleasure: "레저선", HSC: "고속선", Pilot: "도선선", SAR: "수색구조선",
  Tug: "예인선", "Port tender": "항만 작업선", "Law enforcement": "법집행선", Passenger: "여객선", Cargo: "화물선",
  Tanker: "유조선", Other: "기타", Special: "특수선",
};

function typeLabel(shipType: number | null, en: boolean): string {
  const base = aisShipTypeLabel(shipType);
  if (!base) return en ? "Type unknown" : "선종 미상";
  return en ? base : (TYPE_KO[base] ?? base);
}

const VERDICT = {
  confirmed: { ko: "확인", en: "Confirmed", cls: "bg-red-600/85 text-white" },
  likely: { ko: "유력", en: "Likely", cls: "bg-red-500/70 text-white" },
  possible: { ko: "후보", en: "Candidate", cls: "bg-amber-500/80 text-black" },
} as const;

const STATUS_NOTE = {
  confirmed: { ko: "경보·기사의 선명과 AIS 선명이 일치", en: "Name matches AIS" },
  likely: { ko: "정황상 한 척으로 좁혀짐 · 확정 아님", en: "Narrowed to one vessel · not confirmed" },
  ambiguous: { ko: "근처 배는 있으나 한 척으로 못 좁힘 — 후보일 뿐", en: "Nearby vessels, cannot narrow to one" },
  unknown: { ko: "근처 AIS 기록 없음 — 수집 공백일 수 있음(‘맞은 배 없음’ 아님)", en: "No nearby AIS record — may be a coverage gap" },
} as const;

/** 선명이 제목에 들어간 Wikimedia Commons 사진만(shipPhoto 가 거른다). 없으면 아무것도 그리지 않는다. */
function CandidatePhoto({ name, verdict, en }: { name: string | null; verdict: StrikeCandidateView["verdict"]; en: boolean }) {
  const [photos, setPhotos] = useState<ShipPhoto[] | null>(null);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    setPhotos(null);
    setIdx(0);
    const n = name?.trim();
    if (!n) {
      setPhotos([]);
      return;
    }
    const ac = new AbortController();
    void fetchShipPhotos(n, ac.signal).then((p) => !ac.signal.aborted && setPhotos(p));
    return () => ac.abort();
  }, [name]);
  if (photos === null) return <div className="mt-1 h-24 animate-pulse rounded-sm bg-black/30" aria-hidden />;
  if (photos.length === 0) {
    return (
      <p className="mt-1 text-micro text-amber-100/45">
        {name?.trim()
          ? en ? "No photo of this ship found on Wikimedia Commons." : "이 선박 이름으로 찾은 사진이 없어요(Wikimedia Commons)."
          : en ? "No name received — no photo search." : "선명을 못 받아 사진을 찾지 않았어요."}
      </p>
    );
  }
  const cur = photos[Math.min(idx, photos.length - 1)]!;
  return (
    <figure className="relative mt-1 overflow-hidden rounded-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cur.url} alt={cur.title} loading="lazy" referrerPolicy="no-referrer" className="h-24 w-full object-cover" />
      {photos.length > 1 ? (
        <>
          <button type="button" aria-label={en ? "Previous photo" : "이전 사진"} onClick={() => setIdx((i) => (i - 1 + photos.length) % photos.length)} className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-black/55 px-1.5 text-sm text-amber-50">‹</button>
          <button type="button" aria-label={en ? "Next photo" : "다음 사진"} onClick={() => setIdx((i) => (i + 1) % photos.length)} className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-black/55 px-1.5 text-sm text-amber-50">›</button>
        </>
      ) : null}
      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-1.5 pb-0.5 pt-4 text-micro leading-tight text-amber-100/75">
        {[
          verdict === "possible" ? (en ? "Candidate — not confirmed" : "후보 · 확정 아님") : null,
          en ? "Reference photo, not from the incident" : "참고용 사진 · 사건 당시 아님",
          cur.artist,
          cur.license,
          "Wikimedia Commons",
        ].filter(Boolean).join(" · ")}
      </figcaption>
    </figure>
  );
}

function Row({
  c,
  en,
  pos,
  onFocus,
}: {
  c: StrikeCandidateView;
  en: boolean;
  pos: IncidentVessel | null;
  onFocus: (v: AisVessel) => void;
}) {
  const v = VERDICT[c.verdict];
  const flag = flagFromMmsi(c.mmsi, en ? "en" : "ko");
  return (
    <li className="rounded-sm border border-amber-600/25 bg-black/25 p-1.5">
      <div className="flex items-center gap-1.5">
        <span className={`rounded-sm px-1 text-micro font-medium ${v.cls}`}>{en ? v.en : v.ko}</span>
        <span className="truncate text-meta font-semibold text-amber-50">
          {c.name?.trim() || (en ? "Name unknown" : "선명 미상")}
        </span>
      </div>
      <CandidatePhoto name={c.name} verdict={c.verdict} en={en} />
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-micro text-amber-100/80">
        <dt className="text-amber-200/55">{en ? "Flag (est.)" : "기국(추정)"}</dt>
        <dd>{flag ?? (en ? "Unknown" : "미상")}</dd>
        <dt className="text-amber-200/55">{en ? "Type" : "선종"}</dt>
        <dd>{typeLabel(c.shipType, en)}</dd>
        <dt className="text-amber-200/55">IMO</dt>
        <dd className="tabular-nums">{c.imo ?? (en ? "not received" : "미수신")}</dd>
        <dt className="text-amber-200/55">MMSI</dt>
        <dd className="tabular-nums">{c.mmsi}</dd>
        <dt className="text-amber-200/55">{en ? "From site" : "사건 지점"}</dt>
        <dd>
          {en ? "~" : "약 "}
          {c.distanceKm.toFixed(1)} km {en ? "(estimated at incident time)" : "(사건 시각 추정 위치)"}
        </dd>
      </dl>
      {c.signals.length > 0 ? (
        <p className="mt-1 text-micro leading-snug text-amber-100/60">
          {c.signals
            .slice(0, 2)
            .map((s) => s.ko)
            .join(" · ")}
        </p>
      ) : null}
      <button
        type="button"
        disabled={!pos}
        onClick={() => pos && onFocus(pos)}
        title={pos ? undefined : en ? "No recent AIS position" : "마지막 수신 위치 없음"}
        className="mt-1 w-full rounded-sm border border-amber-300/40 bg-amber-500/10 px-2 py-0.5 text-micro font-medium text-amber-50 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pos ? (en ? "Show on map (last position)" : "지도에서 보기 (마지막 수신 위치)") : en ? "No position" : "위치 없음"}
      </button>
    </li>
  );
}

/**
 * 해상 피격 사건 → 후보 선박 패널. 피격 소식(UKMTO 경보)과 우리 AIS 매칭이 찍은 후보를 한 곳에 보여 주고,
 * 후보를 누르면 지도에서 그 배를 선택해 날아간다. 후보는 확정이 아니며 그 한계를 숨기지 않는다.
 */
export function IncidentVesselPanel({
  lang,
  item,
  onFocusVessel,
}: {
  lang: LabelLanguage;
  item: StackItem;
  onFocusVessel: (v: AisVessel) => void;
}) {
  const en = lang === "en";
  const caseId = caseIdOfStackItem(item.id);
  const [detail, setDetail] = useState<StrikeDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState<IncidentVessel[]>([]);

  useEffect(() => {
    setDetail(null);
    setLoading(Boolean(caseId));
    if (!caseId) return;
    let alive = true;
    void loadStrikeDetail(caseId).then((d) => {
      if (!alive) return;
      setDetail(d);
      setLoading(false);
    });
    void loadIncidentVessels().then((v) => alive && setPositions(v));
    return () => {
      alive = false;
    };
  }, [caseId]);

  const posByMmsi = useMemo(() => new Map(positions.map((p) => [p.mmsi, p])), [positions]);
  const rows = useMemo(() => {
    if (!detail) return [];
    const list = detail.candidates.length > 0 ? detail.candidates : detail.top ? [detail.top] : [];
    return list.slice(0, 3);
  }, [detail]);

  if (!caseId) return null;
  const when = new Date(item.at);
  const whenLabel = Number.isFinite(when.getTime())
    ? when.toLocaleString(en ? "en-GB" : "ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
    : "";

  return (
    <div className="border-b border-amber-600/25 px-2.5 py-2" data-incident-vessel-panel>
      <p className="text-micro font-medium text-amber-200/70">{en ? "Strike report" : "피격 소식"}</p>
      <p className="mt-0.5 text-meta leading-snug text-amber-50">{item.title}</p>
      {item.detail ? <p className="mt-0.5 line-clamp-3 text-micro leading-snug text-amber-100/65">{item.detail}</p> : null}
      <p className="mt-0.5 text-micro text-amber-200/55">
        {[whenLabel, item.place].filter(Boolean).join(" · ")}
      </p>

      <p className="mt-2 text-micro font-medium text-amber-200/70">{en ? "AIS-matched vessels" : "AIS 매칭 후보 선박"}</p>
      {loading ? (
        <p className="mt-1 text-micro text-amber-100/55">{en ? "Matching AIS…" : "AIS 매칭 중…"}</p>
      ) : !detail ? (
        <p className="mt-1 text-micro text-amber-100/55">{en ? "Could not load the match." : "매칭 결과를 불러오지 못했어요."}</p>
      ) : (
        <>
          <p className="mt-0.5 text-micro text-amber-100/70">{en ? STATUS_NOTE[detail.status].en : STATUS_NOTE[detail.status].ko}</p>
          {rows.length > 0 ? (
            <ul className="mt-1.5 space-y-1.5">
              {rows.map((c) => (
                <Row key={c.mmsi} c={c} en={en} pos={posByMmsi.get(c.mmsi) ?? null} onFocus={onFocusVessel} />
              ))}
            </ul>
          ) : null}
          {detail.reportedNames && detail.reportedNames.length > 0 ? (
            <div className="mt-2 rounded-sm border border-sky-400/30 bg-sky-500/5 p-1.5">
              <p className="text-micro font-medium text-sky-100/80">
                {en ? "Names reported by press (position not verified)" : "기사가 보도한 선명 (위치 검증 전)"}
              </p>
              <ul className="mt-1 space-y-1">
                {detail.reportedNames.map((r) => {
                  const flag = flagFromMmsi(r.mmsi, en ? "en" : "ko");
                  return (
                    <li key={r.name} className="text-micro leading-snug text-amber-100/80">
                      <span className="font-semibold text-amber-50">{r.name}</span>
                      <span className="text-amber-200/60">
                        {" · "}
                        {en ? `${r.outlets} outlet(s)` : `매체 ${r.outlets}곳`}
                        {r.imo ? ` · IMO ${r.imo}` : ""}
                        {flag ? ` · ${en ? "flag(est.) " : "기국(추정) "}${flag}` : ""}
                      </span>
                      {r.sources[0] ? (
                        <a href={r.sources[0].url} target="_blank" rel="noreferrer noopener" className="ml-1 text-sky-200/80 underline">
                          {r.sources[0].outlet ?? (en ? "source" : "출처")}
                        </a>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-1 text-micro text-amber-100/50">
                {en
                  ? "Not confirmed — the name has not been matched to the ship's position at the incident time."
                  : "확정 아님 — 사건 시각 이 배의 위치와 맞춰 보지 못했어요(항적 자료 없음일 수 있음)."}
              </p>
            </div>
          ) : null}
          {detail.limits.length > 0 ? (
            <p className="mt-1.5 text-micro leading-snug text-amber-100/50">
              {en ? "Limits: " : "한계: "}
              {detail.limits.slice(0, 2).join(" / ")}
            </p>
          ) : null}
          <p className="mt-1 text-micro text-amber-100/45">
            {en
              ? "Flag is estimated from the MMSI prefix (registry flag, not owner nationality)."
              : "기국은 MMSI 앞자리로 추정한 등록국이에요(선주·운항사 국적과 다를 수 있음)."}
          </p>
        </>
      )}
    </div>
  );
}
