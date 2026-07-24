"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getNavMenuGroups } from "@/data/econNavRegions";
import {
  HUB_DEFINITIONS,
  selectionForAlly,
  selectionForArms,
  selectionForClaim,
  selectionForHubNetwork,
  selectionForRegime,
  selectionForRegimeOverview,
  type HubDefinition,
} from "@/data/hubNav";
import {
  toNavSelection,
  type NavMenuGroup,
  type NavMenuItem,
  type NavSelection,
  type NavSubItem,
} from "@/data/navRegions";
import type { SearchPlace } from "@/data/geoTypes";
import { getViewerChrome } from "@/lib/viewerChrome";
import type { ViewerMode } from "@/lib/viewPackages";

type HoverNavProps = {
  viewerMode: ViewerMode;
  onNavigate: (selection: NavSelection) => void;
  lastUpdated: string | null;
  liveStatus: "idle" | "loading" | "ok" | "error";
  query: string;
  onQueryChange: (value: string) => void;
  searchResults: SearchPlace[];
  onSearchSelect: (place: SearchPlace) => void;
  /** 좁은 화면 — 패딩·드롭다운 하단 슬롯(전장·프리셋) 등 모바일 전용 */
  compact?: boolean;
  /** compact 드롭다운 하단 슬롯 (전장·프리셋 등) */
  compactMenuExtra?: ReactNode;
  /** 검색창 위 (nav 공지 배너 등) — fixed 스택 최상단 */
  aboveNav?: ReactNode;
  /** nav 본문·드롭다운 바로 아래 (지정학/지경학 스위치 등) — 메뉴 열림에 따라 함께 이동 */
  belowNav?: ReactNode;
  /** 검색창 옆 「묻기」— 레이어 자동 ON 오버레이 */
  onAskLayersOpen?: () => void;
  askLayersLabel?: string;
};

