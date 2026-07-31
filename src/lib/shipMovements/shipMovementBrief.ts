/**
 * 주간 함선 이동기 — 양피지 브리프 문단.
 * 실시간 AIS가 아닌 공개 기사·관측 기반 추정 경로·위치의 경위를 설명한다.
 */

import type { PublicShipObservation } from "@/lib/shipMovements/types";
import {
  isMapDisplayableShipObservation,
  trailGroupKey,
} from "@/lib/shipMovements/globeOverlay";

export type ShipTrailMode = "fleet" | "vessel";

export type ShipVesselGroup = {
  groupKey: string;
  vesselKey: string;
  label: string;
  navyLabel: string | null;
  navyCode: string | null;
  hullNumber: string | null;
  observations: PublicShipObservation[];
  mapPointCount: number;
  latestAt: string | null;
};

function confidenceKo(c: PublicShipObservation["confidence"]): string {
  if (c === "observed") return "직접 관측";
  if (c === "reported") return "보도 서술";
  return "추정";
}

function confidenceEn(c: PublicShipObservation["confidence"]): string {
  if (c === "observed") return "observed";
  if (c === "reported") return "reported";
  return "estimated";
}

function methodKo(m: PublicShipObservation["method"]): string {
  switch (m) {
    case "relative-bearing":
      return "방위와 거리로 상대 측위";
    case "gazetteer-point":
      return "지명 한 점으로 맞춤";
    case "gazetteer-axis":
      return "해협·축선으로 맞춤";
    case "gazetteer-sea":
      return "해역 범위로 맞춤";
    case "manual":
      return "수동으로 확정";
    default:
      return "좌표를 확정하지 못함";
  }
}

function methodEn(m: PublicShipObservation["method"]): string {
  switch (m) {
    case "relative-bearing":
      return "relative bearing/distance fix";
    case "gazetteer-point":
      return "gazetteer point match";
    case "gazetteer-axis":
      return "chokepoint/axis match";
    case "gazetteer-sea":
      return "sea-area match";
    case "manual":
      return "manual confirmation";
    default:
      return "no coordinate fix";
  }
}

function locationStatusKo(s: PublicShipObservation["locationStatus"]): string {
  switch (s) {
    case "precise":
      return "정밀";
    case "chokepoint":
      return "초크포인트 수준";
    case "broad":
      return "광역";
    case "missing":
      return "위치 문구 없음";
    case "unresolved":
      return "위치를 해석하지 못함";
    case "ambiguous":
      return "모호함";
    default:
      return s;
  }
}

function locationStatusEn(s: PublicShipObservation["locationStatus"]): string {
  return s;
}

function vesselLabel(o: PublicShipObservation): string {
  return [o.vesselName, o.hullNumber].filter(Boolean).join(" ") || o.vesselKey || o.title;
}

function sortObs(list: PublicShipObservation[]): PublicShipObservation[] {
  return [...list].sort((a, b) =>
    (a.observedAt || a.weekStart || "").localeCompare(b.observedAt || b.weekStart || ""),
  );
}

/** 타임라인 관측을 함정 단위로 묶음 */
export function groupShipObservationsByVessel(
  observations: PublicShipObservation[],
): ShipVesselGroup[] {
  const by = new Map<string, PublicShipObservation[]>();
  for (const o of observations) {
    const g = trailGroupKey(o);
    const list = by.get(g) ?? [];
    list.push(o);
    by.set(g, list);
  }
  const groups: ShipVesselGroup[] = [];
  for (const [groupKey, list] of by) {
    const sorted = sortObs(list);
    const head = sorted[sorted.length - 1] ?? sorted[0]!;
    groups.push({
      groupKey,
      vesselKey: head.vesselKey,
      label: vesselLabel(head),
      navyLabel: head.navyLabel,
      navyCode: head.navyCode,
      hullNumber: head.hullNumber,
      observations: sorted,
      mapPointCount: sorted.filter(isMapDisplayableShipObservation).length,
      latestAt: head.observedAt || head.weekStart,
    });
  }
  return groups.sort((a, b) =>
    (b.latestAt || "").localeCompare(a.latestAt || ""),
  );
}

export function observationsForGroupKey(
  observations: PublicShipObservation[],
  groupKey: string | null,
): PublicShipObservation[] {
  if (!groupKey) return observations;
  return observations.filter((o) => trailGroupKey(o) === groupKey);
}

export function groupKeyForObservation(o: PublicShipObservation): string {
  return trailGroupKey(o);
}

