"use client";

import { useEffect, useState } from "react";
import { SIPRI_ARMS_EVIDENCE_ENABLED, SIPRI_URL } from "@/lib/licensing/sipriPolicy";
import { armsPairInFlash } from "@/lib/sipri/flashPair";
import { armsCategoryLabel, armsCountryName } from "@/lib/axisArmsI18n";
import type { AxisArmsDeal, AxisArmsPair } from "@/lib/axisArmsPaths";

type Result = { pairs: AxisArmsPair[]; deals: AxisArmsDeal[]; yearRange: [number, number] };

/**
 * 속보 카드의 「무기 이전 기록」 칸. 속보가 무기 이전을 말하는 나라 쌍일 때만 뜬다.
 * SIPRI는 연 단위 인도 기록이다. 속보가 사실인지는 가르지 못하고 배경만 준다.
 * 기록이 없다고 "없었다"고 쓰지 않는다 — 이 요약에서 찾지 못했다는 뜻이다.
 */
export function SipriArmsRecord({ text, en }: { text: string; en: boolean }) {
  const pair = SIPRI_ARMS_EVIDENCE_ENABLED ? armsPairInFlash(text) : null;
  const key = pair ? `${pair[0]}-${pair[1]}` : "";
  const [data, setData] = useState<Result | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!pair) return;
    let alive = true;
    setData(null);
    setFailed(false);
    void fetch(`/api/sipri/arms?a=${pair[0]}&b=${pair[1]}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((json: Result) => alive && setData(json))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
    // pair는 key로 대표한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!pair || failed || !data) return null;
  const lang = en ? "en" : "ko";
  const [a, b] = pair;
  const names = `${armsCountryName(a, lang)}–${armsCountryName(b, lang)}`;
  const [y0, y1] = data.yearRange;

  return (
    <section data-sipri-record>
      <p className="px-0.5 text-micro font-semibold text-[#5c4020]">
        {en ? "Arms transfer record (background)" : "무기 이전 기록 (배경)"}
      </p>
      <div className="mt-1 rounded-sm border border-[#6b4a22]/20 bg-[#f7edd4]/70 px-2 py-1.5 text-micro leading-snug">
        {data.pairs.length === 0 ? (
          <p>
            {en
              ? `No ${names} transfer in this SIPRI summary (${y0}–${y1}). That does not mean none happened: SIPRI only lists registered transfers, and this summary is filtered.`
              : `이 SIPRI 요약(${y0}~${y1})에는 ${names} 사이 이전 기록이 없습니다. 이전이 없었다는 뜻이 아닙니다. SIPRI는 등록된 이전만 싣고, 이 요약은 걸러진 것입니다.`}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {data.pairs.map((p) => (
              <li key={`${p.supplier}-${p.recipient}`}>
                {armsCountryName(p.supplier, lang)} → {armsCountryName(p.recipient, lang)} ·{" "}
                {en ? `${p.count} records` : `${p.count}건`} · {p.years[0]}
                {p.years.length > 1 ? `–${p.years[p.years.length - 1]}` : ""} ·{" "}
                {armsCategoryLabel(p.topCategory, lang)} · TIV {p.tiv}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-[#5c4020]/80">
          {en
            ? "Yearly delivery records, so this cannot confirm a specific report. TIV is a volume index, not a price. "
            : "연 단위 인도 기록이라 이 속보를 확인해 주지는 못합니다. TIV는 가격이 아니라 규모 지표입니다. "}
          <a href={SIPRI_URL} target="_blank" rel="noopener noreferrer" className="underline">
            SIPRI Arms Transfers Database © SIPRI
          </a>
        </p>
      </div>
    </section>
  );
}
