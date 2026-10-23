import type { JmicRow } from "@/data/gold/jmic2026";

export type DbIncident = {
  incidentNumber: number | null;
  incidentTypeName: string;
  vesselName?: string | null;
  utcDateOfIncident?: string | null;
};

export type JmicCheck = {
  jmicCount: number;
  found: number;
  /** JMIC에는 있는데 DB에 번호가 없는 사건 — 적재가 빠뜨렸을 가능성 */
  missing: JmicRow[];
  /** 번호는 같은데 날짜가 2일 넘게 다른 것 — 번호 체계가 다르다는 신호 */
  dateMismatch: Array<{ row: JmicRow; dbDate: string }>;
  /** 번호는 같은데 유형이 다른 것 (Attack ↔ Suspicious Activity 등) */
  typeMismatch: Array<{ row: JmicRow; dbType: string }>;
  /** DB 선명이 가려졌는데 JMIC가 이름을 아는 줄 */
  nameGains: Array<{ ref: number; dbName: string | null; jmicName: string }>;
};

const GENERIC = new Set(["", ".", "-", "--", "no", "none", "na", "n/a", "nil", "unk", "ufn", "unknown", "vessel", "merchant", "merchant vessel", "tanker", "oil tanker", "tkr", "cargo", "container", "bulk"]);

export function isAnonymizedName(name: string | null | undefined): boolean {
  const n = (name ?? "").trim().toLowerCase();
  return n.length < 3 || GENERIC.has(n);
}

const EVENT_TO_DB: Record<string, string> = {
  Attack: "Attack",
  "Suspicious activity": "Suspicious Activity",
  Hijack: "Hijack",
  "Illegal boarding": "Boarding",
};

const DAY = 86_400_000;

/** JMIC 표의 번호를 DB(ukmto_incidents)와 맞춰 본다. 2026년 사건만 비교한다. */
export function checkAgainstJmic(db: readonly DbIncident[], jmic: readonly JmicRow[]): JmicCheck {
  const byRef = new Map<number, DbIncident>();
  for (const r of db) {
    if (r.incidentNumber == null) continue;
    if (!(r.utcDateOfIncident ?? "").startsWith("2026")) continue;
    byRef.set(r.incidentNumber, r);
  }
  const out: JmicCheck = { jmicCount: jmic.length, found: 0, missing: [], dateMismatch: [], typeMismatch: [], nameGains: [] };
  for (const row of jmic) {
    const d = byRef.get(row.ref);
    if (!d) {
      out.missing.push(row);
      continue;
    }
    out.found++;
    const dt = Date.parse(d.utcDateOfIncident ?? "");
    if (Number.isFinite(dt) && Math.abs(dt - Date.parse(row.date)) > 2 * DAY) out.dateMismatch.push({ row, dbDate: d.utcDateOfIncident! });
    const want = EVENT_TO_DB[row.event];
    if (want && want !== d.incidentTypeName) out.typeMismatch.push({ row, dbType: d.incidentTypeName });
    if (row.vessel && isAnonymizedName(d.vesselName)) out.nameGains.push({ ref: row.ref, dbName: d.vesselName ?? null, jmicName: row.vessel });
  }
  return out;
}
