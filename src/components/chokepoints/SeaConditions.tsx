"use client";

import { useEffect, useState } from "react";
import { WAR_RISK_REGION_BY_SLUG } from "@/components/chokepoints/WarRiskQuotes";
import { beaufort, seaStateKo } from "@/lib/marineWeather/gfsWave";
import { kmhToKnots, type SeaWeatherNow } from "@/lib/seaWeather/datalastic";

/**
 * 초크포인트 페이지 — 해역 현재 해상·기상.
 * 해역 "대표 지점 하나"의 값이다(해협 안쪽·연안은 다를 수 있다). 항해용 예보가 아니라 우회·대기 판단의 참고용.
 */

type Payload = {
  enabled: boolean;
  stale?: boolean;
  point: { nameKo: string; nameEn: string; lat: number; lng: number };
  now: SeaWeatherNow | null;
  fetchedAt?: string;
};

function Cell({ label, ko, value }: { label: string; ko: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="text-micro uppercase tracking-wide text-white/40">
        {label} <span className="normal-case text-white/30">· {ko}</span>
      </p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function dirLabel(deg: number): string {
  const names = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return names[Math.round((((deg % 360) + 360) % 360) / 45) % 8]!;
}

export default function SeaConditions({ slug }: { slug: string }) {
  const region = WAR_RISK_REGION_BY_SLUG[slug];
  const [data, setData] = useState<Payload | null | "error">(null);

  useEffect(() => {
    if (!region) return;
    let alive = true;
    void (async () => {
      try {
        const r = await fetch(`/api/sea-weather?region=${region}`);
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

  if (!region) return null;

  const payload = data && data !== "error" ? data : null;
  const now = payload ? payload.now : null;
  const bf = now?.windKmh != null ? beaufort(now.windKmh / 3.6) : null;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold text-white">Sea conditions now</h2>
      <p className="mt-1 text-sm text-white/45">현재 해상·기상 — 우회·대기 판단 참고</p>

      {data === null ? (
        <p className="mt-4 text-sm text-white/40">Loading…</p>
      ) : !payload || !now ? (
        <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/50">
          No weather reading is available for this area right now.
          <span className="mt-1 block text-white/40">지금은 이 해역의 날씨 자료가 없습니다. (없다는 뜻이지 잔잔하다는 뜻이 아닙니다)</span>
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {now.waveHeightM != null ? (
              <Cell
                label="Wave height"
                ko="파고"
                value={`${now.waveHeightM.toFixed(1)} m${seaStateKo(now.waveHeightM) ? ` · ${seaStateKo(now.waveHeightM)}` : ""}`}
              />
            ) : null}
            {now.windKmh != null ? (
              <Cell
                label="Wind"
                ko="바람"
                value={`${Math.round(kmhToKnots(now.windKmh))} kn${now.windDirDeg != null ? ` ${dirLabel(now.windDirDeg)}` : ""}${bf != null ? ` · 보퍼트 ${bf}` : ""}`}
              />
            ) : null}
            {now.visibilityKm != null ? (
              <Cell label="Visibility" ko="시정" value={`${now.visibilityKm >= 10 ? Math.round(now.visibilityKm) : now.visibilityKm.toFixed(1)} km`} />
            ) : null}
            {now.swellHeightM != null ? (
              <Cell
                label="Swell"
                ko="너울"
                value={`${now.swellHeightM.toFixed(1)} m${now.wavePeriodS != null ? ` · ${now.wavePeriodS.toFixed(0)} s` : ""}`}
              />
            ) : null}
            {now.seaTempC != null ? <Cell label="Sea temp" ko="수온" value={`${now.seaTempC.toFixed(0)} °C`} /> : null}
            {now.pressureHpa != null ? <Cell label="Pressure" ko="기압" value={`${Math.round(now.pressureHpa)} hPa`} /> : null}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-white/40">
            {`${payload.point.nameEn} (${payload.point.nameKo}) · `}
            {now.at ? `${now.at.slice(0, 16).replace("T", " ")} UTC` : ""}
            {payload.stale ? " · 최신 갱신 실패 — 마지막 값" : ""}
            {" · "}해역 대표 지점 한 곳의 값이며 항해용 예보가 아닙니다. 출처: Datalastic.
          </p>
        </>
      )}
    </section>
  );
}
