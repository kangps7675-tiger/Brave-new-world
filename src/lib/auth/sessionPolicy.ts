/**
 * 계정 세션 정책 스캐폴딩 — 로그인 구현 시 이 파일을 연결한다.
 *
 * 제품 결정: PC(데스크톱)와 모바일 동시 접속(듀얼 세션)을 허용한다.
 * 단일 기기 강제 로그아웃은 기본값이 아니다.
 *
 * 관심 프로필(`geowatch-interest-v1` / InterestStore): 로그인 후 계정 문서 필드로 동기.
 * 최초 로그인 시 guestPolicy.onFirstLoginMigrateLocal 에 따라 로컬 → 계정 merge.
 *
 * 구현 시 권장 골격:
 * - refresh token / session row에 `deviceId` · `clientKind`(`desktop`|`mobile`|`other`) 저장
 * - 같은 userId에 대해 desktop 1 + mobile 1(+ other N) 병렬 유지
 * - 같은 kind의 새 로그인만 해당 kind의 이전 세션을 교체(선택)
 * - 유저가 “다른 기기 모두 로그아웃”을 명시할 때만 전량 revoke
 *
 * UI 카피: FeatureGuidePanel 「계정 · 기기」·「비로그인 · 게스트」 섹션.
 * 게스트 동작: @see ./guestPolicy.ts
 */

export type AuthClientKind = "desktop" | "mobile" | "other";

export const AUTH_SESSION_POLICY = {
  /** PC + 모바일 동시 로그인 허용 */
  allowDualDesktopMobile: true as const,
  /** 종류별 동시 세션 상한 (other는 여유분) */
  maxSessionsByKind: {
    desktop: 1,
    mobile: 1,
    other: 2,
  } satisfies Record<AuthClientKind, number>,
  /** 같은 kind 재로그인 시 이전 세션 교체 */
  replaceSameKindOnLogin: true as const,
  /** 기본값으로 전 기기 강제 단일 세션 금지 */
  forceSingleDevice: false as const,
} as const;

export const AUTH_SESSION_POLICY_COPY = {
  ko: {
    title: "계정 · 기기",
    steps: [
      "로그인(예정) 후 PC와 모바일을 동시에 쓸 수 있습니다. 한쪽을 켠다고 다른 쪽이 끊기지 않습니다.",
      "같은 종류의 기기(PC끼리 또는 모바일끼리)에서 다시 로그인하면 그 종류의 이전 세션만 교체됩니다.",
      "설정에서 「다른 기기 모두 로그아웃」을 눌렀을 때만 전 기기 세션이 끊깁니다.",
      "지금은 안내만 표시됩니다. 로그인 기능을 붙일 때 이 정책에 맞춰 연결합니다.",
    ],
  },
  en: {
    title: "Account · devices",
    steps: [
      "When login ships, desktop and mobile can stay signed in together — one does not kick the other.",
      "Signing in again on the same device kind replaces only that kind’s previous session.",
      "Only “Sign out everywhere” revokes all sessions.",
      "Guide-only for now — wire this policy in when auth is implemented.",
    ],
  },
} as const;

/** UA / 뷰포트로 clientKind 추정 — 로그인 폼에서 세션 발급 시 사용 */
export function inferAuthClientKind(input?: {
  userAgent?: string;
  maxTouchPoints?: number;
  viewportWidth?: number;
}): AuthClientKind {
  const ua = (input?.userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "")).toLowerCase();
  const touch =
    input?.maxTouchPoints ??
    (typeof navigator !== "undefined" ? navigator.maxTouchPoints ?? 0 : 0);
  const width =
    input?.viewportWidth ??
    (typeof window !== "undefined" ? window.innerWidth : 1024);

  if (/mobile|android|iphone|ipod|webos|blackberry|iemobile|opera mini/i.test(ua)) {
    return "mobile";
  }
  if (touch > 0 && width < 900) return "mobile";
  if (width >= 900) return "desktop";
  return "other";
}
