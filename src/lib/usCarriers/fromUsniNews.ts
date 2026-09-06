/**
 * USNI Fleet Tracker 등 공개 보도 본문에서 CVN 위치·상태를 규칙으로 추출한다.
 * LLM 없음 — 함명/함번 + 해역 키워드 윈도우 매칭.
 */
import {
  US_CARRIERS_SEED,
  type UsCarrier,
  type UsCarrierStatus,
} from "@/data/usCarriers";

export type CarrierNewsPatch = {
  id: string;
  lat: number;
  lng: number;
  status: UsCarrierStatus;
  location: string;
  notes: string;
  evidenceUrl?: string;
  confidence: "high" | "medium" | "low";
};

type RegionHit = {
  keys: RegExp[];
  lat: number;
  lng: number;
  location: string;
  /** 키워드만으로 추정하는 기본 상태 (문맥 키워드가 있으면 덮어씀) */
  defaultStatus: UsCarrierStatus;
  score: number;
};

const REGIONS: RegionHit[] = [
  {
    keys: [/laem\s*chabang/i, /gulf of thailand/i],
    lat: 13.08,
    lng: 100.88,
    location: "Laem Chabang, Thailand",
    defaultStatus: "deployed",
    score: 12,
  },
  {
    keys: [/singapore\s*strait/i, /strait of malacca/i, /\bmalacca\b/i],
    lat: 1.2,
    lng: 103.85,
    location: "Singapore / Malacca Strait",
    defaultStatus: "deployed",
    score: 11,
  },
  {
    keys: [/south\s*china\s*sea/i, /\bSCS\b/],
    lat: 12.5,
    lng: 114.5,
    location: "South China Sea",
    defaultStatus: "deployed",
    score: 10,
  },
  {
    keys: [/arabian\s*sea/i, /persian\s*gulf/i, /\bhormuz\b/i, /gulf of oman/i, /red\s*sea/i],
    lat: 17.2,
    lng: 63.8,
    location: "Arabian Sea / CENTCOM",
    defaultStatus: "deployed",
    score: 10,
  },
  {
    keys: [/philippine\s*sea/i, /western\s*pacific/i, /\bwestpac\b/i],
    lat: 18.0,
    lng: 135.0,
    location: "Western Pacific",
    defaultStatus: "deployed",
    score: 8,
  },
  {
    keys: [/eastern\s*pacific/i, /off(?:\s+the)?\s+california/i, /near\s+california/i],
    lat: 32.5,
    lng: -119.5,
    location: "Eastern Pacific · near California",
    defaultStatus: "deployed",
    score: 9,
  },
  {
    keys: [/atlantic/i, /off(?:\s+the)?\s+florida/i, /carrier\s*qualifications/i],
    lat: 28.5,
    lng: -79.5,
    location: "Western Atlantic",
    defaultStatus: "deployed",
    score: 8,
  },
  {
    keys: [/san\s*diego/i, /north\s*island/i],
    lat: 32.7,
    lng: -117.2,
    location: "San Diego, CA (Home Port)",
    defaultStatus: "home",
    score: 7,
  },
  {
    keys: [/\bnorfolk\b/i],
    lat: 36.91,
    lng: -76.31,
    location: "Norfolk, VA (Home Port)",
    defaultStatus: "home",
    score: 7,
  },
  {
    keys: [/\byokosuka\b/i],
    lat: 35.3,
    lng: 139.7,
    location: "Yokosuka, Japan (Forward Deployed)",
    defaultStatus: "home",
    score: 7,
  },
  {
    keys: [/bremerton/i, /kitsap/i, /\bpsns\b/i, /puget\s*sound\s*naval/i],
    lat: 47.6,
    lng: -122.6,
    location: "Bremerton / Puget Sound, WA",
    defaultStatus: "maintenance",
    score: 8,
  },
  {
    keys: [/newport\s*news/i],
    lat: 37.0,
    lng: -76.4,
    location: "Newport News Shipyard, VA",
    defaultStatus: "maintenance",
    score: 8,
  },
];

