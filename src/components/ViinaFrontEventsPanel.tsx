"use client";

import type { ViinaFrontEvent } from "@/lib/viinaFrontEvents";
import { viinaEventDetail, viinaEventKindLabel } from "@/lib/viinaFrontEvents";
import { formatViinaControlDate } from "@/lib/viinaFrontEvents";

type ViinaFrontEventsPanelProps = {
  events: ViinaFrontEvent[];
  controlDate: string | null;
  ruCellCount: number;
  loading?: boolean;
  onFlyTo?: (event: ViinaFrontEvent) => void;
};

function kindBadgeClass(kind: ViinaFrontEvent["kind"]): string {
  if (kind === "ru-occupied") return "border-red-400/45 bg-red-500/20 text-red-100";
  if (kind === "contested") return "border-amber-400/45 bg-amber-500/15 text-amber-100";
  return "border-sky-400/35 bg-sky-500/15 text-sky-100";
}

export function ViinaFrontEventsPanel({
  events,
  controlDate,
  ruCellCount,
  loading = false,
  onFlyTo,
}: ViinaFrontEventsPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-4 mt-3 shrink-0 rounded-xl border border-red-400/25 bg-red-950/20 px-3 py-2.5">
        <p className="text-xs font-semibold text-red-100">VIINA · 우크라이나 전선</p>
        <p className="mt-1 text-meta leading-5 text-red-200/65">
          점령·경합 셀 기준 전선 이벤트 · 화면 표시 전용 (ODbL Produced Work)
        </p>
        <p className="mt-1.5 text-meta text-slate-400">
          기준일 {formatViinaControlDate(controlDate)} · RU {ruCellCount.toLocaleString()}셀 · 이벤트{" "}
          {events.length.toLocaleString()}건
        </p>
      </div>

      <div className="intel-scroll-y min-h-0 flex-1 px-1 py-2">
        {loading ? (
          <p className="py-12 text-center text-sm text-slate-500">VIINA 전선 데이터 동기화 중…</p>
        ) : events.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">
            표시할 전선 이벤트가 없습니다. 우크라이나 전선 레이어를 켜 주세요.
          </p>
        ) : (
          <ul className="mx-3 divide-y divide-red-400/10 overflow-hidden rounded-xl border border-red-400/15 bg-[#0a1428]/60">
            {events.map((event) => (
              <li key={event.id} className="relative px-4 py-3 transition hover:bg-white/5">
                {onFlyTo ? (
                  <button
                    type="button"
                    onClick={() => onFlyTo(event)}
                    className="absolute right-3 top-3 z-10 rounded-lg border border-sky-400/25 bg-sky-950/40 px-2 py-1 text-micro font-medium text-sky-100 hover:border-sky-300/50"
                  >
                    🎯 지도
                  </button>
                ) : null}
                <div className="flex flex-wrap items-center gap-2 pr-16">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-micro font-semibold ${kindBadgeClass(event.kind)}`}
                  >
                    {viinaEventKindLabel(event.kind)}
                  </span>
                  <span className="text-micro uppercase tracking-wide text-slate-500">VIINA</span>
                </div>
                <p className="mt-1.5 text-sm font-semibold leading-snug text-slate-50">{event.name}</p>
                <p className="mt-1 text-xs text-slate-400">{viinaEventDetail(event)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
