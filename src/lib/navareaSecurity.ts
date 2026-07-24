import type { LabelLanguage } from "@/lib/layerPrefs";
import type { NavareaFeaturePoint } from "@/lib/navareaHatch";

/** 중·러 훈련 · 북한 미사일 등 안보 직결 NAVAREA */
export type NavareaSecurityKind = "exercise" | "missile" | "other-security";

const EXERCISE_RE =
  /\b(GUNNERY|GUN\s*FIRE|LIVE\s*FIRE|FIRING|EXERCISE|NAVAL\s*EXERCISE|MILITARY\s*EXERCISE|AMMUNITION|TORPEDO|ASW|ANTI[\s-]?SUBMARINE|GUNNERY\s*EXERCISE)\b/i;

const MISSILE_RE =
  /\b(MISSILE|ROCKET|BALLISTIC|ICBM|IRBM|SRBM|SPACE\s*LAUNCH|LAUNCH\s*WINDOW|RE[\s-]?ENTRY|FALLING\s*OBJECT)\b/i;

export function classifyNavareaSecurity(
  feature: Pick<NavareaFeaturePoint, "description" | "areaHint">,
): NavareaSecurityKind | null {
  const blob = `${feature.areaHint}\n${feature.description}`;
  if (MISSILE_RE.test(blob)) return "missile";
  if (EXERCISE_RE.test(blob)) return "exercise";
  return null;
}

export function isSecurityCriticalNavarea(
  feature: Pick<NavareaFeaturePoint, "description" | "areaHint">,
): boolean {
  return classifyNavareaSecurity(feature) != null;
}

export type NavareaBriefingContent = {
  title: string;
  paragraphs: string[];
  lat: number;
  lng: number;
  featureId: string;
  kind: NavareaSecurityKind;
};

function featureCoords(feature: NavareaFeaturePoint): { lat: number; lng: number } | null {
  if (
    typeof feature.lat === "number" &&
    typeof feature.lng === "number" &&
    Number.isFinite(feature.lat) &&
    Number.isFinite(feature.lng)
  ) {
    return { lat: feature.lat, lng: feature.lng };
  }
  const g = feature.geometry;
  if (g.type === "Point") {
    const [lng, lat] = g.coordinates;
    if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
  }
  if (g.type === "LineString" && g.coordinates[0]) {
    const [lng, lat] = g.coordinates[0];
    if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
  }
  if (g.type === "Polygon" && g.coordinates[0]?.[0]) {
    const [lng, lat] = g.coordinates[0][0];
    if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
  }
  return null;
}

function kindLabel(kind: NavareaSecurityKind, lang: LabelLanguage): string {
  if (lang === "en") {
    if (kind === "missile") return "Missile / launch hazard";
    if (kind === "exercise") return "Military exercise / gunnery";
    return "Navigational security warning";
  }
  if (kind === "missile") return "미사일·발사 위험 해역";
  if (kind === "exercise") return "군사 훈련·사격 해역";
  return "항행 안보 경보";
}

/** 본문에서 브리프용 짧은 문장 뽑기 */
function summarizeBody(description: string, maxLen = 280): string {
  const one = description.replace(/\s+/g, " ").trim();
  if (one.length <= maxLen) return one;
  return `${one.slice(0, maxLen - 1)}…`;
}

export function buildNavareaBriefingContent(
  feature: NavareaFeaturePoint,
  lang: LabelLanguage,
): NavareaBriefingContent | null {
  const coords = featureCoords(feature);
  if (!coords) return null;
  const kind = classifyNavareaSecurity(feature) ?? "other-security";
  const area = feature.areaHint || (lang === "en" ? "Reported waters" : "보고 해역");
  const when = feature.date?.trim() || null;
  const body = summarizeBody(feature.description);

  if (lang === "en") {
    return {
      title: `NAVAREA ${feature.region} · ${kindLabel(kind, lang)}`,
      paragraphs: [
        `In-force navigational warning ${feature.id} · ${area}.`,
        kind === "missile"
          ? "Treat as a missile/launch splash or hazard zone until cancelled."
          : "Treat as an active military exercise / gunnery closure until cancelled.",
        when ? `Message time (UTC): ${when}.` : "Message time not stated.",
        body || "Full text not available in this snapshot.",
        "Official JHOD/NGA text — verify against primary sources before operational use.",
      ],
      lat: coords.lat,
      lng: coords.lng,
      featureId: feature.id,
      kind,
    };
  }

  return {
    title: `NAVAREA ${feature.region} · ${kindLabel(kind, lang)}`,
    paragraphs: [
      `유효 항행경보 ${feature.id} · ${area}.`,
      kind === "missile"
        ? "미사일·발사체 낙하지·위험 구역으로 보고 만료·취소될 때까지 유의하세요."
        : "군사 훈련·사격 폐쇄 해역으로 보고 만료·취소될 때까지 유의하세요.",
      when ? `메시지 시각(UTC): ${when}.` : "메시지 시각은 명시되지 않았습니다.",
      body || "본문 스냅샷이 비어 있습니다.",
      "JHOD/NGA 공식 TXT 기반 — 작전에 쓰기 전 1차 출처로 교차확인하세요.",
    ],
    lat: coords.lat,
    lng: coords.lng,
    featureId: feature.id,
    kind,
  };
}

/** UKMTO — 동의 창을 띄울 고위협 유형 */
const UKMTO_OFFER_TYPES = new Set(["Hijack", "Boarding", "Attack"]);

export function isUkmtoOfferWorthy(incidentTypeName: string): boolean {
  return UKMTO_OFFER_TYPES.has(incidentTypeName);
}
