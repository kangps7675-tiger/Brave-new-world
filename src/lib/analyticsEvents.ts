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
