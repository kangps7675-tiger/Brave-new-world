/**
 * 상선 피격으로 보는 UKMTO 유형 — 권고·의심활동은 "맞은 배"가 없을 수 있어 뺀다.
 * workers/cron-ingest/src/ukmto.ts 의 isPushWorthy 와 같은 기준 (어긋나면 푸시는 왔는데 피격 목록엔 없는 일이 생김).
 * 의존성 없음 — Worker(사건 스냅샷)와 Next(피격 목록)가 같이 쓴다.
 */

const STRIKE_TYPE_RE = /attack|board|hijack|seiz|piracy|detain/i;
const NON_STRIKE_RE = /advisory|suspicious|warning|approach/i;

export function isStrikeType(typeName: string | null | undefined): boolean {
  if (!typeName) return false;
  return STRIKE_TYPE_RE.test(typeName) && !NON_STRIKE_RE.test(typeName);
}
