/**
 * UCDP 사건 → MapLibre 원(네온점) 대신 사상자 텍스트 라벨.
 * UCDP GED는 fatalities만 제공 — 부상은 「미집계」로 2줄 유지.
 */

import type { StaticPoint } from "@/data/geoTypes";
import type { CasualtySkullHtmlMarker } from "@/components/globe/types";
import { CASUALTY_ELEGY_LINES } from "@/lib/warCasualtyOverlay";
import { UCDP_ATTRIBUTION_SHORT } from "@/lib/ucdp";

const MAX_UCDP_CASUALTY_LABELS = 40;

function metaNum(meta: StaticPoint["meta"], key: string): number {
  const v = meta?.[key];
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function metaStr(meta: StaticPoint["meta"], key: string): string {
  const v = meta?.[key];
  return typeof v === "string" && v.trim() ? v.trim() : "";
}

/**
 * 뷰포트 UCDP 포인트 → 사상자 HTML 마커 (사망 + 부상 미집계 2줄).
 * 사망 0인 사건은 스킵. 치명도·최신 순으로 상한 적용.
 */
export function buildUcdpCasualtyMarkers(
  points: StaticPoint[],
  lang: "ko" | "en",
): CasualtySkullHtmlMarker[] {
  const en = lang === "en";
  const scored = points
    .filter((p) => p.kind === "ucdp-event")
    .map((p) => {
      const killed = metaNum(p.meta, "fatalities_best") || metaNum(p.meta, "deaths");
      const high = metaNum(p.meta, "fatalities_high");
      return { p, killed, high };
    })
    .filter((x) => x.killed > 0)
    .sort((a, b) => b.killed - a.killed || b.high - a.high)
    .slice(0, MAX_UCDP_CASUALTY_LABELS);

  return scored.map(({ p, killed }) => {
    const location =
      metaStr(p.meta, "locationName") ||
      metaStr(p.meta, "admin1") ||
      metaStr(p.meta, "country") ||
      p.name ||
      "UCDP";
    const date = metaStr(p.meta, "date");
    return {
      markerId: `ucdp-casualty-${p.id}`,
      displayKind: "casualty-skull" as const,
      id: `ucdp-${p.id}`,
      theaterId: `ucdp-${p.id}`,
      lat: p.lat,
      lng: p.lng,
      killed,
      // UCDP는 WIA 미제공 — 0 + 노트로 2줄 유지하되 표시는 「미집계」
      wounded: 0,
      woundedDisplay: en ? "—" : "—",
      killedLabel: en ? "Killed" : "사망",
      woundedLabel: en ? "Wounded" : "부상",
      asOf: date,
      sourceHint: `${UCDP_ATTRIBUTION_SHORT} · ${location}${date ? ` · ${date}` : ""}`,
      elegyLines: en ? CASUALTY_ELEGY_LINES.en : CASUALTY_ELEGY_LINES.ko,
      woundedNote: en
        ? "UCDP GED records fatalities only — wounded not coded."
        : "UCDP GED는 사망만 집계합니다. 부상은 미제공.",
      hideWounded: false,
      territorySpanDeg: 4,
      sourceAttribution: UCDP_ATTRIBUTION_SHORT,
      admin1Name: location,
    };
  });
}
