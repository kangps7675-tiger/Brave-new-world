/**
 * UKMTO 사건 문구에서 「누가 쐈나」를 읽는다.
 *
 * UKMTO는 거의 주체를 밝히지 않는다(2026-10 실서버 60건 중 이란 명시 1건). 그래서 이 분류는
 * 문구에 근거가 있을 때만 주체를 붙이고, 아니면 「주체 미상」으로 둔다. 근거 문장을 같이 돌려준다.
 */
export type Actor = "iran" | "us" | "military" | "houthi" | "pirates" | "unknown";

export const ACTOR_LABEL: Record<Actor, { ko: string; en: string }> = {
  iran: { ko: "이란 측", en: "Iran-linked" },
  us: { ko: "미군", en: "US forces" },
  military: { ko: "군 작전(주체 미명시)", en: "Military activity (actor not named)" },
  houthi: { ko: "후티", en: "Houthis" },
  pirates: { ko: "해적 수법(추정)", en: "Piracy-style (inferred)" },
  unknown: { ko: "주체 미상", en: "Actor unknown" },
};

export type ActorInput = {
  detail?: string | null;
  incidentTypeName?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type ActorRead = { actor: Actor; evidence: string };

const RULES: Array<{ actor: Actor; re: RegExp; evidence: string }> = [
  { actor: "iran", re: /\bIRGC\b|\bIranian\b|Revolutionary Guard|Iran-backed/i, evidence: "UKMTO 문구에 이란(IRGC) 언급" },
  { actor: "us", re: /\bU\.?S\.?\s+(forces|navy|military|aircraft|coast guard)\b|CENTCOM|coalition forces/i, evidence: "UKMTO 문구에 미군 언급" },
  { actor: "houthi", re: /houthi|ansar\s*allah/i, evidence: "UKMTO 문구에 후티 언급" },
  {
    actor: "military",
    re: /blockade|military (forces|activity)|subject to interaction|interaction as part of/i,
    evidence: "군 작전·봉쇄 집행과 얽힌 문구 (미군으로 추정되나 UKMTO가 주체를 적지 않음)",
  },
];

/** 아덴만·소말리아 앞바다 박스 — 여기서 소형 보트 접근이면 해적 수법으로 본다 */
function inPiracyWaters(lat?: number | null, lng?: number | null): boolean {
  return lat != null && lng != null && lat >= -2 && lat <= 16 && lng >= 40 && lng <= 62;
}

export function classifyActor(input: ActorInput): ActorRead {
  const text = input.detail ?? "";
  for (const r of RULES) if (r.re.test(text)) return { actor: r.actor, evidence: r.evidence };
  if (/skiff|small craft|small boats?|armed (persons|men)/i.test(text) && inPiracyWaters(input.lat, input.lng)) {
    return { actor: "pirates", evidence: "아덴만·소말리아 앞바다에서 소형 보트 접근 (주체는 명시되지 않음)" };
  }
  return { actor: "unknown", evidence: "UKMTO가 공격 주체를 밝히지 않음" };
}

export function countActors(items: ActorInput[]): Record<Actor, number> {
  const out: Record<Actor, number> = { iran: 0, us: 0, military: 0, houthi: 0, pirates: 0, unknown: 0 };
  for (const i of items) out[classifyActor(i).actor]++;
  return out;
}
