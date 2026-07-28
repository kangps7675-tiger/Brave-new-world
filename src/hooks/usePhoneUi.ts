"use client";

import { useSyncExternalStore } from "react";
import { PHONE_QUERY } from "@/hooks/phoneQuery";

export { PHONE_QUERY };

/**
 * 휴대폰(폰) 전용 게이트 — 태블릿·데스크톱은 제외.
 * 폰에서는 3D 지구본을 절대 mount하지 않고 텍스트/알림/속보/증시 뷰(MobileHomeView)만 띄운다.
 *
 * 판별은 두 신호의 OR — "무조건 폰"을 보장하기 위해:
 *  1) User-Agent — 실제 폰 기기 (뷰포트 크기와 무관하게 잡음)
 *  2) 미디어쿼리 — 좁은 터치 화면 (세로 폭 ≤640 / 가로 높이 ≤480, coarse 포인터)
 *
 * iPad(iOS13+)는 데스크톱 UA("Macintosh")로 위장하고 화면도 커서 폰으로 잡히지 않는다 → 태블릿은 지구본 유지.
 * 안드로이드 태블릿은 UA에 "Mobile"이 없어 폰 정규식에 걸리지 않는다 → 태블릿은 지구본 유지.
 */

/** 폰 UA — 태블릿은 의도적으로 제외 (Android 태블릿엔 "Mobile"이 없음) */
const PHONE_UA =
  /iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry|BB10|Opera Mini|IEMobile/i;

/** 실제 폰인가 — UA(고정) OR 좁은 터치 화면(라이브). SSR에서는 항상 false. */
export function isPhoneDevice(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
    if (PHONE_UA.test(ua)) return true;
    return window.matchMedia(PHONE_QUERY).matches;
  } catch {
    return false;
  }
}

function subscribePhone(onStoreChange: () => void) {
  const mq = window.matchMedia(PHONE_QUERY);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

/**
 * 폰 여부. 지구본을 mount하기 전에 이 값이 확정돼야 한다.
 * GlobeDashboard는 클라이언트에서 dynamic import로만 마운트되므로,
 * 첫 클라이언트 렌더 시점에 이미 정확한 값(UA/쿼리)이 나온다 → 지구본이 한 틱도 뜨지 않는다.
 */
export function usePhoneUi(): boolean {
  return useSyncExternalStore(subscribePhone, isPhoneDevice, () => false);
}
