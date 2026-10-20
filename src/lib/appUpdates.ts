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
  id: "2026-10-10-observe-liveua-case",
  titleKo: "관측대에서 더 잘 보는 법",
  titleEn: "See more in the Observatory",
  paragraphsKo: [
    "LiveUA 속보 양피지 안에서 「이전 / 다음」으로 같은 전장의 다른 핀을 넘길 수 있습니다. 시세·회랑 안내는 그 소식과 이어집니다.",
    "전선·통제면은 우크라만이 아닙니다. 이란·예멘·레바논·이스라엘/팔 전장도 「누가 어디를 잡았나」로 같이 봅니다.",
    "「사건」탭에서 기사·좌표로 초안을 만들고, 화재·공습 이력·선박·군용기 항적을 근거로 붙일 수 있습니다.",
    "「왜?」는 파이프라인 설명이 아닙니다. 이 소식이 지도에서 왜 중요한지, 얼마나 믿을지를 유저 말로 풀어 줍니다.",
  ],
  paragraphsEn: [
    "Inside a LiveUA flash parchment, use Previous / Next to flip other pins in the same theater — markets and corridors follow that story.",
    "Control layers are not Ukraine-only. Iran, Yemen, Lebanon, and Israel/Palestine show under “who holds the ground.”",
    "In the Case tab, draft from an article or coordinates, then attach fires, air-raid history, ships, or military tracks as evidence.",
    "Why? is not pipeline jargon — it tells you why the item matters on the map and how solid it looks.",
  ],
  ctaKo: "알겠어요",
  ctaEn: "Got it",
  ctaAction: "dismiss",
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
