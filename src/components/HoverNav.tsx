"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getNavMenuGroups } from "@/data/econNavRegions";
import {
  HUB_DEFINITIONS,
  selectionForAlly,
  selectionForArms,
  selectionForClaim,
  selectionForHubNetwork,
  selectionForWestpacPulseOverview,
  selectionForDisputesOverview,
  type HubDefinition,
} from "@/data/hubNav";
import { SIPRI_ARMS_LENS_ENABLED } from "@/lib/licensing/sipriPolicy";
import {
  toNavSelection,
  type NavMenuGroup,
  type NavMenuItem,
  type NavSelection,
  type NavSubItem,
} from "@/data/navRegions";
import type { SearchPlace } from "@/data/geoTypes";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { t } from "@/lib/uiStrings";
import { getViewerChrome } from "@/lib/viewerChrome";
import type { ViewerMode } from "@/lib/viewPackages";
import { useBasemapTone } from "@/hooks/useBasemapTone";

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
  /** nav 본문·드롭다운 바로 아래 (지정학/지경학 스위치 등) — 메뉴 열림에 따라 함께 이동 */
  belowNav?: ReactNode;
  /** 데스크톱 확장 시 우측 도구·경보 슬롯 (포털 타깃 #hover-nav-desktop-tools) */
  showDesktopToolsSlot?: boolean;
  /** 검색창 옆 「묻기」— 레이어 자동 ON 오버레이 */
  onAskLayersOpen?: () => void;
  askLayersLabel?: string;
  /** UI 문구 언어 (이벤트 메뉴 등) */
  labelLanguage?: LabelLanguage;
  /* forceVisible 삭제 (P2-5) — 컴포넌트가 읽지도 않던 prop.
     상단 nav의 hover-reveal 모델은 폐기됐고 데스크톱은 상시 고정이다.
     (컴포넌트 이름 `HoverNav`도 그 시절 잔재 — 리네임은 별건) */
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
  belowNav,
  showDesktopToolsSlot = false,
  onAskLayersOpen,
  askLayersLabel,
  labelLanguage = "ko",
}: HoverNavProps) {
  const [navOpen, setNavOpen] = useState(false);
  const [hubMenuOpen, setHubMenuOpen] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [openHubId, setOpenHubId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const isEconomy = viewerMode === "economy";
  const light = useBasemapTone() === "light";
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

  const borderTone = light
    ? isEconomy
      ? "border-emerald-800/20"
      : "border-slate-400/25"
    : isEconomy
      ? "border-emerald-200/10"
      : "border-sky-200/10";
  const bgTone = light
    ? "bg-white/95"
    : isEconomy
      ? "bg-[#0a1f18]/45"
      : "bg-[#162a48]/45";
  const menuBg = light
    ? "bg-white/98"
    : isEconomy
      ? "bg-[#0a1f18]/75"
      : "bg-[#162a48]/75";
  const accentHover = light
    ? isEconomy
      ? "hover:bg-emerald-700/10"
      : "hover:bg-cyan-700/10"
    : isEconomy
      ? "hover:bg-emerald-400/10"
      : "hover:bg-sky-400/10";
  const accentActive = light
    ? isEconomy
      ? "bg-emerald-700/12 text-emerald-950 shadow-[inset_0_0_0_1px_rgba(4,120,87,0.35)]"
      : "bg-cyan-700/12 text-slate-900 shadow-[inset_0_0_0_1px_rgba(14,116,144,0.35)]"
    : isEconomy
      ? "bg-emerald-400/15 text-emerald-50 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.25)]"
      : "bg-sky-400/15 text-sky-50 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.25)]";

  const menuExpanded = isEconomy ? navOpen : hubMenuOpen;

  /**
   * 데스크톱: 상시 고정 바.
   * `--hover-nav-height` / `--hover-nav-base-height` 모두 실제 크롬 높이
   * (지도 오프셋·우상단 칩이 같은 기준을 쓰도록 동기화).
   */
  useEffect(() => {
    const root = document.documentElement;
    if (compact) {
      root.style.setProperty("--hover-nav-height", "0px");
      root.style.setProperty("--hover-nav-base-height", "0px");
      return;
    }
    const el = chromeRef.current;
    if (!el) return;
    const publish = () => {
      const h = Math.max(0, Math.ceil(el.getBoundingClientRect().height));
      root.style.setProperty("--hover-nav-height", `${h}px`);
      root.style.setProperty("--hover-nav-base-height", `${h}px`);
    };
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, [compact, belowNav, showDesktopToolsSlot, menuExpanded]);

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-0 flex flex-col ${
        menuExpanded ? "z-[300]" : "z-[200]"
      }`}
      style={{
        paddingTop: "max(0.35rem, env(safe-area-inset-top, 0px))",
      }}
    >
      <div
        ref={chromeRef}
        className={`pointer-events-auto flex w-full flex-col items-center ${
          compact ? "px-[3.4rem] sm:px-14" : "mt-1.5 px-2 sm:px-3"
        }`}
      >
      <div className="flex w-full flex-col items-center">
      {/* 메뉴 드롭다운이 토글 줄(belowNav) 위에 오도록 — expanded 시 nav만 높은 스택 */}
      <nav
        id="app-hover-nav"
        ref={navRef}
        className={`relative w-full ${
          menuExpanded ? "z-[300]" : "z-[200]"
        } ${
          compact
            ? "max-w-full"
            : isEconomy
              ? `max-w-md sm:max-w-lg ${menuExpanded ? "max-w-3xl sm:max-w-4xl" : ""}`
              : showDesktopToolsSlot
                ? "max-w-5xl sm:max-w-6xl"
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
              className={`shrink-0 ${
                light
                  ? "text-slate-500"
                  : isEconomy
                    ? "text-emerald-200/50"
                    : "text-sky-200/50"
              }`}
            />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={chrome.searchPlaceholder}
              className={`min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:opacity-35 sm:text-sm ${
                light
                  ? "text-slate-800 placeholder:text-slate-500"
                  : isEconomy
                    ? "text-emerald-50/90 placeholder:text-emerald-100/35"
                    : "text-sky-50/90 placeholder:text-sky-100/35"
              }`}
            />
            {query ? (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs transition hover:opacity-90 ${
                  light
                    ? "text-slate-500 hover:text-slate-800"
                    : isEconomy
                      ? "text-emerald-100/40 hover:text-emerald-50"
                      : "text-sky-100/40 hover:text-sky-50"
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
                className={`flex h-8 shrink-0 items-center gap-1 rounded-lg border px-2 text-meta font-medium transition sm:text-xs ${
                  light
                    ? isEconomy
                      ? "border-emerald-700/35 bg-emerald-700/10 text-emerald-950 hover:border-emerald-700/55 hover:bg-emerald-700/15"
                      : "border-cyan-700/35 bg-cyan-700/10 text-slate-900 hover:border-cyan-700/55 hover:bg-cyan-700/15"
                    : isEconomy
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
                aria-label="화약고 · 지정학 아카이브 메뉴"
                title="화약고 · 지정학적 아카이브"
                onClick={() => {
                  setHubMenuOpen((v) => !v);
                  setOpenHubId(null);
                }}
                className={`flex h-8 shrink-0 items-center gap-1 rounded-lg border px-2 text-meta font-medium transition sm:text-xs ${
                  hubMenuOpen
                    ? "border-sky-300/40 bg-sky-400/20 text-sky-50"
                    : "border-sky-200/20 bg-sky-400/10 text-sky-100/80 hover:border-sky-300/35"
                }`}
              >
                <span className="hidden xs:inline sm:inline">
                  {t("navPowderKeg", labelLanguage)}
                </span>
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
              className={`absolute left-0 right-0 top-full z-[400] max-h-72 overflow-y-auto rounded-b-2xl border border-t-0 ${borderTone} ${menuBg} shadow-2xl backdrop-blur-xl`}
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
                    className={`rounded-full border px-2 py-0.5 text-micro uppercase ${
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
            className={`relative z-[400] overflow-hidden rounded-b-2xl border ${borderTone} border-t-0 ${menuBg} shadow-xl backdrop-blur-xl transition-all duration-300 ease-out ${
              hubMenuOpen
                ? "max-h-[min(78vh,36rem)] opacity-100"
                : "pointer-events-none max-h-0 border-transparent opacity-0 shadow-none"
            }`}
          >
            <div className="max-h-[min(78vh,36rem)] space-y-2 overflow-y-auto px-2 py-2">
              <button
                type="button"
                onClick={() => handleHubNavigate(selectionForDisputesOverview())}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-300/25 bg-rose-500/15 px-2 py-2 text-meta font-semibold tracking-wide text-rose-50 transition hover:border-rose-200/45 hover:bg-rose-500/25"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-rose-300" />
                {t("disputesOverviewNav", labelLanguage)}
                <span className="text-micro font-normal text-rose-200/60">
                  {t("disputesOverviewNavHint", labelLanguage)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleHubNavigate(selectionForWestpacPulseOverview())}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-cyan-300/25 bg-cyan-500/15 px-2 py-2 text-meta font-semibold tracking-wide text-cyan-50 transition hover:border-cyan-200/45 hover:bg-cyan-500/25"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                {t("westpacShipMovesNav", labelLanguage)}
                <span className="text-micro font-normal text-cyan-200/60">
                  {t("westpacShipMovesNavHint", labelLanguage)}
                </span>
              </button>
              <ul className="space-y-1">
                {HUB_DEFINITIONS.map((hub) => (
                  <HubDropdown
                    key={hub.id}
                    hub={hub}
                    open={openHubId === hub.id}
                    labelLanguage={labelLanguage}
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
            className={`relative z-[400] overflow-hidden rounded-b-2xl border ${borderTone} border-t-0 ${menuBg} shadow-xl backdrop-blur-xl transition-all duration-300 ease-out ${
              navOpen ? "max-h-[80vh] opacity-100" : "pointer-events-none max-h-0 opacity-0"
            }`}
          >
            <div className="px-4 py-3">
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <p className="text-micro uppercase tracking-[0.28em] text-emerald-200/80">
                  {chrome.navHeaderLabel}
                </p>
                <p className="text-micro text-emerald-100/45">
                  {liveStatus === "loading" && "로컬 데이터 로딩 중…"}
                  {liveStatus === "ok" && lastUpdated && `로컬 갱신 ${formatShortTime(lastUpdated)}`}
                  {liveStatus === "error" && "로컬 데이터 로드 실패"}
                  {liveStatus === "idle" && "로컬 데이터"}
                </p>
              </div>

              <div className="flex flex-wrap items-start justify-center gap-x-8 gap-y-4">
                {navGroups.map((group) => (
                  <div key={group.id} className="min-w-[260px]">
                    <p className="mb-2 px-1 text-micro uppercase tracking-[0.22em] text-emerald-100/55">
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
                                      <span className="mt-0.5 block text-micro leading-4 text-emerald-100/40">
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

      {showDesktopToolsSlot ? (
        <div
          id="hover-nav-desktop-tools"
          className={`mt-2 flex w-full max-w-5xl flex-wrap items-center justify-center gap-3 sm:max-w-6xl ${
            // 도구 줄(주요전장·꿀팁·메뉴)이 belowNav(인텔/지형·레이어)보다 항상 위
            // — 메뉴 드롭다운이 토글 줄에 가리지 않도록
            menuExpanded ? "relative z-[100]" : "relative z-[200]"
          }`}
        />
      ) : null}

      {belowNav ? (
        <div
          className={`mt-2.5 flex justify-center ${
            menuExpanded ? "relative z-[100]" : "relative z-[100]"
          }`}
        >
          {belowNav}
        </div>
      ) : null}
      </div>
      </div>
    </div>
  );
}

function HubDropdown({
  hub,
  open,
  labelLanguage,
  onToggle,
  onNavigate,
}: {
  hub: HubDefinition;
  open: boolean;
  labelLanguage: LabelLanguage;
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
            <span className="mt-0.5 block text-micro leading-4 text-sky-100/45">{hub.description}</span>
          </button>

          <p className="mt-1.5 px-2 text-micro uppercase tracking-[0.18em] text-sky-200/45">
            {t("navAllyCountries", labelLanguage)}
          </p>
          <div className="mt-0.5 space-y-0.5">
            {hub.allies.map((ally) => (
              <button
                key={ally.code}
                type="button"
                onClick={() => onNavigate(selectionForAlly(hub, ally))}
                className="block w-full rounded-md px-2.5 py-1.5 text-left text-meta text-sky-100/90 transition hover:bg-white/5"
              >
                {ally.nameKo}
              </button>
            ))}
          </div>

          <p className="mt-1.5 px-2 text-micro uppercase tracking-[0.18em] text-sky-200/45">
            영유권 주장 및 영향
          </p>
          <div className="mt-0.5 space-y-0.5">
            {hub.claims.map((claim) => (
              <button
                key={claim.id}
                type="button"
                onClick={() => onNavigate(selectionForClaim(hub, claim))}
                className="block w-full rounded-md px-2.5 py-1.5 text-left text-meta transition hover:bg-white/5"
              >
                <span className="text-sky-50/95">{claim.label}</span>
                <span className="mt-0.5 block text-micro leading-4 text-sky-100/40">{claim.description}</span>
              </button>
            ))}
          </div>

          <div className="mt-1.5 grid grid-cols-1 gap-0.5 border-t border-sky-200/10 pt-1.5">
            {SIPRI_ARMS_LENS_ENABLED ? (
              <button
                type="button"
                onClick={() => onNavigate(selectionForArms(hub))}
                className="rounded-md px-2.5 py-2 text-left text-meta text-orange-100/90 transition hover:bg-orange-400/10"
              >
                무기거래 (SIPRI)
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onNavigate(selectionForDisputesOverview())}
              className="rounded-md px-2.5 py-2 text-left text-meta text-rose-100/90 transition hover:bg-rose-400/10"
            >
              영토분쟁 아카이브
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
