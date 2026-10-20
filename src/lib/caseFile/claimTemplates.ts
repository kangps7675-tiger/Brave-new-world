import type { CaseEventType, Claim, ClaimKind } from "@/lib/caseFile/types";

type ClaimSeed = {
  kind: ClaimKind;
  statement: string;
  mapCheckable: boolean;
};

const SHARED: ClaimSeed[] = [
  { kind: "place", statement: "", mapCheckable: true },
  { kind: "time", statement: "", mapCheckable: true },
  { kind: "occurrence", statement: "", mapCheckable: true },
  { kind: "damage", statement: "", mapCheckable: true },
  { kind: "means", statement: "", mapCheckable: false },
  { kind: "actor", statement: "", mapCheckable: false },
];

const STRIKE_HINTS: Partial<Record<ClaimKind, string>> = {
  place: "장소 (피격·화재 지점)",
  time: "시간",
  occurrence: "사건 발생 (공습·화재 등)",
  damage: "피해",
  means: "수단 (미사일·드론 등) — 지도로는 대체로 확인 불가",
  actor: "주체 — 지도로는 확인 불가",
};

const MARITIME_HINTS: Partial<Record<ClaimKind, string>> = {
  place: "위치 (해역·항적)",
  time: "시간",
  occurrence: "사건 발생 (피격·나포·화재)",
  damage: "피해 정도",
  means: "수단 — 지도로는 대체로 확인 불가",
  actor: "주체 — 지도로는 확인 불가",
};

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** 사건 유형별 세부 주장 틀. statement는 추출 단계에서 채운다. */
export function buildClaimTemplates(eventType: CaseEventType): Claim[] {
  const hints =
    eventType === "maritime"
      ? MARITIME_HINTS
      : eventType === "strike"
        ? STRIKE_HINTS
        : {};

  return SHARED.map((seed) => ({
    id: newId(`claim_${seed.kind}`),
    kind: seed.kind,
    statement: hints[seed.kind] ?? seed.statement,
    mapCheckable: seed.mapCheckable,
    evidence: [],
    verdict: "unconfirmed" as const,
  }));
}
