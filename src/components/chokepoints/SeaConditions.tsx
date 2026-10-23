"use client";

import { useEffect, useState } from "react";
import { WAR_RISK_REGION_BY_SLUG } from "@/components/chokepoints/WarRiskQuotes";
import type { ForecastCell, ForecastSummary } from "@/lib/marineWeather/summary";

/**
 * 초크포인트 페이지 — 해역 해상 상태(지금·24/48/72시간 뒤).
 * 소스는 NOAA GFS-Wave(전구 모델, 격자 약 28km)를 cron 이 D1 에 적재한 값 — 외부 호출·유료 크레딧 없음.
 * 해역 "대표 지점"의 값이라 해협 안쪽·연안은 다를 수 있다. 항해용 예보가 아니라 우회·대기 판단의 참고용.
 */

type NowCell = {
  at: string | null;
  fetchedAt: string | null;
  waveHeightM: number | null;
  windKn: number | null;
  windDirDeg: number | null;
  visibilityKm: number | null;
};

type Payload = {
  cycle: string | null;
  /** 지점 id → Datalastic 현재값 (12시간 넘은 값은 오지 않는다) */
  current?: Record<string, NowCell>;
  now: string;
  summary: ForecastSummary;
  points: Array<{ id: string; nameKo: string; nameEn: string }>;
};

const WIND_DIR = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
function dirLabel(deg: number): string {
  return WIND_DIR[Math.round((((deg % 360) + 360) % 360) / 45) % 8]!;
}

function colLabel(h: number): string {
  return h === 0 ? "지금" : `+${h}시간`;
}

function Cell({ c }: { c: ForecastCell }) {
  if (!c || (c.hsM == null && c.windKn == null)) return <span className="text-white/30">자료 없음</span>;
  return (
    <div>
      <p className="font-medium text-white">
        {c.hsM != null ? `${c.hsM.toFixed(1)} m` : "—"}
        {c.seaStateKo ? <span className="ml-1 text-xs font-normal text-white/45">{c.seaStateKo}</span> : null}
      </p>
      <p className="text-xs text-white/50">
        {c.windKn != null ? `바람 ${c.windKn} kn${c.windDirDeg != null ? ` ${dirLabel(c.windDirDeg)}` : ""}${c.beaufort != null ? ` · 보퍼트 ${c.beaufort}` : ""}` : "바람 자료 없음"}
      </p>
    </div>
  );
}

function NowCellView({ c }: { c: NowCell | undefined }) {
  if (!c || (c.waveHeightM == null && c.windKn == null)) return <span className="text-white/30">자료 없음</span>;
  const t = c.at ?? c.fetchedAt;
  return (
    <div>
      <p className="font-medium text-white">{c.waveHeightM != null ? `${c.waveHeightM.toFixed(1)} m` : "—"}</p>
      <p className="text-xs text-white/50">
        {c.windKn != null ? `바람 ${c.windKn} kn${c.windDirDeg != null ? ` ${dirLabel(c.windDirDeg)}` : ""}` : "바람 자료 없음"}
        {c.visibilityKm != null ? ` · 시정 ${c.visibilityKm >= 10 ? Math.round(c.visibilityKm) : c.visibilityKm.toFixed(1)} km` : ""}
      </p>
      {t ? <p className="text-micro text-white/30">{t.slice(5, 16).replace("T", " ")} UTC</p> : null}
    </div>
  );
}

function cycleLabel(cycle: string): string {
  return `${cycle.slice(0, 4)}-${cycle.slice(4, 6)}-${cycle.slice(6, 8)} ${cycle.slice(8, 10)}:00 UTC`;
}

/** 초크포인트 → 같이 보여줄 대양·우회로 해역. 홍해를 피해 희망봉으로, 호르무즈에서 나와 아라비아해로. */
const EXTRA_BY_SLUG: Record<string, Array<{ region: string; title: string; sub: string }>> = {
  "bab-el-mandeb": [{ region: "cape", title: "Detour via the Cape", sub: "희망봉 우회로 — 홍해를 피할 때 지나는 바다" }],
  "suez-canal": [{ region: "cape", title: "Detour via the Cape", sub: "희망봉 우회로 — 수에즈·홍해를 피할 때 지나는 바다" }],
  "strait-of-hormuz": [{ region: "arabian-sea", title: "Arabian Sea", sub: "아라비아해 — 호르무즈를 나와 인도양으로 가는 바다" }],
};

