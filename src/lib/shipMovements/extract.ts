import type {
  ExtractedObservation,
  ShipMovementReportDraft,
  VesselConfidence,
} from "@/lib/shipMovements/types";
import { extractRelativeLocationFromText } from "@/lib/shipMovements/geocode";

const NAVY_RULES: Array<{ code: string; ko: string; en: string; re: RegExp }> = [
  { code: "PLAN", ko: "중국 해군", en: "PLA Navy", re: /\b(PLAN|PLA Navy|Chinese Navy|CNS |中国海軍|중국 해군)\b/i },
  { code: "RU", ko: "러시아 해군", en: "Russian Navy", re: /\b(Russian Navy|RFS |ロシア海軍|러시아 해군)\b/i },
  { code: "USN", ko: "미 해군", en: "U.S. Navy", re: /\b(U\.?S\.? Navy|USS |USNS |미 해군)\b/i },
  { code: "JMSDF", ko: "해상자위대", en: "JMSDF", re: /\b(JMSDF|JS |海上自衛隊|해상자위대)\b/i },
  { code: "ROKN", ko: "한국 해군", en: "ROK Navy", re: /\b(ROKN|ROK Navy|한국 해군)\b/i },
];

function detectNavy(text: string): { code: string; ko: string; en: string } | null {
  for (const rule of NAVY_RULES) {
    if (rule.re.test(text)) return { code: rule.code, ko: rule.ko, en: rule.en };
  }
  return null;
}

function vesselConfidence(name: string | null, hull: string | null): VesselConfidence {
  if (name && hull) return "high";
  if (hull) return "medium";
  if (name) return "low";
  return "low";
}

export function vesselKey(name: string | null, hull: string | null, navyCode: string | null): string {
  const parts = [navyCode ?? "unk", hull ?? "nohull", (name ?? "noname").toLowerCase().replace(/\s+/g, "-")];
  return parts.join(":");
}

/**
 * 규칙 기반 관측 추출 — LLM 없이도 pending 후보를 만든다.
 * USNI/JSO 문장에서 함번·상대위치를 최대한 건진다.
 */
export function extractObservationsRuleBased(
  report: ShipMovementReportDraft,
): ExtractedObservation[] {
  const text = `${report.title}\n${report.rawExcerpt}`;
  const out: ExtractedObservation[] = [];

  const hullMatches = [
    ...text.matchAll(/\b(?:hull\s*(?:number|no\.?)?|pennant)?\s*[「"'(]?([A-Z]{0,3}\s?\d{2,4}|[一二三四五六七八九十百千]+|\d{2,4})[」"')]?\b/gi),
    ...text.matchAll(/艦番号[「"']?([０-９0-9]{2,4})[」"']?/g),
    ...text.matchAll(/\(([A-Z]{1,4}-?\d{1,4}|CVN-\d{2}|DDG-\d{2}|CG-\d{2}|LPD-\d{2}|SSN-\d{3})\)/g),
  ];

  const named = [
    ...text.matchAll(/\b(?:USS|USNS|JS|CNS|RFS|HMCS)\s+([A-Z][A-Za-z0-9\-']+(?:\s+[A-Z][A-Za-z0-9\-']+){0,3})\b/g),
    ...text.matchAll(/「([^」]{2,40})」/g),
  ];

  const loc = extractRelativeLocationFromText(text);
  const navy = detectNavy(text);

  // 함명+함번 쌍이 있으면 각각 관측
  const vessels: Array<{ name: string | null; hull: string | null }> = [];
  for (const m of named) {
    vessels.push({ name: (m[1] ?? "").trim(), hull: null });
  }
  for (const m of hullMatches) {
    const hull = (m[1] ?? "").replace(/\s+/g, "").trim();
    if (!hull) continue;
    if (!vessels.some((v) => v.hull === hull)) {
      vessels.push({ name: null, hull });
    }
  }

  if (vessels.length === 0 && (loc || /艦艇|carrier|destroyer|frigate|cruiser/i.test(text))) {
    vessels.push({ name: null, hull: null });
  }

  for (const v of vessels.slice(0, 12)) {
    out.push({
      vesselName: v.name,
      hullNumber: v.hull,
      navy: navy?.en ?? null,
      navyCode: navy?.code ?? null,
      observedAt: report.publishedAt,
      location: loc
        ? {
            raw: loc.raw,
            placeName: loc.placeName,
            bearingDeg: loc.bearingDeg,
            distanceKm: loc.distanceKm,
            directionText: loc.directionText,
          }
        : {
            raw: "",
            placeName: null,
            bearingDeg: null,
            distanceKm: null,
            directionText: null,
          },
      evidenceQuotes: [loc?.raw || report.summaryEn || report.titleEn].filter(Boolean).slice(0, 3),
      vesselConfidence: vesselConfidence(v.name, v.hull),
    });
  }

  // 동일 위치·동일 함 중복 제거
  const seen = new Set<string>();
  return out.filter((o) => {
    const key = `${o.hullNumber}|${o.vesselName}|${o.location.raw}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function navyLabels(code: string | null): { ko: string | null; en: string | null } {
  const hit = NAVY_RULES.find((r) => r.code === code);
  return { ko: hit?.ko ?? null, en: hit?.en ?? null };
}
