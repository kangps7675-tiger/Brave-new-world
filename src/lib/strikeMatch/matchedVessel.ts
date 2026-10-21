/**
 * UKMTO 는 선박명을 공개하지 않는다. 그래서 사건 카드에는 사진이 없었다.
 * 우리 AIS 매칭(/api/strikes)이 "확인"(선명 일치) 또는 "유력"(정황이 하나로 좁혀짐)으로 한 척을 찍은 사건만
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

/** 스택 항목 id(`ukmto:<id>`) → 매칭된 선박. 순수 함수. */
export function pickMatchedVessel(strikes: StrikeRow[], stackItemId: string): MatchedVessel | null {
  if (!stackItemId.startsWith("ukmto:")) return null;
  const caseId = stackItemId.slice("ukmto:".length);
  const row = strikes.find((s) => s.incident?.id === caseId);
  if (!row || (row.status !== "confirmed" && row.status !== "likely")) return null;
  const name = row.top?.name?.trim();
  if (!name) return null;
  return { name, imo: row.top?.imo?.trim() || null, status: row.status };
}

let cache: { at: number; promise: Promise<StrikeRow[]> } | null = null;
const TTL_MS = 5 * 60_000;

/** 사건 목록을 한 번만 받아 카드들이 공유한다 (5분). 실패하면 빈 목록. */
export function loadStrikeMatches(fetchImpl: typeof fetch = fetch): Promise<StrikeRow[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.promise;
  const promise = fetchImpl("/api/strikes?days=365&limit=30")
    .then((r) => (r.ok ? r.json() : { strikes: [] }))
    .then((j: { strikes?: StrikeRow[] }) => (Array.isArray(j.strikes) ? j.strikes : []))
    .catch(() => [] as StrikeRow[]);
  cache = { at: Date.now(), promise };
  return promise;
}

/** 테스트용 */
export function resetStrikeMatchCache(): void {
  cache = null;
}
