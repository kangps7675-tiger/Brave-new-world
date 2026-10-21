"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { StackItem } from "@/lib/incidentStack/build";
import { describeVessel } from "@/lib/incidentStack/shipText";
import { caseIdOfStackItem, loadMatchedVessel, type MatchedVessel } from "@/lib/strikeMatch/matchedVessel";
import { fetchShipPhotos, shipKindFromType, type ShipKind, type ShipPhoto } from "@/lib/shipPhoto";

// 평면 지도는 뒷면을 처음 돌릴 때 불러온다 — 카드를 그냥 보는 동안은 WebGL 컨텍스트를 안 쓴다.
const IncidentFlatMap = dynamic(() => import("@/components/globe/IncidentFlatMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0b1724] text-micro text-sky-100/60">
      …
    </div>
  ),
});

type PhotoState = { status: "idle" | "loading" | "done"; photos: ShipPhoto[] };

function useShipPhotos(name: string | null | undefined): PhotoState {
  const [state, setState] = useState<PhotoState>({ status: "idle", photos: [] });
  useEffect(() => {
    if (!name?.trim()) {
      setState({ status: "done", photos: [] });
      return;
    }
    const ac = new AbortController();
    setState({ status: "loading", photos: [] });
    void fetchShipPhotos(name, ac.signal).then((photos) => {
      if (!ac.signal.aborted) setState({ status: "done", photos });
    });
    return () => ac.abort();
  }, [name]);
  return state;
}

/** UKMTO 사건 — 우리 AIS 매칭이 한 척으로 좁힌 경우에만 그 배를 돌려준다 (확인·유력) */
function useMatchedVessel(item: StackItem): MatchedVessel | null {
  const [matched, setMatched] = useState<MatchedVessel | null>(null);
  useEffect(() => {
    setMatched(null);
    if (item.source !== "ukmto" || item.vesselName?.trim()) return;
    const caseId = caseIdOfStackItem(item.id);
    if (!caseId) return;
    let cancelled = false;
    void loadMatchedVessel(caseId).then((v) => {
      if (!cancelled) setMatched(v);
    });
    return () => {
      cancelled = true;
    };
  }, [item.id, item.source, item.vesselName]);
  return matched;
}

/** 대표 일러스트 — 실제 선박 사진이 아님. 선종별 실루엣만 다르다. */
function ShipSilhouette({ kind }: { kind: ShipKind }) {
  const hull = "M6,52 L214,52 L198,70 L24,70 Z";
  return (
    <svg viewBox="0 0 220 90" className="h-full w-full" role="img" aria-hidden>
      <rect width="220" height="90" fill="#0b1724" />
      <path d="M0,70 Q27,64 55,70 T110,70 T165,70 T220,70 V90 H0 Z" fill="#12304a" />
      <path d={hull} fill="#3b4a58" stroke="#8aa0b2" strokeWidth="1.2" strokeLinejoin="round" />
      {kind === "tanker" ? (
        <>
          <rect x="30" y="44" width="120" height="8" fill="#5b6c7b" />
          <rect x="165" y="30" width="26" height="22" fill="#cbd5e1" />
          <rect x="170" y="22" width="14" height="8" fill="#94a3b8" />
          <path d="M40,44 V36 M60,44 V36 M80,44 V36 M100,44 V36 M120,44 V36" stroke="#8aa0b2" strokeWidth="1.5" />
        </>
      ) : null}
      {kind === "bulk" ? (
        <>
          {[28, 62, 96, 130].map((x) => (
            <path key={x} d={`M${x},52 L${x + 6},40 H${x + 22} L${x + 28},52 Z`} fill="#5b6c7b" />
          ))}
          <rect x="168" y="30" width="24" height="22" fill="#cbd5e1" />
          <rect x="173" y="22" width="14" height="8" fill="#94a3b8" />
        </>
      ) : null}
      {kind === "container" ? (
        <>
          {[0, 1, 2, 3, 4].map((r) =>
            [0, 1, 2, 3, 4, 5, 6].map((c) => (
              <rect
                key={`${r}-${c}`}
                x={26 + c * 17}
                y={44 - r * 7}
                width="15"
                height="6"
                fill={["#b45309", "#1d4ed8", "#15803d", "#b91c1c", "#64748b"][(r + c) % 5]}
              />
            )),
          )}
          <rect x="168" y="22" width="22" height="30" fill="#cbd5e1" />
        </>
      ) : null}
      {kind === "generic" ? (
        <>
          <rect x="40" y="42" width="40" height="10" fill="#5b6c7b" />
          <rect x="95" y="42" width="40" height="10" fill="#5b6c7b" />
          <rect x="165" y="30" width="26" height="22" fill="#cbd5e1" />
        </>
      ) : null}
    </svg>
  );
}

