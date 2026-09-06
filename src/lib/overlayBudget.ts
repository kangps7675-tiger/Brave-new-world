import type { OverlayBannerKind } from "@/lib/overlayQueue";

/**
 * 배너 세션 예산 (P2-3).
 *
 * 문제:
 * 이 앱에는 오버레이·배너·코치가 29종 있다. `overlayQueue`가 "한 번에 하나"로
 * 막아주긴 하지만, **큐가 비면 곧바로 다음 배너를 밀어 넣는다.** 사용자는
 * 지도를 보러 왔는데 화면 하단에서 제안이 끝없이 올라온다.
 *
 * 결과는 배너 실명(banner blindness)이다. 그리고 그 대가는 제안 배너가
 * 아니라 **진짜 공습 경보**가 치른다 — 사용자가 이미 그 자리를 무시하도록
 * 학습해 버렸기 때문이다(Selective Attention).
 *
 * 규칙:
 *
 * 1. **긴급형은 예산 없음.** 공습·ADS-B 비상·확전 신호·선물 SPIKE는 언제나 통과한다.
 *    이것들을 아끼려고 제안 배너를 도입한 게 아니다.
 * 2. **제안형은 세션당 3개.** 투어·푸시·Ultra-Lite 권유·훈련·해상·핫지역은
 *    합쳐서 3번까지만 노출된다. 초과분은 조용히 버린다.
 * 3. **한 번 무시 = 세션 내 영구 억제.** 기존 `DISMISS_COOLDOWN_MS`는 재등장
 *    쿨다운이라 시간이 지나면 또 나왔다. 사용자가 닫았다는 건 답을 한 것이다.
 *
 * 저장은 `sessionStorage` — 탭을 닫으면 리셋된다. 영구 억제(localStorage)는
 * 사용자가 다시는 보고 싶지 않다고 명시했을 때만 쓸 것.
 */

/** 예산에 걸리지 않는 종류 — 실제 위험 고지 */
const URGENT: ReadonlySet<OverlayBannerKind> = new Set<OverlayBannerKind>([
  "airRaid",
  "adsbEmergency",
  "escalation",
  "tickerSpike",
]);

/** 세션당 허용되는 제안형 배너 총량 */
export const OFFER_BUDGET_PER_SESSION = 3;

const SHOWN_KEY = "cv:overlayBudget:shown";
const DISMISSED_KEY = "cv:overlayBudget:dismissed";

export function isUrgentBanner(kind: OverlayBannerKind): boolean {
  return URGENT.has(kind);
}

function readSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(key);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSet(key: string, value: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify([...value]));
  } catch {
    /* 사파리 프라이빗 모드 등 — 예산이 없느니만 못하지 않게 조용히 넘어간다 */
  }
}

function readCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(window.sessionStorage.getItem(SHOWN_KEY) ?? "0") || 0;
  } catch {
    return 0;
  }
}

/** 이 종류를 지금 띄워도 되는가 */
export function canSpendOverlayBudget(kind: OverlayBannerKind): boolean {
  if (isUrgentBanner(kind)) return true;
  if (readSet(DISMISSED_KEY).has(kind)) return false;
  return readCount() < OFFER_BUDGET_PER_SESSION;
}

/**
 * 실제로 노출됐을 때 호출. 같은 종류를 두 번 세지 않는다 —
 * 리렌더로 예산이 갉아먹히면 안 된다.
 */
export function markOverlayShown(kind: OverlayBannerKind): void {
  if (isUrgentBanner(kind)) return;
  const shownKinds = readSet(`${SHOWN_KEY}:kinds`);
  if (shownKinds.has(kind)) return;
  shownKinds.add(kind);
  writeSet(`${SHOWN_KEY}:kinds`, shownKinds);
  try {
    window.sessionStorage.setItem(SHOWN_KEY, String(readCount() + 1));
  } catch {
    /* noop */
  }
}

/** 사용자가 닫음 → 이 세션에서는 다시 묻지 않는다 */
export function markOverlayDismissed(kind: OverlayBannerKind): void {
  if (isUrgentBanner(kind)) return; // 긴급은 닫아도 다음 사건에 다시 떠야 한다
  const dismissed = readSet(DISMISSED_KEY);
  dismissed.add(kind);
  writeSet(DISMISSED_KEY, dismissed);
}

/**
 * 후보 맵에서 예산에 걸리는 것들을 걷어낸다.
 * `resolveTopOverlayBanner` **이전에** 적용해야 한다 — 우선순위 계산 뒤에
 * 걸러내면 예산 초과 배너가 하위 후보의 자리를 빼앗은 채로 사라진다.
 */
export function applyOverlayBudget<T extends Partial<Record<OverlayBannerKind, boolean>>>(
  candidates: T,
): T {
  const next = { ...candidates };
  for (const key of Object.keys(next) as OverlayBannerKind[]) {
    if (next[key] && !canSpendOverlayBudget(key)) {
      (next as Record<string, boolean>)[key] = false;
    }
  }
  return next;
}

/** 테스트·디버그용 */
export function resetOverlayBudget(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SHOWN_KEY);
    window.sessionStorage.removeItem(`${SHOWN_KEY}:kinds`);
    window.sessionStorage.removeItem(DISMISSED_KEY);
  } catch {
    /* noop */
  }
}
