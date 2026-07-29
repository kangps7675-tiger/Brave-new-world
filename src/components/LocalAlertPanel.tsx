"use client";

import type { DisputeAlert } from "@/lib/disputeAlerts";

const TENSION_DOT: Record<DisputeAlert["tension"], string> = {
  high: "rgba(248, 113, 113, 0.95)",
  medium: "rgba(251, 191, 36, 0.92)",
  low: "rgba(148, 163, 184, 0.85)",
};

const TENSION_LABEL: Record<DisputeAlert["tension"], string> = {
  high: "높음",
  medium: "중간",
  low: "낮음",
};

type LocalAlertPanelProps = {
  alerts: DisputeAlert[];
  dataStatus: "loading" | "ok" | "error";
  errorMessage?: string | null;
  onSelect: (alert: DisputeAlert) => void;
  onClose: () => void;
};

export function LocalAlertPanel({
  alerts,
  dataStatus,
  errorMessage,
  onSelect,
  onClose,
}: LocalAlertPanelProps) {
  return (
    <div className="pointer-events-auto absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-4 z-[600] w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-orange-300/20 bg-[#140f0a]/82 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 border-b border-orange-300/15 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-micro uppercase tracking-[0.24em] text-orange-200/75">로컬 경보</p>
          <p className="mt-0.5 text-xs text-orange-50/90">분쟁·요충지 · 로컬 데이터</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-orange-300/25 bg-orange-300/10 px-2 py-0.5 text-micro text-orange-100/80">
            {dataStatus === "loading" ? "로딩 중" : dataStatus === "error" ? "오류" : `${alerts.length}건`}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="로컬 경보 닫기"
            className="rounded-lg border border-orange-300/25 px-2 py-1 text-xs text-orange-100/60 transition hover:border-orange-200/40 hover:text-orange-50"
          >
            ✕
          </button>
        </div>
      </div>

      {alerts.length === 0 ? (
        <p className="px-3 py-4 text-xs leading-5 text-slate-400">
          {dataStatus === "loading"
            ? "로컬 분쟁 데이터를 모으는 중…"
            : dataStatus === "error"
              ? errorMessage || "app-data.json 로드 실패. 터미널에서 npm run data:build:lite 실행 후 새로고침하세요."
              : "표시할 로컬 분쟁 경보가 없습니다."}
        </p>
      ) : (
        <ul className="max-h-[min(42vh,320px)] divide-y divide-orange-300/10 overflow-y-auto">
          {alerts.map((alert) => {
            const regionTitle = alert.menuRegion.parentLabel
              ? `${alert.menuRegion.parentLabel} · ${alert.menuRegion.label}`
              : alert.menuRegion.label;

            return (
              <li key={alert.id}>
                <button
                  type="button"
                  onClick={() => onSelect(alert)}
                  className="flex w-full gap-3 px-3 py-2.5 text-left transition hover:bg-orange-300/10"
                >
                  <span className="relative mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                    <span
                      className="relative h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: TENSION_DOT[alert.tension] }}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-meta">
                      <span className="font-medium text-orange-50">{alert.name}</span>
                      <span className="rounded-full bg-orange-300/10 px-1.5 py-0.5 text-micro text-orange-100/80">
                        긴장 {TENSION_LABEL[alert.tension]}
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-meta text-orange-100/70">
                      {regionTitle}
                    </span>
                    <span className="mt-0.5 block truncate text-meta text-slate-400">
                      {alert.type || "분쟁 구역"}
                      {alert.matchedEventCount > 0 ? ` · 매칭 ${alert.matchedEventCount}` : ""}
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
