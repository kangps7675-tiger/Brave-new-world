/**
 * 해역 날씨(Datalastic) 폴링 스케줄 — 순수 함수. 5분 크론 안에서 지점별로 스스로 스로틀한다.
 *  - 성공한 지점은 SEA_WX_INTERVAL_H 시간 뒤에 다시, 실패한 지점은 SEA_WX_RETRY_H 시간 뒤에 다시.
 *  - 한 틱에 SEA_WX_MAX_PER_TICK 지점까지만 (CPU·서브요청 분산).
 *  - 월 예산은 사건 스냅샷용 예약분(EVENT_RESERVE_CREDITS)을 건드리지 않는 범위에서만 쓴다.
 */

export const SEA_WX_INTERVAL_H = 6;
export const SEA_WX_RETRY_H = 1;
export const SEA_WX_MAX_PER_TICK = 4;
/** Datalastic weather 호출당 크레딧 — 문서 확인 전까지 1 로 가정(실측 후 조정) */
export const SEA_WX_CREDITS = 1;
/** 화면이 "현재"라고 부를 수 있는 최대 나이 — 이보다 오래된 값은 내려주지 않는다 */
export const SEA_WX_MAX_AGE_H = 12;

export type SeaWxStateRow = { pointId: string; checkedAt: string; error: string | null };

export function dueSeaWeatherPoints(
  pointIds: string[],
  state: SeaWxStateRow[],
  nowMs: number,
  opts: { intervalH?: number; retryH?: number; max?: number } = {},
): string[] {
  const intervalMs = (opts.intervalH ?? SEA_WX_INTERVAL_H) * 3_600_000;
  const retryMs = (opts.retryH ?? SEA_WX_RETRY_H) * 3_600_000;
  const byId = new Map(state.map((s) => [s.pointId, s]));
  const due: Array<{ id: string; checked: number }> = [];
  for (const id of pointIds) {
    const s = byId.get(id);
    if (!s) {
      due.push({ id, checked: 0 });
      continue;
    }
    const checked = Date.parse(s.checkedAt);
    if (!Number.isFinite(checked)) {
      due.push({ id, checked: 0 });
      continue;
    }
    if (nowMs - checked >= (s.error ? retryMs : intervalMs)) due.push({ id, checked });
  }
  return due
    .sort((a, b) => a.checked - b.checked)
    .slice(0, opts.max ?? SEA_WX_MAX_PER_TICK)
    .map((d) => d.id);
}

/** 월 예산 중 사건 예약분을 남기고도 한 번 더 쓸 수 있나 */
export function canSpendOnSeaWeather(usedCredits: number, budget: number, reserve: number): boolean {
  return usedCredits + SEA_WX_CREDITS <= budget - reserve;
}

/** 성공한 값이 화면에 "현재"로 나갈 만큼 신선한가 (기준 시각이 없으면 조회 시각으로) */
export function isFreshSeaWeather(atIso: string | null, fetchedAtIso: string | null, nowMs: number): boolean {
  const t = Date.parse(atIso ?? fetchedAtIso ?? "");
  return Number.isFinite(t) && nowMs - t <= SEA_WX_MAX_AGE_H * 3_600_000;
}
