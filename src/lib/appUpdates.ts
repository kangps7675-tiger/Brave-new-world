/**
 * 앱 업데이트("이번엔 뭐가 생겼나") — 배포 시 CURRENT만 갱신.
 * git merge 감지 없음. localStorage에 본 버전 id만 저장.
 * 문구는 유저가 바로 알아먹게. UI는 양피지(길어져도 OK).
 */

export type AppUpdate = {
  /** 의미 있는 묶음 id — 바꿀 때마다 양피지가 다시 뜸 */
  id: string;
  titleKo: string;
  titleEn: string;
  /** 양피지 본문 — 짧아도 되고, 길어도 스크롤됨 */
  paragraphsKo: string[];
  paragraphsEn: string[];
  /** 선택 CTA — 플레이 허브 등 */
  ctaKo?: string;
  ctaEn?: string;
  ctaAction?: "play-hub" | "dismiss";
};

const STORAGE_KEY = "cv-app-update-seen";

/**
 * 배포/머지 후 여기만 고치면 재방문 유저에게 양피지가 뜸.
 * 매 커밋마다 바꾸지 말 것 — 의미 있는 묶음만.
 */
export const CURRENT_APP_UPDATE: AppUpdate = {
  id: "2026-07-20-play-sense",
  titleKo: "잠깐, 새로 생긴 것들",
  titleEn: "A few new things",
  paragraphsKo: [
    "우측 아래 ▶ 버튼을 눌러 보세요. 지도를 ‘보기만’ 하는 화면에서, 직접 맞춰 보는 화면으로 바뀝니다.",
    "「여기 어디게」 — 실제 화재·분쟁·선박 좌표 근처로 날아갑니다. 지형만 보고 어느 해협·전장인지 맞춰 보세요. 밀덕 자랑하기 좋습니다.",
    "「지정학 감각 테스트」 — 예전에 있었던 사건 직후, 유가·가스가 어떻게 움직였는지 5문제. 끝나면 점수 카드를 공유할 수 있습니다.",
    "속보 아래에는 「그때 백만 원 넣었다면」 반사실 숫자와, 어제 예측 맞대결(나 vs 다른 요원)도 붙어 있습니다. 전쟁과 돈이 한 화면에 같이 보입니다.",
  ],
  paragraphsEn: [
    "Tap the ▶ button at the bottom-right. The globe stops being only a map — you get to play on it.",
    "“Where is this?” — We fly you near a real fire, conflict, or ship coordinate. Guess the strait or theater from the terrain alone.",
    "“Geopolitics sense” — Five questions on how oil and gas moved after real events. Share your score card when you’re done.",
    "Under breaking news you’ll also find a “what if you’d invested” number and yesterday’s prediction duel. War and money on one screen.",
  ],
  ctaKo: "한번 해보기",
  ctaEn: "Try it",
  ctaAction: "play-hub",
};

export function readSeenAppUpdateId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function markAppUpdateSeen(id: string = CURRENT_APP_UPDATE.id): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

/**
 * 재방문(웰컴 게이트 완료)이고, 아직 이 버전을 안 본 경우만 오퍼.
 * 첫 진입 온보딩 중에는 null.
 */
export function resolvePendingAppUpdate(welcomeDone: boolean): AppUpdate | null {
  if (!welcomeDone) return null;
  const seen = readSeenAppUpdateId();
  if (seen === CURRENT_APP_UPDATE.id) return null;
  return CURRENT_APP_UPDATE;
}