function sourceTag(item: StackItem, en: boolean): string {
  if (item.source === "ukmto") return "UKMTO";
  if (item.source === "nga") return "NGA";
  if (item.source === "case") return en ? "My case" : "내 케이스";
  return "Liveuamap";
}

/**
 * 선박 사건 대표 카드 — 앞면: 선박 사진, 뒷면: 피격 위치를 찍은 평면 지도.
 * 사진은 선박명이 확실히 맞을 때만 쓰고, 못 찾으면 선종 대표 일러스트로 대체해 그 사실을 적는다.
 */
export function ShipIncidentCard({ lang, item }: { lang: LabelLanguage; item: StackItem }) {
  const en = lang === "en";
  const [flipped, setFlipped] = useState(false);
  const [mapMounted, setMapMounted] = useState(false);
  const matched = useMatchedVessel(item);
  const { status, photos } = useShipPhotos(item.vesselName?.trim() || matched?.name);
  const [photoIdx, setPhotoIdx] = useState(0);
  const count = photos.length;
  const current = count > 0 ? photos[Math.min(photoIdx, count - 1)]! : null;
  const step = (d: number) => setPhotoIdx((i) => (i + d + count) % count);

  // 다른 사건으로 바뀌면 앞면(첫 사진)부터
  useEffect(() => {
    setFlipped(false);
    setMapMounted(false);
    setPhotoIdx(0);
  }, [item.id]);

  const flip = () => {
    setMapMounted(true);
    setFlipped((v) => !v);
  };

  // 선박명이 없으면(UKMTO는 비공개) 본문에서 선종·톤수를 읽어 보여 준다
  const info = describeVessel(`${item.detail ?? ""} ${item.title}`, item.vesselType);
  const kind: ShipKind =
    info.kind === "cargo" ? "generic" : (info.kind ?? shipKindFromType(item.vesselType));
  const kindLabel = (() => {
    const base = info.gas
      ? en ? "LNG/LPG carrier" : "LNG·LPG 운반선"
      : { tanker: en ? "Tanker" : "유조선", bulk: en ? "Bulk carrier" : "벌크선", container: en ? "Container ship" : "컨테이너선", cargo: en ? "Cargo ship" : "화물선" }[info.kind ?? "cargo"];
    const label = info.kind || info.gas ? base : item.vesselType?.trim() || (en ? "Merchant vessel" : "상선");
    return info.tonnes ? `${label} · ${en ? "~" : "약 "}${info.tonnes.toLocaleString()}${en ? " t" : "톤"}` : label;
  })();
  const anonymous = !item.vesselName?.trim();
  const matchNote = matched
    ? matched.status === "confirmed"
      ? en ? "AIS name match" : "AIS 선명 일치"
      : en ? "Likely vessel by AIS (not confirmed)" : "AIS 정황상 유력 · 확정 아님"
    : null;
  const caption = current
    ? [matchNote, en ? "Reference photo, not from the incident" : "참고용 사진 · 사건 당시 사진 아님", current.artist, current.license, "Wikimedia Commons"].filter(Boolean).join(" · ")
    : status === "loading"
      ? en
        ? "Looking for a photo…"
        : "사진 찾는 중…"
      : anonymous && item.source === "ukmto"
        ? en
          ? "UKMTO withholds vessel names · illustration"
          : "UKMTO는 선박명을 공개하지 않음 · 대표 이미지"
        : en
          ? "Illustration — not the actual vessel"
          : "대표 이미지 · 실제 선박 사진 아님";

  const face =
    "absolute inset-0 overflow-hidden [backface-visibility:hidden] [-webkit-backface-visibility:hidden]";

  return (
    <div className="relative border-b border-amber-600/25" data-incident-hero>
      <div className="relative h-40 w-full [perspective:1000px]">
        <div
          className="absolute inset-0 transition-transform duration-500 [transform-style:preserve-3d]"
          style={{ transform: flipped ? "rotateY(180deg)" : "none" }}
        >
          {/* 앞면 — 선박 사진 */}
          <div className={`${face} bg-[#0b1724]`} aria-hidden={flipped}>
            {current ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={current.url}
                src={current.url}
                alt={current.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            ) : (
              <ShipSilhouette kind={kind} />
            )}
            {count > 1 ? (
              <>
                <button
                  type="button"
                  aria-label={en ? "Previous photo" : "이전 사진"}
                  onClick={() => step(-1)}
                  tabIndex={flipped ? -1 : 0}
                  className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/55 px-1.5 py-0.5 text-sm text-amber-50 hover:bg-black/75"
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label={en ? "Next photo" : "다음 사진"}
                  onClick={() => step(1)}
                  tabIndex={flipped ? -1 : 0}
                  className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/55 px-1.5 py-0.5 text-sm text-amber-50 hover:bg-black/75"
                >
                  ›
                </button>
                <span
                  className="pointer-events-none absolute bottom-7 right-2 rounded-sm bg-black/55 px-1 text-micro tabular-nums text-amber-100/80"
                  aria-live="polite"
                >
                  {Math.min(photoIdx, count - 1) + 1}/{count}
                </span>
              </>
            ) : null}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 pb-1 pt-6">
              <p className="truncate text-meta font-semibold text-amber-50">
                {item.vesselName?.trim() || (current ? matched?.name : null) || kindLabel}
                {item.vesselName?.trim() || (current && matched?.name) ? (
                  <span className="font-normal text-amber-200/80"> · {kindLabel}</span>
                ) : null}
              </p>
              <p className="truncate text-micro text-amber-100/60">{caption}</p>
            </div>
          </div>

          {/* 뒷면 — 피격 위치 평면 지도 */}
          <div className={`${face} bg-[#0b1724] [transform:rotateY(180deg)]`} aria-hidden={!flipped}>
            {mapMounted ? (
              <IncidentFlatMap
                lat={item.lat}
                lng={item.lng}
                ariaLabel={en ? "Incident location map" : "사건 위치 지도"}
              />
            ) : null}
            <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 to-transparent px-2 pb-5 pt-1">
              <p className="truncate text-micro font-medium text-amber-50">
                {item.place || (en ? "Location unknown" : "위치 미상")}
                <span className="ml-1.5 tabular-nums text-amber-200/70">
                  {item.lat.toFixed(2)}, {item.lng.toFixed(2)}
                </span>
              </p>
            </div>
            <p className="pointer-events-none absolute bottom-1 left-2 rounded-sm bg-black/55 px-1 text-micro text-amber-100/70">
              {en ? "Approximate location" : "위치는 근사치"}
            </p>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5">
        <span className="rounded-sm bg-black/60 px-1.5 py-0.5 text-micro font-medium text-amber-100">
          {sourceTag(item, en)}
        </span>
      </div>

      <button
        type="button"
        onClick={flip}
        aria-pressed={flipped}
        className="absolute right-2 top-2 z-10 rounded-sm border border-amber-300/40 bg-black/60 px-2 py-0.5 text-micro font-medium text-amber-50 backdrop-blur-sm hover:bg-black/75"
      >
        {flipped ? (en ? "Photo" : "사진 보기") : en ? "Map" : "위치 지도"} ⇄
      </button>
    </div>
  );
}
