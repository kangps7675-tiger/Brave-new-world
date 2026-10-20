import type { DisputeArea } from "@/data/geoTypes";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { TourScene } from "@/components/globe/TourSequencer";

const HAZARD_ORDER: Record<string, number> = {
  combat: 0,
  bombardment: 1,
  "gray-zone": 2,
  territorial: 3,
  tension: 4,
};

const TENSION_ORDER: Record<DisputeArea["tension"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/**
 * 오늘의 투어 장면 — 현재 분쟁 데이터에서 상위 N개를 뽑아
 * 교전 > 폭격 > 회색지대 > 영토 > 긴장, 같은 등급이면 관련 이벤트 수 순.
 */
export function buildDailyTourScenes(
  disputes: DisputeArea[],
  lang: LabelLanguage,
  max = 5,
): TourScene[] {
  const ranked = [...disputes]
    .filter((d) => d.center && Number.isFinite(d.center.lat) && Number.isFinite(d.center.lng))
    .sort((a, b) => {
      const ha = HAZARD_ORDER[a.hazardClass ?? "tension"] ?? 9;
      const hb = HAZARD_ORDER[b.hazardClass ?? "tension"] ?? 9;
      if (ha !== hb) return ha - hb;
      const ta = TENSION_ORDER[a.tension] ?? 9;
      const tb = TENSION_ORDER[b.tension] ?? 9;
      if (ta !== tb) return ta - tb;
      return (b.matchedEventCount ?? 0) - (a.matchedEventCount ?? 0);
    })
    .slice(0, max);

  return ranked.map((d) => {
    const hazardLabel =
      lang === "en"
        ? d.hazardClass === "combat" || d.hazardClass === "bombardment"
          ? "Active combat zone"
          : d.tension === "high"
            ? "High tension"
            : "Watch area"
        : d.hazardClass === "combat" || d.hazardClass === "bombardment"
          ? "실제 교전 구역"
          : d.tension === "high"
            ? "고긴장 구역"
            : "관찰 구역";
    const events =
      (d.matchedEventCount ?? 0) > 0
        ? lang === "en"
          ? ` · ${d.matchedEventCount} related events`
          : ` · 관련 사건 ${d.matchedEventCount}건`
        : "";
    return {
      id: `tour-${d.id}`,
      title: d.nameLong || d.name,
      body: `${hazardLabel}${events}${d.note ? ` — ${d.note}` : ""}`,
      lat: d.center.lat,
      lng: d.center.lng,
      altitude: 0.95,
      holdMs: 5200,
    };
  });
}
