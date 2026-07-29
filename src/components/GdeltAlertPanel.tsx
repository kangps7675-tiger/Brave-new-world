"use client";

import type { MenuCoreAlert } from "@/lib/regionFilter";
import { EvidenceTierBadge } from "@/components/EvidenceTierBadge";
import { LocationPinIcon } from "@/components/LocationPinIcon";
import { TIER_LABELS, isFreshEvent } from "@/data/eventTiers";
import {
  gdeltImportanceShortLabel,
  isMarkedGdeltImportance,
} from "@/lib/gdeltImportance";

type GdeltAlertPanelProps = {
  alerts: MenuCoreAlert[];
  liveStatus: "idle" | "loading" | "ok" | "error";
  selectionLabel?: string | null;
  errorMessage?: string | null;
  onSelect: (alert: MenuCoreAlert) => void;
  onClose?: () => void;
  /** true면 뉴스창 탭 내부에 끼워지는 전체폭 블록으로 렌더 (플로팅 카드 스타일 X) */
  fullPage?: boolean;
};

export function GdeltAlertPanel({
  alerts,
  liveStatus,
  selectionLabel,
  errorMessage,
  onSelect,
  onClose,
  fullPage = false,
}: GdeltAlertPanelProps) {
  return (
    <div
      className={
        fullPage
          ? "flex min-h-0 flex-1 flex-col"
          : "pointer-events-auto absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-4 z-[600] w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-orange-300/20 bg-[#140f0a]/82 shadow-2xl backdrop-blur-md"
      }
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-orange-300/15 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-micro uppercase tracking-[0.24em] text-orange-200/75">GDELT 뉴스 알림</p>
          <p className="mt-0.5 text-xs text-orange-50/90">
            {selectionLabel ? `${selectionLabel} · 메뉴 핵심 뉴스` : "메뉴 연관 핵심 뉴스"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-orange-300/25 bg-orange-300/10 px-2 py-0.5 text-micro text-orange-100/80">
            {liveStatus === "loading"
              ? "동기화 중"
              : liveStatus === "error"
                ? "오프라인"
                : `${alerts.length}건`}
          </span>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="GDELT 경보 닫기"
              className="rounded-lg border border-orange-300/25 px-2 py-1 text-xs text-orange-100/60 transition hover:border-orange-200/40 hover:text-orange-50"
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>

      {alerts.length === 0 ? (
        <p className="px-3 py-4 text-xs leading-5 text-slate-400">
          {liveStatus === "loading"
            ? "메뉴와 연관된 핵심 속보를 모으는 중…"
            : liveStatus === "error"
              ? errorMessage || "GDELT 연결 실패. 레이어 패널에서 새로고침하거나 잠시 후 다시 시도하세요."
              : "표시할 지정학 속보가 없습니다. 상단 메뉴에서 지역을 고르거나 새로고침을 눌러 보세요."}
        </p>
      ) : (
        <ul
          className={
            fullPage
              ? "intel-scroll-y min-h-0 flex-1 divide-y divide-orange-300/10"
              : "intel-scroll-y max-h-[min(42vh,320px)] divide-y divide-orange-300/10"
          }
        >
          {alerts.map((alert) => {
            const regionTitle = alert.menuRegion.parentLabel
              ? `${alert.menuRegion.parentLabel} · ${alert.menuRegion.label}`
              : alert.menuRegion.label;
            const fresh = isFreshEvent(alert);
            const marked = isMarkedGdeltImportance(alert.importanceGrade);

            return (
              <li key={alert.id}>
                <button
                  type="button"
                  onClick={() => onSelect(alert)}
                  className={`flex w-full gap-3 px-3 py-2.5 text-left transition hover:bg-orange-300/10 ${
                    marked ? "bg-orange-400/[0.06]" : ""
                  }`}
                >
                  <span className="relative mt-0.5 flex shrink-0 items-end">
                    <LocationPinIcon tier={alert.eventTier} size={16} fresh={fresh || marked} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-meta">
                      {marked ? (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-micro font-semibold ${
                            alert.importanceGrade === "S"
                              ? "border border-yellow-300/50 bg-yellow-400/20 text-yellow-100"
                              : "border border-orange-300/40 bg-orange-400/15 text-orange-100"
                          }`}
                        >
                          {gdeltImportanceShortLabel(alert.importanceGrade)}
                        </span>
                      ) : (
                        <span className="rounded-full border border-orange-300/30 bg-orange-400/10 px-1.5 py-0.5 text-micro text-orange-100/90">
                          뉴스
                        </span>
                      )}
                      {(
                        <EvidenceTierBadge tier="unverified" lang="ko" />
                      )}
                      <span className="font-medium text-orange-50">
                        {TIER_LABELS[alert.eventTier]}
                      </span>
                      {fresh && (
                        <span className="rounded-full bg-yellow-400/15 px-1.5 py-0.5 text-micro text-yellow-200">
                          최신
                        </span>
                      )}
                      {alert.eventDate && (
                        <span className="text-slate-500">{alert.eventDate}</span>
                      )}
                    </span>
                    <span className="mt-1 block truncate text-meta text-orange-100/70">
                      {regionTitle}
                    </span>
                    <span className="mt-0.5 block truncate text-meta text-slate-400">
                      {alert.category}
                      {alert.actor1Country || alert.actor2Country
                        ? ` · ${alert.actor1Country || "?"} ↔ ${alert.actor2Country || "?"}`
                        : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
