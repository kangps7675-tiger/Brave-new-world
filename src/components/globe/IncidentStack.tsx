"use client";

import { useMemo, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  filterBySea,
  stackSourceName,
  type StackItem,
  type StackSea,
} from "@/lib/incidentStack/build";
import { splitLiveuaTitleBody } from "@/lib/liveuamap/peelTitleUrls";
import { ShipIncidentCard } from "@/components/globe/ShipIncidentCard";
import { IncidentVesselPanel } from "@/components/globe/IncidentVesselPanel";
import type { AisVessel } from "@/data/geoTypes";
import { useTr } from "@/hooks/useTr";
import { useLocalizedTextMap } from "@/hooks/useLocalizedTextMap";
import { provenanceLines } from "@/lib/provenance";
import {
  DESK_HAIRLINE,
  DESK_LABEL,
  DESK_NUM,
  DESK_PANEL,
  LiveDot,
} from "@/components/globe/desk/DeskPanel";

const SEA_LABEL: Record<StackSea, { ko: string; en: string }> = {
  hormuz: { ko: "호르무즈", en: "Hormuz" },
  red_sea: { ko: "홍해", en: "Red Sea" },
  gulf_of_aden: { ko: "아덴만", en: "Gulf of Aden" },
  black_sea: { ko: "흑해", en: "Black Sea" },
  baltic: { ko: "발트해", en: "Baltic" },
};
const SEA_ORDER: StackSea[] = ["hormuz", "red_sea", "gulf_of_aden", "black_sea", "baltic"];

type Props = {
  lang: LabelLanguage;
  items: StackItem[];
  /** 이미 연 사건 — 흐리게 + 읽음 표시. 목록에서 지우지는 않는다 */
  readIds: ReadonlySet<string>;
  unreadCount: number;
  /** 펼쳐진 사건 id. 동시에 하나만 */
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMarkAllRead?: () => void;
  /** 지도 이동은 이 버튼을 눌렀을 때만 */
  onGoToLocation: (item: StackItem) => void;
  /** 후보 선박 패널에서 배를 누르면 — 지도에서 그 배를 선택하고 날아간다 */
  onFocusVessel?: (vessel: AisVessel) => void;
  /** 세슘 위성 뷰는 이 버튼을 눌렀을 때만 켜진다 */
  onViewSatellite?: (item: StackItem) => void;
  /** 이미 위성 모드면 "위성으로 보기"를 숨긴다 */
  hideSatelliteCta?: boolean;
  /** 모바일: 처음엔 접힌 채로 하단에 둔다 */
  compact?: boolean;
};

const VERDICT_LABEL = {
  confirmed: { ko: "확인됨", en: "Confirmed" },
  partial: { ko: "일부 확인", en: "Partly confirmed" },
  unconfirmed: { ko: "확인 못 함", en: "Unconfirmed" },
  refuted: { ko: "반박됨", en: "Refuted" },
} as const;