function carrierMatchers(carrier: UsCarrier): RegExp[] {
  const short = carrier.name.replace(/^USS\s+/i, "").trim();
  const hullDigits = carrier.hull.replace(/\D/g, "");
  const out: RegExp[] = [];
  if (hullDigits) {
    out.push(new RegExp(`\\bCVN[\\s-]*0*${hullDigits}\\b`, "i"));
  }
  out.push(new RegExp(`\\bUSS\\s+${escapeRegExp(short)}\\b`, "i"));
  out.push(new RegExp(`\\b${escapeRegExp(short)}\\b`, "i"));
  return out;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function inferStatus(windowText: string, fallback: UsCarrierStatus): UsCarrierStatus {
  if (
    /\b(DPIA|RCOH|shipyard|drydock|dry-dock|maintenance|PIA|decommission)/i.test(windowText)
  ) {
    return "maintenance";
  }
  if (
    /\b(in port|homeport|home port|returned to|alongside|moored at)\b/i.test(windowText)
  ) {
    return "home";
  }
  if (
    /\b(underway|deployed|operating|transited|transit|en route|strike group|at sea)\b/i.test(
      windowText,
    )
  ) {
    return "deployed";
  }
  return fallback;
}

function findBestRegion(
  text: string,
  matchIndex: number,
): { region: RegionHit; window: string } | null {
  const start = Math.max(0, matchIndex - 220);
  const end = Math.min(text.length, matchIndex + 640);
  const window = text.slice(start, end);
  let best: RegionHit | null = null;
  for (const region of REGIONS) {
    if (!region.keys.some((re) => re.test(window))) continue;
    if (!best || region.score > best.score) best = region;
  }
  return best ? { region: best, window } : null;
}

/**
 * 본문에서 알려진 CVN마다 가장 설득력 있는 위치 패치를 뽑는다.
 * 같은 함이 여러 번 나오면 뒤에 나온(보통 더 최신) 매칭을 우선한다.
 */
export function extractCarrierPatchesFromText(
  text: string,
  opts?: { evidenceUrl?: string; asOfLabel?: string },
): CarrierNewsPatch[] {
  if (!text.trim()) return [];
  const asOf = opts?.asOfLabel?.trim() || "USNI / public report";
  const byId = new Map<string, CarrierNewsPatch>();

  for (const carrier of US_CARRIERS_SEED) {
    const matchers = carrierMatchers(carrier);
    let lastIdx = -1;
    for (const re of matchers) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
      const global = new RegExp(re.source, flags);
      while ((m = global.exec(text)) !== null) {
        lastIdx = m.index;
        // Prevent zero-length loops
        if (m[0].length === 0) global.lastIndex += 1;
      }
    }
    if (lastIdx < 0) continue;
    const hit = findBestRegion(text, lastIdx);
    if (!hit) continue;
    const status = inferStatus(hit.window, hit.region.defaultStatus);
    const shortName = carrier.name.replace(/^USS\s+/i, "");
    const confidence =
      new RegExp(`\\bCVN[\\s-]*0*${carrier.hull.replace(/\D/g, "")}\\b`, "i").test(hit.window) ||
      new RegExp(`\\bUSS\\s+${escapeRegExp(shortName)}\\b`, "i").test(hit.window)
        ? "high"
        : "medium";

    byId.set(carrier.id, {
      id: carrier.id,
      lat: hit.region.lat,
      lng: hit.region.lng,
      status,
      location: hit.region.location,
      notes: `Auto from news · ${asOf}`,
      evidenceUrl: opts?.evidenceUrl,
      confidence,
    });
  }

  return [...byId.values()];
}

export function applyCarrierPatches(
  base: UsCarrier[],
  patches: CarrierNewsPatch[],
): { carriers: UsCarrier[]; updatedIds: string[] } {
  if (patches.length === 0) return { carriers: base.map((c) => ({ ...c })), updatedIds: [] };
  const map = new Map(patches.map((p) => [p.id, p]));
  const updatedIds: string[] = [];
  const carriers = base.map((c) => {
    const p = map.get(c.id);
    if (!p) return { ...c };
    // low confidence short-name hits should not yank maintenance hulls across oceans
    if (p.confidence === "low" && c.status === "maintenance") return { ...c };
    updatedIds.push(c.id);
    return {
      ...c,
      lat: p.lat,
      lng: p.lng,
      status: p.status,
      location: p.location,
      notes: p.evidenceUrl ? `${p.notes} · ${p.evidenceUrl}` : p.notes,
    };
  });
  return { carriers, updatedIds };
}
