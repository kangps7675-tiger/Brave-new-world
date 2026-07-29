"use client";

import { track } from "@vercel/analytics";

/**
 * 퍼널 계측 — Vercel Analytics 커스텀 이벤트.
 * 실패해도 앱 동작에 영향 없도록 전부 삼킨다.
 */
type EventProps = Record<string, string | number | boolean | null>;

function safeTrack(name: string, props?: EventProps) {
  try {
    track(name, props);
  } catch {
    // no-op
  }
}

/** 도메인 게이트에서 모드 선택 (첫 진입 전환의 핵심 지점) */
export function trackDomainSelect(mode: string, ultraLite: boolean) {
  safeTrack("entry_domain_select", { mode, ultraLite });
}

/** 지정학 ↔ 지경학 스위처 */
export function trackModeSwitch(mode: string) {
  safeTrack("mode_switch", { mode });
}

/** 레이어 패널 토글 (켠/끈 레이어 키) */
export function trackLayerToggle(key: string, on: boolean) {
  safeTrack("layer_toggle", { key, on });
}

/** 장면 공유 버튼 클릭 */
export function trackShareScene(method: string) {
  safeTrack("share_scene", { method });
}

/** 딥링크(URL 상태)로 진입 */
export function trackDeeplinkOpen(mode: string | null) {
  safeTrack("deeplink_open", { mode: mode ?? "unknown" });
}

/**
 * 공유 장면 링크가 **어디서 열렸고 무엇을 봤는가** (P2-3).
 *
 * 성장 루프의 성공 기준은 "폰에 지구본이 뜨는가"가 아니라
 * **공유 링크 오픈 → 장면 이해 → 재공유**가 끊기지 않는가다.
 * 그런데 지금까지는 `deeplink_open`만 있어 **기기 구분이 없었다** —
 * 폰에서 열려 아무것도 못 보고 나간 케이스가 데스크톱 성공과 섞여 있었다.
 * 카드를 넣어도 좋아졌는지 알 수 없으므로 먼저 나눈다.
 *
 * @param surface  "globe"(지도로 재현) | "card"(폰 카드) | "lost"(둘 다 아님)
 */
export function trackSceneOpen(
  surface: "globe" | "card" | "lost",
  mode: string | null,
  placeResolved?: boolean,
) {
  safeTrack("scene_open", {
    surface,
    mode: mode ?? "unknown",
    placeResolved: placeResolved ?? false,
  });
}

/** 폰 카드에서 링크 복사 — 재공유 의도의 대리 지표 */
export function trackSceneCardCopy(mode: string | null) {
  safeTrack("scene_card_copy", { mode: mode ?? "unknown" });
}
