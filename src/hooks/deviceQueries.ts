import { PHONE_QUERY } from "@/hooks/phoneQuery";

/**
 * 기기 프로파일 미디어쿼리 — layout 인라인 스크립트·useDeviceProfile 공유.
 *
 * phone / tablet / desktop / desktop-wide
 */
export type DeviceProfile = "phone" | "tablet" | "desktop" | "desktop-wide";

/** 태블릿: 폰 제외. 터치+중간~랩톱폭, 또는 중간 폭 창 */
export const TABLET_QUERY =
  "(pointer: coarse) and (min-width: 641px) and (max-width: 1366px), (min-width: 641px) and (max-width: 1023px)";

export const DESKTOP_WIDE_QUERY = "(min-width: 1440px)";

/** hydration 전 html[data-device] — useDeviceProfile과 동일 판별 */
export const DEVICE_BOOT_SCRIPT = `(function(){try{var d=document.documentElement;var ua=navigator.userAgent||"";var phoneUa=/iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry|BB10|Opera Mini|IEMobile/i.test(ua);var phoneMq=window.matchMedia(${JSON.stringify(PHONE_QUERY)}).matches;var phone=phoneUa||phoneMq;var tablet=window.matchMedia(${JSON.stringify(TABLET_QUERY)}).matches;var wide=window.matchMedia(${JSON.stringify(DESKTOP_WIDE_QUERY)}).matches;var profile=phone?"phone":tablet?"tablet":wide?"desktop-wide":"desktop";d.setAttribute("data-device",profile);}catch(e){document.documentElement.setAttribute("data-device","desktop");}})();`;
