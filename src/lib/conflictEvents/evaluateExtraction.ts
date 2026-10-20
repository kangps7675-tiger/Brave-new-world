import type { ConflictTheater } from "@/lib/conflictEvents/types";

export type ExtractionGold = {
  id: string;
  expectLocated: boolean;
  expectPlaceId?: string;
  expectTheater?: ConflictTheater;
  /** @deprecated use expectTheater */
  theater?: ConflictTheater;
};

export type ExtractionAuditRow = {
  id: string;
  title: string;
  located: boolean;
  placeId: string | null;
  theater: string | null;
  goldOk: boolean | null;
};

export function auditExtraction(
  events: import("@/lib/conflictEvents/types").RawConflictEvent[],
  gold: ExtractionGold[],
): {
  rows: ExtractionAuditRow[];
  matchRate: number;
  falsePositiveRate: number;
  locatedCount: number;
  table: string;
} {
  const byId = new Map(events.map((e) => [e.id, e]));
  const rows: ExtractionAuditRow[] = [];
  let correct = 0;
  let fp = 0;
  let labeled = 0;

  for (const g of gold) {
    const ev = byId.get(g.id);
    const located = ev
      ? Boolean(ev.lat != null && ev.lng != null && Number.isFinite(ev.lat) && Number.isFinite(ev.lng))
      : false;
    const placeId = ev?.matchedPlaceId ?? null;
    const expectTheater = g.expectTheater ?? g.theater;
    let goldOk: boolean | null = null;
    if (ev || g.expectLocated === false) {
      labeled += 1;
      const placeOk = g.expectPlaceId ? placeId === g.expectPlaceId : true;
      const theaterOk = expectTheater ? ev?.theater === expectTheater : true;
      // 비기대 좌표: 이벤트 자체가 없거나 미좌표여야 성공
      if (!g.expectLocated) {
        goldOk = !located;
        if (located) fp += 1;
      } else {
        goldOk = Boolean(ev) && located && placeOk && theaterOk;
      }
      if (goldOk) correct += 1;
    }
    rows.push({
      id: g.id,
      title: ev?.title ?? "(missing)",
      located,
      placeId,
      theater: ev?.theater ?? null,
      goldOk,
    });
  }

  const locatedCount = events.filter(
    (e) => e.lat != null && e.lng != null && Number.isFinite(e.lat) && Number.isFinite(e.lng),
  ).length;
  const matchRate = labeled === 0 ? 0 : correct / labeled;
  const neg = gold.filter((g) => !g.expectLocated).length;
  const falsePositiveRate = neg === 0 ? 0 : fp / neg;
  const table = [
    "id\tlocated\tplace\ttheater\tgold",
    ...rows.map(
      (r) =>
        `${r.id}\t${r.located ? "Y" : "N"}\t${r.placeId ?? "-"}\t${r.theater ?? "-"}\t${r.goldOk == null ? "-" : r.goldOk ? "ok" : "fail"}`,
    ),
  ].join("\n");

  return { rows, matchRate, falsePositiveRate, locatedCount, table };
}