export function HoverNav({
  viewerMode,
  onNavigate,
  lastUpdated,
  liveStatus,
  query,
  onQueryChange,
  searchResults,
  onSearchSelect,
  compact = false,
  compactMenuExtra,
  aboveNav,
  belowNav,
  onAskLayersOpen,
  askLayersLabel,
}: HoverNavProps) {
  const [navOpen, setNavOpen] = useState(false);
  const [hubMenuOpen, setHubMenuOpen] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [openHubId, setOpenHubId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const isEconomy = viewerMode === "economy";
  const chrome = getViewerChrome(viewerMode);
  const navGroups = useMemo(() => getNavMenuGroups(viewerMode), [viewerMode]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setNavOpen(false);
        setHubMenuOpen(false);
        setOpenKey(null);
        setOpenHubId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(
    group: NavMenuGroup,
    item: NavMenuItem | NavSubItem,
    parentLabel?: string,
  ) {
    onNavigate(toNavSelection(item, group.id, parentLabel));
    setOpenKey(null);
    setOpenHubId(null);
    setNavOpen(false);
    setHubMenuOpen(false);
  }

  function handleHubNavigate(selection: NavSelection) {
    onNavigate(selection);
    setOpenHubId(null);
    setNavOpen(false);
    setHubMenuOpen(false);
  }

  function handleSearchPick(place: SearchPlace) {
    onSearchSelect(place);
    setNavOpen(false);
    setHubMenuOpen(false);
    setOpenKey(null);
    setOpenHubId(null);
  }

  const borderTone = isEconomy ? "border-emerald-200/10" : "border-sky-200/10";
  const bgTone = isEconomy ? "bg-[#0a1f18]/45" : "bg-[#162a48]/45";
  const menuBg = isEconomy ? "bg-[#0a1f18]/75" : "bg-[#162a48]/75";
  const accentHover = isEconomy ? "hover:bg-emerald-400/10" : "hover:bg-sky-400/10";
  const accentActive = isEconomy
    ? "bg-emerald-400/15 text-emerald-50 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.25)]"
    : "bg-sky-400/15 text-sky-50 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.25)]";

  const menuExpanded = isEconomy ? navOpen : hubMenuOpen;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[75] flex flex-col"
      style={{
        paddingTop: "max(0.35rem, env(safe-area-inset-top, 0px))",
      }}
    >
      {aboveNav ? (
        <div className="pointer-events-auto z-[77] w-full shrink-0">{aboveNav}</div>
      ) : null}

      <div
        className={`flex w-full flex-col items-center ${
          compact ? "px-[3.4rem] sm:px-14" : "px-2 sm:px-3"
        } ${aboveNav ? "mt-2.5" : "mt-1.5"}`}
      >
      <nav
        id="app-hover-nav"
        ref={navRef}
        className={`pointer-events-auto w-full transition-all duration-300 ease-out ${
          compact
            ? "max-w-full"
            : isEconomy
              ? `max-w-md sm:max-w-lg ${menuExpanded ? "max-w-3xl sm:max-w-4xl" : ""}`
              : "max-w-md sm:max-w-lg"
        } ${isEconomy ? "hover-nav--economy font-nav-economy" : "hover-nav--conflict"}`}
      >
        <div
          className={`relative rounded-2xl border ${borderTone} ${bgTone} shadow-lg backdrop-blur-xl transition-all duration-300 ${
            menuExpanded ? "rounded-b-none border-b-0" : ""
          }`}
        >
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 sm:gap-2 sm:px-3 sm:py-2">
            <SearchIcon
              className={`shrink-0 ${isEconomy ? "text-emerald-200/50" : "text-sky-200/50"}`}
            />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={chrome.searchPlaceholder}
              className={`min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:opacity-35 sm:text-sm ${
                isEconomy
                  ? "text-emerald-50/90 placeholder:text-emerald-100/35"
                  : "text-sky-50/90 placeholder:text-sky-100/35"
              }`}
            />
            {query ? (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs transition hover:opacity-90 ${
                  isEconomy ? "text-emerald-100/40 hover:text-emerald-50" : "text-sky-100/40 hover:text-sky-50"
                }`}
                aria-label="검색어 지우기"
              >
                ✕
              </button>
            ) : null}
            {onAskLayersOpen ? (
              <button
                type="button"
                onClick={onAskLayersOpen}
                aria-haspopup="dialog"
                aria-label={askLayersLabel || (isEconomy ? "Ask layers" : "묻기")}
                title={askLayersLabel || (isEconomy ? "Ask → layers" : "묻기 → 레이어")}
                className={`flex h-8 shrink-0 items-center gap-1 rounded-lg border px-2 text-[11px] font-medium transition sm:text-xs ${
                  isEconomy
                    ? "border-emerald-300/35 bg-emerald-400/15 text-emerald-50 hover:border-emerald-300/55 hover:bg-emerald-400/25"
                    : "border-sky-300/35 bg-sky-400/15 text-sky-50 hover:border-sky-300/55 hover:bg-sky-400/25"
                }`}
              >
                <span aria-hidden>✧</span>
                <span className="hidden xs:inline sm:inline">
                  {askLayersLabel || (isEconomy ? "Ask" : "묻기")}
                </span>
              </button>
            ) : null}
            {!isEconomy ? (
              <button
                type="button"
                aria-expanded={hubMenuOpen}
                aria-label="탐색 메뉴"
                onClick={() => {
                  setHubMenuOpen((v) => !v);
                  setOpenHubId(null);
                }}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
                  hubMenuOpen
                    ? "border-sky-300/40 bg-sky-400/20 text-sky-50"
                    : "border-sky-200/20 bg-sky-400/10 text-sky-100/80 hover:border-sky-300/35"
                }`}
              >
                <ChevronDown className={`transition ${hubMenuOpen ? "rotate-180" : ""}`} />
              </button>
            ) : (
              <button
                type="button"
                aria-expanded={navOpen}
                aria-label="탐색 메뉴"
                onClick={() => setNavOpen((v) => !v)}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
                  navOpen
                    ? "border-emerald-300/40 bg-emerald-400/20 text-emerald-50"
                    : "border-emerald-200/20 bg-emerald-400/10 text-emerald-100/80 hover:border-emerald-300/35"
                }`}
              >
                <ChevronDown className={`transition ${navOpen ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>

          {searchResults.length > 0 && (
            <div
              className={`absolute left-0 right-0 top-full z-40 max-h-72 overflow-y-auto rounded-b-2xl border border-t-0 ${borderTone} bg-[#0f1d35]/92 shadow-2xl backdrop-blur-xl`}
            >
              {searchResults.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => handleSearchPick(place)}
                  className={`flex w-full items-center justify-between border-b ${borderTone} px-4 py-2.5 text-left text-sm transition last:border-b-0 ${accentHover}`}
                >
                  <span>
                    <span className={`block ${isEconomy ? "text-emerald-50/95" : "text-sky-50/95"}`}>
                      {place.name}
                    </span>
                    <span className={`text-xs ${isEconomy ? "text-emerald-100/40" : "text-sky-100/40"}`}>
                      {place.country}
                    </span>
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${
                      isEconomy
                        ? "border-emerald-200/15 text-emerald-100/45"
                        : "border-sky-200/15 text-sky-100/45"
                    }`}
                  >
                    {place.type}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {!isEconomy ? (
          <div
            className={`overflow-hidden rounded-b-2xl border ${borderTone} border-t-0 ${menuBg} shadow-xl backdrop-blur-xl transition-all duration-300 ease-out ${
              hubMenuOpen
                ? "max-h-[min(78vh,36rem)] opacity-100"
                : "pointer-events-none max-h-0 border-transparent opacity-0 shadow-none"
            }`}
          >
            <div className="max-h-[min(78vh,36rem)] space-y-2 overflow-y-auto px-2 py-2">
              <button
                type="button"
                onClick={() => handleHubNavigate(selectionForRegimeOverview())}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-300/25 bg-violet-500/15 px-2 py-2 text-[11px] font-semibold tracking-wide text-violet-50 transition hover:border-violet-200/45 hover:bg-violet-500/25"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-violet-300" />
                반서방국 분쟁사
                <span className="text-[9px] font-normal text-violet-200/60">11대 현장</span>
              </button>
              <ul className="space-y-1">
                {HUB_DEFINITIONS.map((hub) => (
                  <HubDropdown
                    key={hub.id}
                    hub={hub}
                    open={openHubId === hub.id}
                    onToggle={() =>
                      setOpenHubId((prev) => (prev === hub.id ? null : hub.id))
                    }
                    onNavigate={handleHubNavigate}
                  />
                ))}
              </ul>
              {compact && compactMenuExtra ? (
                <div className="space-y-2 border-t border-sky-200/10 pt-2">{compactMenuExtra}</div>
              ) : null}
            </div>
          </div>
        ) : null}

        {isEconomy ? (
          <div
            className={`overflow-hidden rounded-b-2xl border ${borderTone} border-t-0 ${menuBg} shadow-xl backdrop-blur-xl transition-all duration-300 ease-out ${
              navOpen ? "max-h-[80vh] opacity-100" : "pointer-events-none max-h-0 opacity-0"
            }`}
          >
            <div className="px-4 py-3">
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <p className="text-[10px] uppercase tracking-[0.28em] text-emerald-200/80">
                  {chrome.navHeaderLabel}
                </p>
                <p className="text-[10px] text-emerald-100/45">
                  {liveStatus === "loading" && "로컬 데이터 로딩 중…"}
                  {liveStatus === "ok" && lastUpdated && `로컬 갱신 ${formatShortTime(lastUpdated)}`}
                  {liveStatus === "error" && "로컬 데이터 로드 실패"}
                  {liveStatus === "idle" && "로컬 데이터"}
                </p>
              </div>

              <div className="flex flex-wrap items-start justify-center gap-x-8 gap-y-4">
                {navGroups.map((group) => (
                  <div key={group.id} className="min-w-[260px]">
                    <p className="mb-2 px-1 text-[10px] uppercase tracking-[0.22em] text-emerald-100/55">
                      {group.label}
                    </p>
                    <ul className="space-y-1">
                      {group.items.map((item) => {
                        const key = `${group.id}:${item.id}`;
                        const isOpen = openKey === key;
                        const hasSubs = item.subItems.length > 0;

                        return (
                          <li
                            key={item.id}
                            className="relative"
                            onMouseEnter={() => hasSubs && setOpenKey(key)}
                            onMouseLeave={() => isOpen && setOpenKey(null)}
                          >
                            <button
                              type="button"
                              onClick={() => handleSelect(group, item)}
                              className={`flex w-full items-center justify-between gap-2 rounded-full px-3 py-1.5 text-left text-xs transition-all duration-200 ${
                                isOpen
                                  ? accentActive
                                  : "text-emerald-100/85 hover:bg-white/8 hover:text-white"
                              }`}
                            >
                              <span className="truncate">{item.label}</span>
                              {hasSubs && (
                                <ChevronDown
                                  className={`shrink-0 opacity-45 transition-transform duration-200 ${isOpen ? "rotate-180 opacity-70" : ""}`}
                                />
                              )}
                            </button>

                            {hasSubs && (
                              <div
                                className={`overflow-hidden transition-all duration-300 ease-out ${
                                  isOpen ? "mt-1 max-h-56 opacity-100" : "max-h-0 opacity-0"
                                }`}
                              >
                                <div className="space-y-0.5 rounded-xl bg-[#0f1d35]/60 py-1 pl-2 pr-1">
                                  {item.subItems.map((sub) => (
                                    <button
                                      key={sub.id}
                                      type="button"
                                      onClick={() => handleSelect(group, sub, item.label)}
                                      className={`block w-full rounded-lg px-2.5 py-2 text-left text-xs transition ${accentHover}`}
                                    >
                                      <span className="block text-emerald-50/95">{sub.label}</span>
                                      <span className="mt-0.5 block text-[10px] leading-4 text-emerald-100/40">
                                        {sub.description}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
              {compact && compactMenuExtra ? (
                <div className="mt-3 space-y-2 border-t border-emerald-200/10 pt-3">{compactMenuExtra}</div>
              ) : null}
            </div>
          </div>
        ) : null}
      </nav>

      {belowNav ? (
        <div
          className={`pointer-events-auto z-[76] flex justify-center ${
            aboveNav ? "mt-3" : "mt-2.5"
          }`}
        >
          {belowNav}
        </div>
      ) : null}
      </div>
    </div>
  );
}

function HubDropdown({
  hub,
  open,
  onToggle,
  onNavigate,
}: {
  hub: HubDefinition;
  open: boolean;
  onToggle: () => void;
  onNavigate: (selection: NavSelection) => void;
}) {
  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-2 rounded-full border px-3 py-2 text-left text-xs transition ${
          open
            ? "border-sky-300/35 bg-sky-400/15 text-sky-50"
            : "border-sky-200/15 bg-sky-400/5 text-sky-100/85 hover:border-sky-300/30 hover:bg-sky-400/10"
        }`}
        style={open ? { boxShadow: `inset 0 0 0 1px ${hub.color}` } : undefined}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: hub.color }}
            aria-hidden
          />
          <span className="truncate font-medium">{hub.label}</span>
        </span>
        <ChevronDown className={`shrink-0 opacity-50 transition ${open ? "rotate-180" : ""}`} />
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          open ? "mt-1 max-h-[28rem] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="space-y-0.5 rounded-xl border border-sky-200/10 bg-[#0c1a30]/75 py-1.5 pl-2 pr-1.5">
          <button
            type="button"
            onClick={() => onNavigate(selectionForHubNetwork(hub))}
            className="w-full rounded-lg px-2.5 py-2 text-left text-xs text-sky-50 transition hover:bg-sky-400/10"
          >
            <span className="font-medium">{hub.label} · 국경 · 우군 관계망</span>
            <span className="mt-0.5 block text-[10px] leading-4 text-sky-100/45">{hub.description}</span>
          </button>

          <p className="mt-1.5 px-2 text-[9px] uppercase tracking-[0.18em] text-sky-200/45">우군 국가</p>
          <div className="mt-0.5 space-y-0.5">
            {hub.allies.map((ally) => (
              <button
                key={ally.code}
                type="button"
                onClick={() => onNavigate(selectionForAlly(hub, ally))}
                className="block w-full rounded-md px-2.5 py-1.5 text-left text-[11px] text-sky-100/90 transition hover:bg-white/5"
              >
                {ally.nameKo}
              </button>
            ))}
          </div>

          <p className="mt-1.5 px-2 text-[9px] uppercase tracking-[0.18em] text-sky-200/45">
            영유권 주장 및 영향
          </p>
          <div className="mt-0.5 space-y-0.5">
            {hub.claims.map((claim) => (
              <button
                key={claim.id}
                type="button"
                onClick={() => onNavigate(selectionForClaim(hub, claim))}
                className="block w-full rounded-md px-2.5 py-1.5 text-left text-[11px] transition hover:bg-white/5"
              >
                <span className="text-sky-50/95">{claim.label}</span>
                <span className="mt-0.5 block text-[10px] leading-4 text-sky-100/40">{claim.description}</span>
              </button>
            ))}
          </div>

          <div className="mt-1.5 grid grid-cols-1 gap-0.5 border-t border-sky-200/10 pt-1.5">
            <button
              type="button"
              onClick={() => onNavigate(selectionForArms(hub))}
              className="rounded-md px-2.5 py-2 text-left text-[11px] text-orange-100/90 transition hover:bg-orange-400/10"
            >
              무기거래 (SIPRI)
            </button>
            <button
              type="button"
              onClick={() => onNavigate(selectionForRegime(hub))}
              className="rounded-md px-2.5 py-2 text-left text-[11px] text-violet-100/90 transition hover:bg-violet-400/10"
            >
              반서방국 충돌사
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className={className} aria-hidden>
      <path
        d="M2.5 4.5L6 8L9.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatShortTime(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}