function timeLabel(at: number, en: boolean): string {
  const d = new Date(at);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleTimeString(en ? "en-GB" : "ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * 슬롯 A — 누적 사건 스택.
 * 새 사건은 위에 쌓이되 자동으로 펼치지 않는다(보던 카드가 바뀌면 안 됨).
 * 행을 누르면 그 행만 양피지 카드로 펼쳐지고, 카드 CTA는 위치로 가기 / 위성으로 보기 / 닫기.
 */
export function IncidentStack({
  lang,
  items,
  readIds,
  unreadCount,
  selectedId,
  onSelect,
  onMarkAllRead,
  onGoToLocation,
  onFocusVessel,
  onViewSatellite,
  hideSatelliteCta = false,
  compact = false,
}: Props) {
  const en = lang === "en";
  const [collapsed, setCollapsed] = useState(compact);
  const [sea, setSea] = useState<StackSea | null>(null);

  const presentSeas = useMemo(
    () => SEA_ORDER.filter((s) => items.some((i) => i.sea === s)),
    [items],
  );
  const activeSea = sea && presentSeas.includes(sea) ? sea : null;
  /** 상단 카드가 보여 줄 사건 — 펼친 행이 있으면 그것, 없으면 가장 최근 */
  const focus = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );
  const visible = useMemo(
    () => filterBySea(items, activeSea),
    [items, activeSea],
  );
  const trRow = useTr(visible.map((i) => i.title), lang);

  return (
    <section
      className={`${DESK_PANEL} flex w-[min(20rem,84vw)] flex-col`}
      aria-label={en ? "Vessel incident stack" : "선박 사건 스택"}
      data-incident-stack
    >
      <button
        type="button"
        className={`flex w-full items-center justify-between gap-2 bg-amber-500/[0.06] px-2 py-1 text-left transition hover:bg-amber-500/10 ${
          collapsed ? "" : `border-b ${DESK_HAIRLINE}`
        }`}
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((v) => !v)}
      >
        <span className={`flex items-center gap-1.5 ${DESK_LABEL}`}>
          <LiveDot on={items.length > 0} />
          {en ? "Vessel incidents" : "선박 사건"}
        </span>
        <span className={`flex items-center gap-1.5 ${DESK_NUM} text-micro text-amber-200/70`}>
          {unreadCount > 0 ? (
            <span className="rounded-sm bg-amber-500 px-1 text-micro font-semibold text-black">
              {unreadCount}
            </span>
          ) : null}
          {items.length}
          <span aria-hidden>{collapsed ? "▴" : "▾"}</span>
        </span>
      </button>

      {collapsed ? null : (
        <>
          {(focus ?? visible[0]) ? (
            <ShipIncidentCard lang={lang} item={(focus ?? visible[0])!} />
          ) : null}
          {focus && focus.source === "ukmto" && onFocusVessel ? (
            <IncidentVesselPanel lang={lang} item={focus} onFocusVessel={onFocusVessel} />
          ) : null}
          {presentSeas.length > 0 ? (
            <div
              className={`flex flex-wrap gap-0.5 border-b ${DESK_HAIRLINE} px-2 py-1`}
              role="group"
              aria-label={en ? "Sea filter" : "해역 필터"}
            >
              {[null, ...presentSeas].map((s) => {
                const on = activeSea === s;
                return (
                  <button
                    key={s ?? "all"}
                    type="button"
                    aria-pressed={on}
                    className={`rounded-[2px] border px-1.5 py-px font-mono text-micro uppercase tracking-wider ${
                      on
                        ? "border-amber-400/70 bg-amber-500/25 text-amber-50"
                        : "border-amber-700/25 text-amber-200/65 hover:bg-amber-500/10"
                    }`}
                    onClick={() => setSea(s)}
                  >
                    {s ? (en ? SEA_LABEL[s].en : SEA_LABEL[s].ko) : en ? "All" : "전체"}
                  </button>
                );
              })}
            </div>
          ) : null}

          {onMarkAllRead && unreadCount > 0 ? (
            <div className={`flex items-center justify-between gap-2 border-b ${DESK_HAIRLINE} px-2 py-0.5 text-micro text-amber-200/60`}>
              <span className="tabular-nums">
                {en ? `${unreadCount} not opened` : `안 연 사건 ${unreadCount}`}
              </span>
              <button
                type="button"
                className="rounded-sm px-1 text-amber-200/80 hover:bg-amber-500/15 hover:text-amber-50"
                onClick={onMarkAllRead}
              >
                {en ? "Mark all read" : "모두 읽음 처리"}
              </button>
            </div>
          ) : null}

          {visible.length === 0 ? (
            <p className="px-2.5 py-2 text-micro text-amber-200/50">
              {en ? "No vessel incidents." : "선박 사건이 없습니다."}
            </p>
          ) : (
            <ul
              className={`intel-scroll-y ${compact ? "max-h-[45vh]" : "max-h-[min(60vh,30rem)]"} overflow-y-auto font-sans ${en ? "font-en" : ""}`}
            >
              {visible.map((it) => {
                const isRead = readIds.has(it.id);
                const open = selectedId === it.id;
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      aria-expanded={open}
                      className={`flex w-full items-start gap-2 border-b border-amber-600/10 px-2 py-1 text-left hover:bg-amber-500/10 ${
                        open ? "bg-amber-500/15" : ""
                      } ${isRead && !open ? "opacity-55 hover:opacity-90" : ""}`}
                      onClick={() => onSelect(open ? null : it.id)}
                    >
                      <span className="min-w-0 flex flex-col items-start gap-0.5">
                        <span className="flex items-center gap-1.5 text-micro font-medium tracking-tight text-amber-300/75">
                          {!isRead && it.source === "liveua" ? (
                            <span
                              aria-hidden
                              className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
                            />
                          ) : null}
                          <span className={`${DESK_NUM} text-amber-200/90`}>{timeLabel(it.at, en)}</span>
                          <span>{it.place}</span>
                          {it.source === "ukmto" ? (
                            <span className="rounded-sm bg-orange-500/25 px-1 text-orange-100">
                              UKMTO
                            </span>
                          ) : null}
                          {it.source === "nga" ? (
                            <span className="rounded-sm bg-sky-500/25 px-1 text-sky-100">NGA</span>
                          ) : null}
                          {it.source === "case" ? (
                            <span className="rounded-sm bg-rose-500/25 px-1 text-rose-100">
                              {en ? "My case" : "내 케이스"}
                              {it.verdict
                                ? ` · ${en ? VERDICT_LABEL[it.verdict].en : VERDICT_LABEL[it.verdict].ko}`
                                : ""}
                            </span>
                          ) : null}
                          {isRead ? (
                            <span className="text-amber-200/60">✓ {en ? "Read" : "읽음"}</span>
                          ) : null}
                        </span>
                        <span className="line-clamp-1 text-meta font-medium tracking-tight text-amber-50">
                          {trRow(it.title)}
                        </span>
                      </span>
                    </button>
                    {open ? (
                      <IncidentCard
                        en={en}
                        item={it}
                        onGoToLocation={onGoToLocation}
                        onViewSatellite={hideSatelliteCta ? undefined : onViewSatellite}
                        onClose={() => onSelect(null)}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function IncidentCard({
  en,
  item,
  onGoToLocation,
  onViewSatellite,
  onClose,
}: {
  en: boolean;
  item: StackItem;
  onGoToLocation: (item: StackItem) => void;
  onViewSatellite?: (item: StackItem) => void;
  onClose: () => void;
}) {
  const ev = item.liveua;
  // UKMTO 본문은 영어 원문이라 한글 모드에서는 클라이언트에서 번역한다 (liveuamap은 titleKo·bodyKo가 이미 온다)
  const ukmtoText = useLocalizedTextMap(
    (item.source === "ukmto" || item.source === "nga") && item.detail
      ? [{ key: item.id, text: item.detail }]
      : [],
    en ? "en" : "ko",
  );
  const rawBody = ev
    ? splitLiveuaTitleBody(
        en ? ev.title : ev.titleKo?.trim() || ev.title,
        en ? ev.body : ev.bodyKo?.trim() || ev.body,
        ev.sourceUrl,
      ).body
    : (ukmtoText.get(item.id) ?? item.detail ?? "").trim();
  const tr = useTr([item.title, rawBody], en ? "en" : "ko");
  const body = tr(rawBody);
  const btn =
    "rounded-sm border border-[#6b4a22]/40 bg-[#efe0bc]/95 px-2 py-0.5 text-micro font-medium text-[#3d2a12] hover:bg-[#e8d6a8]";
  return (
    <div
      className="mx-2 mb-2 space-y-2 rounded-sm border border-[#6b4a22]/45 bg-[#f3e6c8] p-2.5 text-[#2a1c0a]"
      data-incident-card
    >
      <p className="text-meta font-semibold leading-snug">{tr(item.title)}</p>
      {body ? <p className="text-micro leading-snug text-[#3d2a12]">{body}</p> : null}
      {item.source === "ukmto" ? (
        <p className="text-micro text-[#5c4020]/80">
          {en
            ? "Source: UKMTO (UK Royal Navy). Vessel names are withheld."
            : "출처: UKMTO(영국 해군). 선박명은 공개되지 않습니다."}
        </p>
      ) : null}
      {item.source === "nga" ? (
        <p className="text-micro text-[#5c4020]/80">
          {en
            ? "Source: US NGA maritime safety broadcast (HYDROPAC/HYDROLANT/NAVAREA)."
            : "출처: 미 NGA 항행안전 방송(HYDROPAC·HYDROLANT·NAVAREA). 선박명이 공개됩니다."}
        </p>
      ) : null}
      {item.times ? (
        <dl className="space-y-0.5 text-micro text-[#5c4020]/85">
          {provenanceLines(
            item.times,
            stackSourceName(item),
            en ? "en" : "ko",
          ).map((l) => (
            <div key={l.label} className="flex gap-1.5">
              <dt className="shrink-0 font-semibold">{l.label}</dt>
              <dd className="tabular-nums">{l.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {item.caseId ? (
        <a
          href={`/case/${encodeURIComponent(item.caseId)}`}
          className="block text-micro text-[#3d2a12] underline underline-offset-2"
        >
          {en ? "Open case file" : "케이스 파일 열기"}
        </a>
      ) : null}
      <p className="text-micro tabular-nums text-[#5c4020]/80">
        {item.lat.toFixed(3)}, {item.lng.toFixed(3)}
        {en ? " · approximate location" : " · 위치는 근사치"}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className={btn} onClick={() => onGoToLocation(item)}>
          {en ? "Go to location" : "위치로 가기"}
        </button>
        {onViewSatellite ? (
          <button type="button" className={btn} onClick={() => onViewSatellite(item)}>
            {en ? "View by satellite" : "위성으로 보기"}
          </button>
        ) : null}
        <button type="button" className={btn} onClick={onClose}>
          {en ? "Close" : "닫기"}
        </button>
      </div>
    </div>
  );
}
