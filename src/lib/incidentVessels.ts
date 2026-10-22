/**
 * 사건(UKMTO 피격 경보)에 걸린 선박을 지도에서 튀어나오게 하기 위한 순수 로직.
 * level 1 = 확인·유력(한 척으로 좁혀짐), level 2 = 후보(여럿 중 하나 — 확정 아님).
 * 후보를 확정처럼 보이지 않게 레벨을 나눈다.
 */
export type IncidentLevel = 1 | 2;

type StrikeRow = {
  status?: string;
  top?: { mmsi?: string | null } | null;
  candidates?: Array<{ mmsi?: string | null }> | null;
};

export const MAX_INCIDENT_CANDIDATES_PER_CASE = 3;

export function pickIncidentMmsis(strikes: readonly StrikeRow[]): Map<string, IncidentLevel> {
  const out = new Map<string, IncidentLevel>();
  for (const s of strikes) {
    const topMmsi = s.top?.mmsi?.trim();
    if ((s.status === "confirmed" || s.status === "likely") && topMmsi) {
      out.set(topMmsi, 1);
      continue;
    }
    if (s.status === "ambiguous") {
      for (const c of (s.candidates ?? []).slice(0, MAX_INCIDENT_CANDIDATES_PER_CASE)) {
        const m = c.mmsi?.trim();
        if (m && !out.has(m)) out.set(m, 2);
      }
    }
  }
  return out;
}
