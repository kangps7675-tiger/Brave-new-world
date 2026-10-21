/**
 * UKMTO 는 선박명을 공개하지 않는다. 그래서 사건 카드에는 사진이 없었다.
 * 우리 AIS 매칭(Datalastic 항적 보강 포함, /api/strikes/:id)이 "확인"(선명 일치) 또는 "유력"(정황이 하나로 좁혀짐)으로 한 척을 찍은 사건만
 * 그 배의 이름을 사진 검색에 쓴다. 후보가 여럿(ambiguous)이거나 못 좁힌(unknown) 사건은 쓰지 않는다.
 */

export type MatchedVessel = {
  name: string;
  imo: string | null;
  /** confirmed: 경보·기사의 선명과 AIS 선명이 일치. likely: 정황상 유력(확정 아님) */
  status: "confirmed" | "likely";
};

type StrikeRow = {
  incident?: { id?: string };
  status?: string;
  top?: { name?: string | null; imo?: string | null } | null;
};

/** 매칭 결과 1건 → 선박. 확인·유력일 때만, 이름이 있을 때만. 순수 함수. */
export function matchedVesselOf(row: StrikeRow | null | undefined): MatchedVessel | null {
  if (!row || (row.status !== "confirmed" && row.status !== "likely")) return null;
  const name = row.top?.name?.trim();
  if (!name) return null;
  return { name, imo: row.top?.imo?.trim() || null, status: row.status };
}

/** 스택 항목 id(`ukmto:<id>`) → 사건 id. UKMTO 가 아니면 null. */
export function caseIdOfStackItem(stackItemId: string): string | null {
  return stackItemId.startsWith("ukmto:") ? stackItemId.slice("ukmto:".length) || null : null;
}

const cache = new Map<string, { at: number; promise: Promise<MatchedVessel | null> }>();
const TTL_MS = 10 * 60_000;

/**
 * 사건 상세(/api/strikes/:id) — 우리 AIS 이력에 Datalastic 항적을 더해 매칭한 결과.
 * 서버가 10분 캐시하므로 사건당 유료 조회는 그 간격으로만 나간다. 실패하면 null.
 */
export function loadMatchedVessel(caseId: string, fetchImpl: typeof fetch = fetch): Promise<MatchedVessel | null> {
  const hit = cache.get(caseId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.promise;
  const promise = fetchImpl(`/api/strikes/${encodeURIComponent(caseId)}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { strike?: StrikeRow } | null) => matchedVesselOf(j?.strike))
    .catch(() => null);
  cache.set(caseId, { at: Date.now(), promise });
  return promise;
}

/** 테스트용 */
export function resetMatchedVesselCache(): void {
  cache.clear();
}
