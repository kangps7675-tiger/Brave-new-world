/**
 * 탭이 보일 때만 도는 인터벌 (P1-4).
 *
 * 문제:
 * 이 앱에는 `window.setInterval` 기반 라이브 폴링이 20개 이상 돈다
 * (GDELT · ADS-B · AIS · Telegram · 공습 · 티커 …). 그런데
 * `visibilitychange`를 보는 곳은 날짜 계산 훅 2개뿐이었다. 결과:
 *
 *  - **iOS Safari**: 백그라운드 타이머를 강하게 스로틀했다가 복귀 시 밀린
 *    콜백을 한꺼번에 흘린다 → 요청 폭주 + 첫 프레임 지연
 *  - **모바일 전반**: 보지도 않는 탭이 배터리와 데이터를 계속 먹는다
 *  - **서버**: 열려만 있고 안 보는 탭들이 폴링 부하의 상당 부분을 만든다
 *
 * 해법은 단순하다 — 숨으면 멈추고, 돌아오면 **한 번 즉시 갱신한 뒤** 재개한다.
 * 복귀 즉시 갱신이 중요한 이유: 안 그러면 사용자는 탭으로 돌아온 직후
 * 최대 폴링 주기만큼 낡은 데이터를 보게 된다.
 *
 * 사용법 — 기존 useEffect 구조를 그대로 두고 한 줄만 바꾼다:
 *
 * ```ts
 * useEffect(() => {
 *   if (!ready) return;
 *   return visibleInterval(() => void refresh(), POLL_MS);
 * }, [ready, refresh]);
 * ```
 */

export type VisibleIntervalOptions = {
  /**
   * 탭 복귀 시 1회 즉시 실행 (기본 true).
   * 갱신이 비싸거나 사용자 행동에 종속된 작업이면 false.
   */
  immediateOnResume?: boolean;
  /**
   * 복귀 즉시 실행을 흩뿌리는 지터 상한(ms, 기본 400).
   *
   * 20개 폴러가 동시에 복귀 갱신을 쏘면 그 자체가 우리가 없애려던
   * 요청 폭주다. 0~jitter 사이에서 무작위 지연해 한 프레임에 몰리지 않게 한다.
   */
  resumeJitterMs?: number;
};

/**
 * @returns cleanup — useEffect에서 그대로 반환하면 된다.
 */
export function visibleInterval(
  fn: () => void,
  intervalMs: number,
  options: VisibleIntervalOptions = {},
): () => void {
  const { immediateOnResume = true, resumeJitterMs = 400 } = options;

  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => undefined;
  }

  // 주기가 유효하지 않으면 폴링하지 않는다 (stub OFF 등에서 0/NaN이 올 수 있다)
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return () => undefined;
  }

  let timer: number | null = null;
  let resumeTimer: number | null = null;

  const stop = () => {
    if (timer != null) {
      window.clearInterval(timer);
      timer = null;
    }
    if (resumeTimer != null) {
      window.clearTimeout(resumeTimer);
      resumeTimer = null;
    }
  };

  const start = () => {
    if (timer != null) return;
    timer = window.setInterval(fn, intervalMs);
  };

  const onVisibilityChange = () => {
    if (document.hidden) {
      stop();
      return;
    }
    if (immediateOnResume) {
      const delay = resumeJitterMs > 0 ? Math.random() * resumeJitterMs : 0;
      resumeTimer = window.setTimeout(() => {
        resumeTimer = null;
        fn();
      }, delay);
    }
    start();
  };

  if (!document.hidden) start();
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    stop();
  };
}