export default function SeaConditions({ slug }: { slug: string }) {
  const main = WAR_RISK_REGION_BY_SLUG[slug];
  if (!main) return null;
  const extras = EXTRA_BY_SLUG[slug] ?? [];
  return (
    <>
      <RegionBlock region={main} title="Sea conditions" sub="해상 상태 · 지금부터 72시간 — 우회·대기 판단 참고" />
      {extras.map((e) => (
        <RegionBlock key={e.region} region={e.region} title={e.title} sub={e.sub} />
      ))}
    </>
  );
}

function RegionBlock({ region, title, sub }: { region: string; title: string; sub: string }) {
  const [data, setData] = useState<Payload | null | "error">(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const r = await fetch(`/api/sea-forecast?region=${region}`);
        const d: Payload | "error" = r.ok ? ((await r.json()) as Payload) : "error";
        if (alive) setData(d);
      } catch {
        if (alive) setData("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [region]);

  const payload = data && data !== "error" ? data : null;
  const rows = payload?.summary.points ?? [];
  const nameOf = (id: string) => payload?.points.find((p) => p.id === id);
  const peak = payload?.summary.peak ?? null;
  const current = payload?.current ?? {};
  const hasNow = Object.keys(current).length > 0;
  const hasData = (!!payload?.cycle && rows.some((p) => p.cells.some((c) => c))) || hasNow;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-white/45">{sub}</p>

      {data === null ? (
        <p className="mt-4 text-sm text-white/40">Loading…</p>
      ) : !payload || !hasData ? (
        <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/50">
          No sea-state forecast is available for this area right now.
          <span className="mt-1 block text-white/40">지금은 이 해역의 해상 자료가 없습니다. (없다는 뜻이지 잔잔하다는 뜻이 아닙니다)</span>
        </p>
      ) : (
        <>
          {peak ? (
            <p className="mt-4 text-sm text-white/70">
              앞으로 72시간 중 가장 높은 파고는{" "}
              <span className="font-semibold text-white">{peak.hsM.toFixed(1)} m</span> —{" "}
              {nameOf(peak.pointId)?.nameKo ?? peak.pointId}, {peak.validTime.slice(5, 16).replace("T", " ")} UTC 무렵
            </p>
          ) : null}
          <div className="mt-3 overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="bg-white/[0.04] text-micro uppercase tracking-wide text-white/40">
                <tr>
                  <th className="px-3 py-2 font-normal">지점</th>
                  {hasNow ? <th className="px-3 py-2 font-normal">현재 · Datalastic</th> : null}
                  {payload.summary.offsetsH.map((h) => (
                    <th key={h} className="px-3 py-2 font-normal">
                      {colLabel(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((p) => (
                  <tr key={p.pointId}>
                    <td className="px-3 py-2 align-top text-white/80">
                      {nameOf(p.pointId)?.nameKo ?? p.pointId}
                      <span className="block text-xs text-white/35">{nameOf(p.pointId)?.nameEn}</span>
                    </td>
                    {hasNow ? (
                      <td className="px-3 py-2 align-top">
                        <NowCellView c={current[p.pointId]} />
                      </td>
                    ) : null}
                    {p.cells.map((c, i) => (
                      <td key={i} className="px-3 py-2 align-top">
                        <Cell c={c} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-white/40">
            {hasNow ? "‘현재’ 열은 Datalastic 값(6시간 간격 갱신, 열 안의 시각이 기준)이고, 나머지 열은 NOAA 예보입니다. " : ""}
            모델 사이클 {payload.cycle ? cycleLabel(payload.cycle) : "자료 없음"} · 파고는 유의파고(가장 높은 1/3 파도의 평균) 기준 ·
            전구 모델(격자 약 28km)이라 해협 안쪽·연안은 다를 수 있고 항해용 공식 예보를 대체하지 않습니다.
            {hasNow ? "" : " 시정은 NOAA 모델에 없습니다."} 출처: {hasNow ? "Datalastic · " : ""}NOAA NCEP GFS-Wave.
          </p>
        </>
      )}
    </section>
  );
}