/** 함정 트랙 중심·고도 추정 (flyTo용) */
export function vesselTrackFlyTarget(
  observations: PublicShipObservation[],
): { lat: number; lng: number; altitude: number } | null {
  const pts = observations.filter(isMapDisplayableShipObservation);
  if (pts.length === 0) return null;
  const lats = pts.map((o) => o.lat!);
  const lngs = pts.map((o) => o.lng!);
  const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const span = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
  const altitude = span > 8 ? 1.6 : span > 3 ? 1.15 : span > 1 ? 0.9 : 0.7;
  return { lat, lng, altitude };
}

/**
 * 선택한 함정(또는 단일 관측이 속한 함정)의 이동 경위·추정 위치 양피지.
 */
export function shipMovementParchmentParagraphs(
  track: PublicShipObservation[],
  lang: "ko" | "en",
  focusId?: string | null,
): { title: string; paragraphs: string[]; signOff: string } {
  const sorted = sortObs(track);
  const focus = (focusId && sorted.find((o) => o.id === focusId)) || sorted[sorted.length - 1] || null;
  const label = focus ? vesselLabel(focus) : lang === "en" ? "Unknown vessel" : "미상 함정";
  const navy = focus?.navyLabel;
  const en = lang === "en";

  const title = en
    ? `${label} · weekly movement brief`
    : `${label} · 주간 이동 브리프`;

  const paragraphs: string[] = [];

  if (en) {
    paragraphs.push(
      "This desk does not show live AIS. Positions and tracks are reconstructed from public reports (chiefly USNI Fleet Tracker / Westpac Pulse and Japan Security Watch–style open sources) after extraction, geocoding, and review. Lines on the globe are estimated connections between article fixes—not a continuous voyage recorder.",
    );
    if (navy) {
      paragraphs.push(`Vessel identity on file: ${label} (${navy}). Vessel-ID confidence on the latest fix is ${focus?.vesselConfidence ?? "unknown"}.`);
    } else {
      paragraphs.push(`Vessel identity on file: ${label}. Vessel-ID confidence on the latest fix is ${focus?.vesselConfidence ?? "unknown"}.`);
    }

    if (sorted.length === 0) {
      paragraphs.push("No approved observations are available for this hull yet.");
    } else {
      const stops = sorted
        .map((o) => {
          const when = (o.observedAt || o.weekStart || "—").slice(0, 10);
          const where =
            o.locationLabel ||
            o.missingLocationNote ||
            "no public location phrase";
          const conf = confidenceEn(o.confidence);
          const st = locationStatusEn(o.locationStatus);
          const method = methodEn(o.method);
          const km =
            o.precisionKm != null ? ` · ~${Math.round(o.precisionKm)} km precision` : "";
          const map = isMapDisplayableShipObservation(o)
            ? o.locationStatus === "broad"
              ? " · estimated sea on map"
              : " · on map"
            : " · off map";
          return `${when} — ${where} (${conf}, ${st}, ${method}${km}${map})`;
        })
        .join("\n");
      paragraphs.push(`Observation chain in time order:\n${stops}`);
    }

    if (focus?.summary) {
      paragraphs.push(`Why this move entered the desk:\n${focus.summary}`);
    }

    const quotes = sorted.flatMap((o) => o.evidenceQuotes).filter(Boolean);
    if (quotes.length > 0) {
      paragraphs.push(
        `Evidence phrases pulled from the source text:\n${quotes
          .slice(0, 5)
          .map((q) => `“${q}”`)
          .join("\n")}`,
      );
    }

    if (focus) {
      paragraphs.push(
        `Estimated-position notes for the focus fix: confidence ${confidenceEn(focus.confidence)}; location status ${locationStatusEn(focus.locationStatus)}; geocode method ${methodEn(focus.method)}${
          focus.precisionKm != null
            ? `; reported precision about ${Math.round(focus.precisionKm)} km`
            : ""
        }. ${
          isMapDisplayableShipObservation(focus)
            ? focus.locationStatus === "broad"
              ? `Estimated sea area near ${focus.lat!.toFixed(2)}°, ${focus.lng!.toFixed(2)}° (not a precise pin).`
              : `Map pin near ${focus.lat!.toFixed(2)}°, ${focus.lng!.toFixed(2)}°.`
            : focus.missingLocationNote ||
              "This item has no map-eligible coordinate—kept on the timeline for the narrative only."
        }`,
      );
    }

    paragraphs.push(
      "How to read the modes: Fleet view draws every hull’s estimated track at once. Vessel view isolates one hull so you can follow its stop chain without clutter. Always open the source link before treating a fix as operational fact.",
    );
  } else {
    paragraphs.push(
      "이 데스크는 실시간 AIS 위치를 그리지 않습니다. 위치와 경로는 USNI Fleet Tracker·Westpac Pulse, 일본 안보 공개 관측 등 기사와 보고서에서 추출하고 지오코딩·검토를 거친 추정입니다. 지구본의 선은 기사에 찍힌 관측점을 시간순으로 이은 연결선이며, 연속 항적 기록기가 아닙니다.",
    );
    if (navy) {
      paragraphs.push(
        `식별된 함정은 ${label}(${navy})입니다. 최신 관측의 함정 식별 신뢰도는 ${focus?.vesselConfidence ?? "미상"}입니다.`,
      );
    } else {
      paragraphs.push(
        `식별된 함정은 ${label}입니다. 최신 관측의 함정 식별 신뢰도는 ${focus?.vesselConfidence ?? "미상"}입니다.`,
      );
    }

    if (sorted.length === 0) {
      paragraphs.push("이 함정에 대해 승인된 관측이 아직 없습니다.");
    } else {
      const stops = sorted
        .map((o) => {
          const when = (o.observedAt || o.weekStart || "—").slice(0, 10);
          const where =
            o.locationLabel ||
            o.missingLocationNote ||
            "공개 위치 문구 없음";
          const conf = confidenceKo(o.confidence);
          const st = locationStatusKo(o.locationStatus);
          const method = methodKo(o.method);
          const km =
            o.precisionKm != null ? ` · 정밀도 약 ${Math.round(o.precisionKm)} km` : "";
          const map = isMapDisplayableShipObservation(o)
            ? o.locationStatus === "broad"
              ? " · 광역 해역으로 추정"
              : " · 지도에 표시"
            : " · 지도에서 제외";
          return `${when} — ${where} (${conf}, ${st}, ${method}${km}${map})`;
        })
        .join("\n");
      paragraphs.push(`시간순으로 본 관측 연쇄는 다음과 같습니다.\n${stops}`);
    }

    if (focus?.summary) {
      paragraphs.push(`이 이동이 데스크에 올라온 경위는 다음과 같습니다.\n${focus.summary}`);
    }

    const quotes = sorted.flatMap((o) => o.evidenceQuotes).filter(Boolean);
    if (quotes.length > 0) {
      paragraphs.push(
        `출처 본문에서 뽑은 근거 구절은 다음과 같습니다.\n${quotes
          .slice(0, 5)
          .map((q) => `「${q}」`)
          .join("\n")}`,
      );
    }

    if (focus) {
      const precisionBit =
        focus.precisionKm != null
          ? ` 정밀도는 약 ${Math.round(focus.precisionKm)} km입니다.`
          : "";
      const mapBit = isMapDisplayableShipObservation(focus)
        ? focus.locationStatus === "broad"
          ? ` 광역 해역으로 추정해 대략 ${focus.lat!.toFixed(2)}°, ${focus.lng!.toFixed(2)}°에 표시합니다. 정밀 핀이 아닙니다.`
          : ` 지도 핀은 대략 ${focus.lat!.toFixed(2)}°, ${focus.lng!.toFixed(2)}°입니다.`
        : focus.missingLocationNote
          ? ` ${focus.missingLocationNote}`
          : " 지도에 올릴 좌표가 없어 타임라인 서술용으로만 남깁니다.";
      paragraphs.push(
        `초점 관측의 추정 위치 메모입니다. 신뢰도는 ${confidenceKo(focus.confidence)}이고, 위치 상태는 ${locationStatusKo(focus.locationStatus)}이며, 지오코딩 방식은 ${methodKo(focus.method)}입니다.${precisionBit}${mapBit}`,
      );
    }

    paragraphs.push(
      "모드를 읽는 방법은 이렇습니다. 「전체 경로」는 모든 함정의 추정 항적을 한눈에 보여 주고, 「함선별」은 한 척만 남겨 이동 연쇄를 따라가게 합니다. 작전 사실로 쓰기 전에 반드시 출처 링크를 확인하십시오.",
    );
  }

  const sources = [...new Set(sorted.map((o) => o.sourceUrl).filter(Boolean))];
  if (sources.length > 0) {
    paragraphs.push(
      en
        ? `Primary source URLs on file: ${sources.slice(0, 3).join(" · ")}`
        : `등록된 주요 출처 URL: ${sources.slice(0, 3).join(" · ")}`,
    );
  }

  const week =
    focus?.weekStart ||
    sorted.find((o) => o.weekStart)?.weekStart ||
    (focus?.observedAt || "").slice(0, 10) ||
    "—";

  const signOff = en
    ? `${week}\nGlobe Observatory · Westpac ship desk`
    : `${week}\n지구본 관측대 · 서태평양 함선 데스크`;

  return { title, paragraphs, signOff };
}
