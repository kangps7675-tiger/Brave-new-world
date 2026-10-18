/// <reference types="@cloudflare/workers-types" />
/**
 * aisstream ShipStaticData → D1 vessel_identity (migration 0033).
 * ais.ts 의 WebSocket 수신 중에 recordStaticIdentity 로 모으고, 수집이 끝나면 flushVesselIdentities 로 한 번에 쓴다.
 * 실패해도 AIS 메인 수집은 안 깨진다 (호출부 try/catch).
 */

export type VesselIdentityRow = {
  mmsi: string;
  imo: string | null;
  call_sign: string | null;
  ship_name: string | null;
  ship_type: number | null;
};

const pending = new Map<string, VesselIdentityRow>();

/** IMO 는 7자리, 체크섬(앞 6자리 가중합의 끝자리 = 7번째 자리)이 맞아야 채택 — 0·더미값 걸러냄 */
export function validImo(raw: unknown): string | null {
  const n = typeof raw === "string" ? Number(raw.trim()) : raw;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1_000_000 || n > 9_999_999) return null;
  const s = String(n);
  let sum = 0;
  for (let i = 0; i < 6; i += 1) sum += Number(s[i]) * (7 - i);
  return sum % 10 === Number(s[6]) ? s : null;
}

export function recordStaticIdentity(
  mmsi: string,
  msg: { ImoNumber?: unknown; CallSign?: unknown; Name?: unknown; Type?: unknown } | undefined,
): void {
  if (!msg) return;
  const imo = validImo(msg.ImoNumber);
  const callSign = typeof msg.CallSign === "string" ? msg.CallSign.trim() || null : null;
  const name = typeof msg.Name === "string" ? msg.Name.trim() || null : null;
  const type = typeof msg.Type === "number" && Number.isFinite(msg.Type) ? msg.Type : null;
  if (!imo && !callSign) return; // 이름·선종만은 ais_vessels 에 이미 있음
  const prev = pending.get(mmsi);
  pending.set(mmsi, {
    mmsi,
    imo: imo ?? prev?.imo ?? null,
    call_sign: callSign ?? prev?.call_sign ?? null,
    ship_name: name ?? prev?.ship_name ?? null,
    ship_type: type ?? prev?.ship_type ?? null,
  });
}

export async function flushVesselIdentities(db: D1Database): Promise<number> {
  if (pending.size === 0) return 0;
  const rows = [...pending.values()];
  pending.clear();
  const now = new Date().toISOString();
  const stmts = rows.map((r) =>
    db
      .prepare(
        `INSERT INTO vessel_identity (mmsi, imo, call_sign, ship_name, ship_type, source, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'aisstream', ?6)
         ON CONFLICT(mmsi) DO UPDATE SET
           imo = COALESCE(excluded.imo, vessel_identity.imo),
           call_sign = COALESCE(excluded.call_sign, vessel_identity.call_sign),
           ship_name = COALESCE(excluded.ship_name, vessel_identity.ship_name),
           ship_type = COALESCE(excluded.ship_type, vessel_identity.ship_type),
           updated_at = excluded.updated_at`,
      )
      .bind(r.mmsi, r.imo, r.call_sign, r.ship_name, r.ship_type, now),
  );
  for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50));
  return rows.length;
}
