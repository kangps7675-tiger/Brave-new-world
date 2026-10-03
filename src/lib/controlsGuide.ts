/**
 * 지구본 기본 조작 안내 — 브라우저당 첫 진입 1회 자동 표시.
 * 기능 안내·메뉴에서 다시 열 수 있음.
 */

import type { LabelLanguage } from "@/lib/layerPrefs";

export const CONTROLS_GUIDE_KEY = "cv-controls-guide-v1";

export type ControlsGuideRow = {
  keys: string[];
  labelKo: string;
  labelEn: string;
};

export type ControlsGuideSection = {
  titleKo: string;
  titleEn: string;
  rows: ControlsGuideRow[];
};

export const CONTROLS_GUIDE_SECTIONS: ControlsGuideSection[] = [
  {
    titleKo: "마우스",
    titleEn: "Mouse",
    rows: [
      {
        keys: ["Drag"],
        labelKo: "지구본 돌리기 (회전)",
        labelEn: "Spin / rotate the globe",
      },
      {
        keys: ["Scroll"],
        labelKo: "확대 · 축소",
        labelEn: "Zoom in / out",
      },
      {
        keys: ["Dbl-click"],
        labelKo: "빈 바다를 두 번 클릭 → 그곳으로 확대",
        labelEn: "Double-click empty ocean to zoom in",
      },
      {
        keys: ["Alt", "Drag"],
        labelKo: "기울기(피치) · 좌우 회전(베어링)",
        labelEn: "Tilt (pitch) and spin (bearing)",
      },
      {
        keys: ["Ctrl", "Drag"],
        labelKo: "기울기 · 회전 (관측/세슘 · LiveUA 위치 보기)",
        labelEn: "Tilt / orbit (Observe/Cesium · LiveUA go-to)",
      },
      {
        keys: ["Ctrl/Alt", "←→↑↓"],
        labelKo: "키보드로 기울기·회전 (LiveUA 위치 포커스)",
        labelEn: "Keyboard tilt / orbit (LiveUA location focus)",
      },
      {
        keys: ["Right-drag"],
        labelKo: "기울기 · 회전 (트랙패드/우클릭 드래그)",
        labelEn: "Tilt / rotate (right-drag)",
      },
    ],
  },
  {
    titleKo: "키보드 — 이동",
    titleEn: "Keyboard — move",
    rows: [
      {
        keys: ["W", "A", "S", "D"],
        labelKo: "화면 이동 (앞·왼·뒤·오른)",
        labelEn: "Pan the view (forward / left / back / right)",
      },
      {
        keys: ["↑", "←", "↓", "→"],
        labelKo: "화살표로도 같은 이동",
        labelEn: "Arrow keys pan the same way",
      },
    ],
  },
  {
    titleKo: "키보드 — 확대",
    titleEn: "Keyboard — zoom",
    rows: [
      {
        keys: ["+", "="],
        labelKo: "확대 (길게 누르면 계속)",
        labelEn: "Zoom in (hold for continuous)",
      },
      {
        keys: ["−"],
        labelKo: "축소 (길게 누르면 계속)",
        labelEn: "Zoom out (hold for continuous)",
      },
      {
        keys: ["Shift", "+/−"],
        labelKo: "더 빠른 확대·축소",
        labelEn: "Faster zoom while holding Shift",
      },
    ],
  },
  {
    titleKo: "참고",
    titleEn: "Notes",
    rows: [
      {
        keys: ["입력창"],
        labelKo: "검색·입력 중에는 키보드 이동이 꺼집니다",
        labelEn: "Globe keys pause while typing in a field",
      },
      {
        keys: ["Esc"],
        labelKo: "많은 안내·패널은 Esc로 닫을 수 있습니다",
        labelEn: "Esc closes many guides and panels",
      },
    ],
  },
];

export function readControlsGuideDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(CONTROLS_GUIDE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markControlsGuideDone(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CONTROLS_GUIDE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearControlsGuideDone(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CONTROLS_GUIDE_KEY);
  } catch {
    /* ignore */
  }
}

/** 첫 방문(브라우저) — 아직 안내를 닫지 않았을 때 */
export function shouldOfferControlsGuide(): boolean {
  return !readControlsGuideDone();
}

export function controlsGuideCopy(lang: LabelLanguage): {
  title: string;
  subtitle: string;
  cta: string;
  reopenHint: string;
} {
  if (lang === "en") {
    return {
      title: "Globe controls",
      subtitle: "Mouse and keyboard basics — same keys work in Live map and Observatory.",
      cta: "Got it",
      reopenHint: "Menu → Help, or Feature guide → Controls",
    };
  }
  return {
    title: "지구본 조작키",
    subtitle: "마우스·키보드 기본 조작입니다. 라이브 지도와 관측대에서 같이 씁니다.",
    cta: "알겠어요",
    reopenHint: "메뉴 → 도움말, 또는 기능 안내 → 조작키에서 다시 볼 수 있어요",
  };
}
