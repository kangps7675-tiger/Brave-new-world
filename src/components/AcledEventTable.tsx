"use client";

import { useEffect, useState } from "react";
import { EvidenceTierBadge } from "@/components/EvidenceTierBadge";
import type { LabelLanguage } from "@/lib/layerPrefs";

/**
 * ACLED(HDX HAPI) "핀 밀도"를 사건 테이블로 승격.
 *
 * 주의: HDX HAPI conflict-events는 개별 사건(행위자·정확한 날짜) 단위가 아니라
 * 행정구역(admin1) × 기간창 집계다. 진짜 개별 사건·행위자 단위 테이블을 만들려면
 * ACLED 자체 API(등록·키 필요, acleddata.com/data-export-tool)로 별도 연동해야 한다.
 * 이 컴포넌트는 지금 이미 갖고 있는 집계 데이터를 "지도 핀 하나하나 hover"가 아니라
 * 한눈에 정렬된 표로 보여주는 것까지만 한다.
 */

type HapiActiveFrontRow = {
  id: string;
  admin1Name: string;
  locationCode: string;
  killed: number;
  events: number;
  periodStart: string;
  periodEnd: string;
};

type Payload = {
  fronts: HapiActiveFrontRow[];
  windowStart: string;
  windowEnd: string;
};

export function AcledEventTable({ lang }: { lang: LabelLanguage }) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/hapi-conflict-casualties", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as Payload;
        if (!cancelled) {
          setPayload(data);
          setStatus("ok");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const en = lang === "en";
  const all = payload?.fronts ?? [];
  // 사망 발생(우크라·가자·레바논 등)과 사건만 감지된 그레이존(중국·대만·이란)을
  // 같은 사망자순 정렬에 두면 그레이존 행이 맨 아래로 밀려 스크롤 밖으로 사라진다.
  // 둘을 분리해 그레이존도 항상 보이게 한다.
  const fatal = all.filter((f) => f.killed > 0).sort((a, b) => b.killed - a.killed);
  const grayZone = all
    .filter((f) => f.killed <= 0 && f.events > 0)
    .sort((a, b) => b.events - a.events);

  function renderRows(rows: HapiActiveFrontRow[], showKilled: boolean) {
    return rows.map((front) => (
      <tr key={front.id} className="border-b border-rose-900/15 text-sky-50/90">
        <td className="py-1.5 pr-2">{front.admin1Name || front.locationCode}</td>
        {showKilled ? (
          <td className="py-1.5 pr-2 text-right tabular-nums">{front.killed || 0}</td>
        ) : null}
        <td className="py-1.5 text-right tabular-nums text-sky-100/60">{front.events || 0}</td>
      </tr>
    ));
  }

  return (
    <div className="mt-3 rounded-lg border border-rose-800/30 bg-black/30 p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-micro font-semibold uppercase tracking-[0.14em] text-rose-200/80">
          {en ? "Event table (by admin1)" : "지역별 사건 집계"}
        </p>
        <EvidenceTierBadge tier="reported" lang={lang} />
      </div>

      {status === "loading" ? (
        <p className="text-meta text-sky-100/60">{en ? "Loading…" : "불러오는 중…"}</p>
      ) : status === "error" || all.length === 0 ? (
        <p className="text-meta text-sky-100/60">
          {en
            ? "No live data — try again later."
            : "지금은 집계를 못 불러왔습니다. 잠시 뒤 다시 열어 보세요."}
        </p>
      ) : (
        <div className="max-h-72 overflow-y-auto">
          {fatal.length > 0 ? (
            <table className="w-full border-collapse text-left text-meta">
              <thead className="sticky top-0 bg-black/60 backdrop-blur-sm">
                <tr className="border-b border-rose-800/30 text-micro uppercase tracking-[0.1em] text-sky-100/50">
                  <th className="py-1.5 pr-2 font-medium">{en ? "Region" : "지역"}</th>
                  <th className="py-1.5 pr-2 text-right font-medium">{en ? "Killed" : "사망"}</th>
                  <th className="py-1.5 text-right font-medium">{en ? "Events" : "사건"}</th>
                </tr>
              </thead>
              <tbody>{renderRows(fatal, true)}</tbody>
            </table>
          ) : null}

          {grayZone.length > 0 ? (
            <>
              <p className="mb-1 mt-3 px-0.5 text-micro font-semibold uppercase tracking-[0.1em] text-sky-100/45">
                {en
                  ? "Gray zone (events, 0 fatalities) — China · Taiwan · Iran"
                  : "사상자 없음 · 사건만 잡힌 곳 — 중국·대만·이란"}
              </p>
              <table className="w-full border-collapse text-left text-meta">
                <thead>
                  <tr className="border-b border-rose-800/30 text-micro uppercase tracking-[0.1em] text-sky-100/50">
                    <th className="py-1.5 pr-2 font-medium">{en ? "Region" : "지역"}</th>
                    <th className="py-1.5 text-right font-medium">{en ? "Events" : "사건"}</th>
                  </tr>
                </thead>
                <tbody>{renderRows(grayZone, false)}</tbody>
              </table>
            </>
          ) : null}
        </div>
      )}

      <p className="mt-2 text-micro leading-4 text-sky-100/45">
        {en
          ? "Admin1 × time-window aggregate, not individual dated incidents. Per-event actor-level detail needs a direct ACLED API key (acleddata.com)."
          : "지역·기간으로 묶어 본 집계입니다. 날짜·행위자가 찍힌 개별 사건은 아닙니다. 그 수준은 ACLED 직접 API 키가 필요합니다(acleddata.com)."}
      </p>
    </div>
  );
}
