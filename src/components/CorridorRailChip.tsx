"use client";

import type { SelectedCorridor } from "@/lib/corridorSelection";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { zc } from "@/lib/uiStack";

type Props = {
  corridor: SelectedCorridor;
  lang?: LabelLanguage;
  onDismiss: () => void;
};

function TonKmSparkline({
  series,
}: {
  series: { year: string; value: number }[];
}) {
  if (series.length < 2) return null;
  const w = 260;
  const h = 48;
  const pad = 4;
  const values = series.map((s) => s.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = series
    .map((s, i) => {
      const x = pad + (i / (series.length - 1)) * (w - pad * 2);
      const y = h - pad - ((s.value - min) / span) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-1 h-12 w-full" aria-hidden>
      <polyline
        fill="none"
        stroke="rgba(251,191,36,0.9)"
        strokeWidth="1.6"
        points={pts}
      />
    </svg>
  );
}

function dualLabel(kind: SelectedCorridor["dualSignal"], en: boolean): string | null {
  if (!kind) return null;
  if (kind === "aligned") return en ? "USD ↔ ton-km aligned" : "USD ↔ ton-km 정렬";
  if (kind === "price_over_volume") {
    return en
      ? "USD high · ton-km low (reroute / sanction hypothesis)"
      : "무역액↑ · 물리량↓ (우회·제재 가설)";
  }
  return en ? "ton-km high · USD low" : "물리량↑ · 무역액↓";
}

function connectivityLabel(
  kind: NonNullable<SelectedCorridor["modalStress"]>["connectivityDual"],
  en: boolean,
): string | null {
  if (!kind) return null;
  if (kind === "aligned") return en ? "LSCI ↔ rail aligned" : "LSCI ↔ 철도 정렬";
  if (kind === "sea_over_rail") {
    return en ? "Sea connectivity high · rail ton-km low" : "해운 연결성↑ · 철도 물리량↓";
  }
  return en ? "Rail ton-km high · sea connectivity low" : "철도 물리량↑ · 해운 연결성↓";
}

function hypothesisLabel(h: string | null, en: boolean): string | null {
  if (!h) return null;
  const map: Record<string, { ko: string; en: string }> = {
    dual_pressure: {
      ko: "이중 압력 (해상 초크 + 철도 붕괴)",
      en: "Dual pressure (sea choke + rail collapse)",
    },
    reroute_to_peer_gateway: {
      ko: "동료 게이트 우회 신호",
      en: "Reroute to peer gateway",
    },
    gateway_surge: { ko: "게이트웨이 급증", en: "Gateway surge" },
    sea_connectivity_and_rail_shift: {
      ko: "해운 이상 + 철도 이동",
      en: "Sea anomaly + rail shift",
    },
  };
  const row = map[h];
  if (!row) return h;
  return en ? row.en : row.ko;
}

function familyLabel(family: string, en: boolean): string {
  if (family === "china-europe") return en ? "China–Europe modal family" : "China–Europe 모달 패밀리";
  if (family === "ukraine-eu") return en ? "Ukraine–EU rail family" : "UA–EU 철도 패밀리";
  if (family === "middle-corridor") return en ? "Middle Corridor family" : "미들 코리도 패밀리";
  return family;
}

function formatUsd(n: number | null, en: boolean): string {
  if (n == null) return en ? "n/a" : "없음";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

export function CorridorRailChip({ corridor, lang = "ko", onDismiss }: Props) {
  const en = lang === "en";
  const title = en ? corridor.nameEn : corridor.nameKo;
  const shock =
    corridor.shockPct != null
      ? `${corridor.shockPct >= 0 ? "+" : ""}${(corridor.shockPct * 100).toFixed(0)}% @2021`
      : null;
  const share =
    corridor.shareOfWorld != null
      ? `${(corridor.shareOfWorld * 100).toFixed(1)}% ${en ? "of WORLD unload" : "WORLD 양하 비중"}`
      : null;
  const dual = dualLabel(corridor.dualSignal, en);
  const pair = corridor.railFreightPair
    ? `${corridor.railFreightPair.geo}→${corridor.railFreightPair.partner}`
    : null;
  const ms = corridor.modalStress;
  const narrative = ms ? (en ? ms.narrativeEn : ms.narrativeKo) : null;
  const conn = ms ? connectivityLabel(ms.connectivityDual, en) : null;
  const hypo = ms ? hypothesisLabel(ms.hypothesis, en) : null;

  return (
    <aside
      id="corridor-rail-chip"
      className={`pointer-events-auto absolute right-3 top-20 ${zc("panel")} max-h-[min(70vh,520px)] w-[min(92vw,340px)] overflow-y-auto overflow-x-hidden rounded-xl border border-amber-300/25 bg-[#14110c]/92 shadow-2xl backdrop-blur-xl`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-amber-200/10 px-3 py-2">
        <div className="min-w-0">
          <p className="text-micro uppercase tracking-[0.18em] text-amber-200/50">
            {ms
              ? familyLabel(ms.family, en)
              : corridor.gaugeBreak
                ? en
                  ? "Gauge-break gateway"
                  : "궤간변경 게이트웨이"
                : corridor.euRailGateway
                  ? en
                    ? "EU rail gateway"
                    : "EU 철도 게이트웨이"
                  : en
                    ? "Strategic corridor"
                    : "전략 회랑"}
          </p>
          <h2 className="mt-0.5 truncate text-sm font-medium text-amber-50">{title}</h2>
          <p className="mt-0.5 text-micro text-amber-100/55">
            {[
              pair,
              corridor.scalerank != null ? `rank ${corridor.scalerank}` : null,
              shock,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="tap-target flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center rounded-full text-xs text-amber-100/50 transition hover:bg-white/5 hover:text-amber-50"
          aria-label={en ? "Dismiss" : "닫기"}
        >
          ✕
        </button>
      </div>

      {narrative ? (
        <p className="border-b border-amber-200/10 px-3 py-2 text-xs leading-snug text-amber-100/80">
          {narrative}
        </p>
      ) : corridor.note ? (
        <p className="px-3 py-2 text-xs leading-snug text-amber-100/70">{corridor.note}</p>
      ) : null}

      {ms ? (
        <div className="grid grid-cols-2 gap-2 border-b border-amber-200/10 px-3 py-2">
          <div>
            <p className="text-micro text-amber-200/45">{en ? "Sea choke stress" : "해상 초크 스트레스"}</p>
            <p className="text-xs text-amber-50/90">
              {ms.seaChokeStress != null ? ms.seaChokeStress.toFixed(2) : en ? "n/a" : "없음"}
            </p>
          </div>
          <div>
            <p className="text-micro text-amber-200/45">{en ? "Hypothesis" : "가설"}</p>
            <p className="text-xs leading-snug text-amber-50/90">
              {hypo ?? (en ? "none" : "없음")}
            </p>
          </div>
          {conn ? (
            <div className="col-span-2">
              <p className="text-micro text-amber-200/45">{en ? "Sea ↔ rail" : "해운 ↔ 철도"}</p>
              <p className="text-xs text-amber-50/90">{conn}</p>
            </div>
          ) : null}
          {ms.lsciDrops.length > 0 ? (
            <div className="col-span-2">
              <p className="text-micro text-amber-200/45">{en ? "LSCI_M drops" : "LSCI_M 급락"}</p>
              <p className="text-xs text-amber-50/90">
                {ms.lsciDrops
                  .map((d) => `${d.iso} ${d.month} ${d.pctChange.toFixed(0)}%`)
                  .join(" · ")}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="border-t border-amber-200/10 px-3 py-2">
        <p className="text-micro text-amber-200/45">
          {en ? "Eurostat rail freight (MIO_TKM)" : "Eurostat 철도화물 (백만톤km)"}
        </p>
        <p className="mt-0.5 text-xs text-amber-50/90">
          {corridor.avgRecentTkm != null
            ? en
              ? `Recent avg ${corridor.avgRecentTkm.toFixed(1)}`
              : `최근 평균 ${corridor.avgRecentTkm.toFixed(1)}`
            : en
              ? "No bilateral ton-km"
              : "양자 ton-km 없음"}
          {share ? ` · ${share}` : ""}
        </p>
        <TonKmSparkline series={corridor.tonKmSeries} />
        {corridor.tonKmSeries.length >= 2 ? (
          <p className="text-micro text-amber-100/40">
            {corridor.tonKmSeries[0]?.year}–{corridor.tonKmSeries.at(-1)?.year}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-amber-200/10 px-3 py-2">
        <div>
          <p className="text-micro text-amber-200/45">{en ? "Comtrade USD" : "Comtrade 무역액"}</p>
          <p className="text-xs text-amber-50/90">{formatUsd(corridor.bilateralTradeUsd, en)}</p>
        </div>
        <div>
          <p className="text-micro text-amber-200/45">{en ? "USD dual" : "USD 이중신호"}</p>
          <p className="text-xs leading-snug text-amber-50/90">
            {dual ?? (en ? "incomplete" : "신호 부족")}
          </p>
        </div>
      </div>

      {ms && ms.relatedLabels.length > 0 ? (
        <div className="border-t border-amber-200/10 px-3 py-2">
          <p className="text-micro text-amber-200/45">{en ? "Related corridors" : "관련 회랑"}</p>
          <ul className="mt-1 space-y-0.5">
            {ms.relatedLabels.map((r) => (
              <li key={r.id} className="truncate text-xs text-amber-100/70">
                {en ? r.nameEn : r.nameKo}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
