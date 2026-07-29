/**
 * 지정학 — 전쟁구역 사상자 HTML 오버레이 (사망/부상 + 호버 타입라이터 애도).
 * 우크라·중동 등 전장 공통. 숫자 출처는 전장별로 주입.
 */
import { prefersReducedMotion } from "@/hooks/useReducedMotion";

export type WarCasualtyOverlayInput = {
  theaterId: string;
  lat: number;
  lng: number;
  killed: number;
  wounded: number;
  killedLabel: string;
  woundedLabel: string;
  /** 부상 숫자 대신 표시할 문자열 (예: 미집계) */
  woundedDisplay?: string;
  elegyLines?: readonly [string, string];
  /** 부상 줄 호버 시 짧은 설명 (고정 추정치 등). 없으면 부상 전용 팁 없음 */
  woundedNote?: string;
  /** true면 부상 줄 숨김 (HAPI/ACLED는 fatalities만 제공) */
  hideWounded?: boolean;
  altitude?: number;
  /** 전장 박스 스팬(°) — 영토 대비 글자 크기 */
  territorySpanDeg?: number;
  /** 마커 하단 상시 출처 한 줄 (ACLED 표기 정책) */
  sourceAttribution?: string;
};

/** 우크라 부상(CSIS)용 기본 짧은 안내 */
export const WOUNDED_FIXED_NOTE = {
  ko: "부상은 특정 고정 추정치입니다. (명의 확인 목록 없음 · CSIS)",
  en: "Wounded is a fixed estimate (no named list · CSIS).",
} as const;

/** 전장 공통 애도 문장 — 호버 타입라이터 */
export const CASUALTY_ELEGY_LINES = {
  ko: [
    "단순한 숫자가 아닙니다.",
    "그 숫자만큼의 세계들이 사라진 것입니다.",
  ],
  en: [
    "These are not mere numbers.",
    "As many worlds as that number have vanished.",
  ],
} as const;

function elegyTypedKey(theaterId: string) {
  return `cv-casualty-elegy-typed:${theaterId}`;
}

export function casualtyElegyAlreadyTyped(theaterId: string): boolean {
  try {
    return sessionStorage.getItem(elegyTypedKey(theaterId)) === "1";
  } catch {
    return false;
  }
}

export function markCasualtyElegyTyped(theaterId: string): void {
  try {
    sessionStorage.setItem(elegyTypedKey(theaterId), "1");
  } catch {
    /* ignore */
  }
}

/**
 * 영토에 붙어 보이는 배율 (CSS transform에만 적용).
 * 줌아웃(고도↑) → 축소, 줌인(고도↓) → 확대.
 * 글자 px는 아래에서 고정 베이스로 두고 transform만 배율한다
 * (이전: px와 scale을 동시에 줄여 유효 글자가 ~1–3px로 사라져 숫자가 안 보임).
 */
export function getCasualtyOverlayScale(
  altitude: number,
  territorySpanDeg = 10,
): number {
  const a = Math.max(0.06, Number.isFinite(altitude) ? altitude : 1.8);
  const span = Math.max(3, Number.isFinite(territorySpanDeg) ? territorySpanDeg : 10);
  // 전장 각크기 ≈ span/a 에 비례 — 넓은 전장은 같은 고도에서 약간 더 큼
  const territoryOnScreen = span / a;
  const raw = territoryOnScreen * 0.045;
  // 하한 0.45 — 대륙 줌에서도 사망 숫자가 읽히게 (전선 호버 시에만 표시)
  return Math.min(1.35, Math.max(0.45, raw));
}

export type CasualtyOverlayMetrics = {
  scale: number;
  numPx: number;
  labelPx: number;
  elegyPx: number;
  notePx: number;
  iconPx: number;
  rowGapPx: number;
  blockGapPx: number;
};

/**
 * 숫자·아이콘 베이스 크기 (transform scale=1 기준).
 * 화면 배율은 getCasualtyOverlayScale → CSS transform만 담당.
 */
export function getCasualtyOverlayMetrics(scale: number): CasualtyOverlayMetrics {
  const s = Math.max(0.45, Math.min(1.35, scale));
  return {
    scale: s,
    numPx: 34,
    labelPx: 14,
    elegyPx: 14,
    notePx: 12,
    iconPx: 30,
    rowGapPx: 8,
    blockGapPx: 10,
  };
}

/** 카메라 고도 변경 시 DOM 글자·간격·transform 동기화 */
export function applyCasualtyOverlayMetrics(
  el: HTMLElement,
  scale: number,
  visible = true,
): void {
  const m = getCasualtyOverlayMetrics(scale);
  const visScale = visible ? m.scale : m.scale * 0.86;
  // 좌표 중심에 붙임 — 위로 띄우지 않음 (지면/전선에 고정)
  el.style.transform = `translate(-50%, -50%) scale(${visScale})`;
  el.style.transformOrigin = "50% 50%";

  const counts = el.querySelector<HTMLElement>(".casualty-skull-counts");
  if (counts) counts.style.gap = `${m.rowGapPx}px`;

  const elegyPane = el.querySelector<HTMLElement>(".casualty-elegy-pane");
  if (elegyPane) {
    // 문장 2줄 고정 — 폭을 좁히면 둘째 줄이 감겨 3줄처럼 보임
    elegyPane.style.width = "max-content";
    elegyPane.style.marginBottom = `${Math.max(4, Math.round(m.blockGapPx * 0.55))}px`;
  }

  el.querySelectorAll<HTMLElement>(".casualty-count-num").forEach((node) => {
    node.style.fontSize = `${m.numPx}px`;
  });
  el.querySelectorAll<HTMLElement>(".casualty-count-label").forEach((node) => {
    node.style.fontSize = `${m.labelPx}px`;
  });

  const elegy = el.querySelector<HTMLElement>(".casualty-elegy");
  if (elegy) elegy.style.fontSize = `${m.elegyPx}px`;

  const note = el.querySelector<HTMLElement>(".casualty-wounded-note");
  if (note) {
    note.style.fontSize = `${m.notePx}px`;
    note.style.padding = `${Math.max(3, Math.round(m.notePx * 0.55))}px ${Math.max(5, Math.round(m.notePx * 0.85))}px`;
    note.style.maxWidth = `${Math.round(m.notePx * 14)}px`;
  }

  const src = el.querySelector<HTMLElement>(".casualty-source-attribution");
  if (src) {
    src.style.fontSize = `${Math.max(5, Math.round(m.notePx * 0.85))}px`;
    src.style.marginTop = `${Math.max(3, Math.round(m.blockGapPx * 0.5))}px`;
    src.style.maxWidth = `${Math.round(m.elegyPx * 16)}px`;
  }

  el.querySelectorAll<SVGElement>(".casualty-row svg").forEach((svg) => {
    const px = String(m.iconPx);
    svg.setAttribute("width", px);
    svg.setAttribute("height", px);
  });

  el.querySelectorAll<HTMLElement>(".casualty-row").forEach((row) => {
    row.style.gap = `${Math.max(4, Math.round(m.iconPx * 0.35))}px`;
  });
}

export function formatCasualtyCount(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Wanted Sans — 사망 숫자·라벨 */
const CASUALTY_NUMBER_FONT =
  'var(--font-wanted), "Wanted Sans Variable", "Wanted Sans", ui-sans-serif, system-ui, sans-serif';

/**
 * 흰색 두개골 SVG — 둥근 두개 · 큰 원형 눈 · 역하트 코 · 윗니(아래턱 없음).
 */
function skullSvg(iconPx: number) {
  const px = Math.max(14, Math.round(iconPx));
  return `<svg class="casualty-skull-svg" width="${px}" height="${px}" viewBox="0 0 64 64" aria-hidden="true" style="display:block;flex-shrink:0;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85))">
  <path fill="#ffffff" fill-rule="evenodd" d="M32 4C17.5 4 8 14.8 8 28c0 9.2 4.6 15.5 11.2 19.2v1.6c0 1 .4 1.9 1.1 2.55L24 56.2c.35.4.85.6 1.35.6h13.3c.5 0 1-.2 1.35-.6l3.7-4.85c.7-.65 1.1-1.55 1.1-2.55v-1.6C51.4 43.5 56 37.2 56 28 56 14.8 46.5 4 32 4zM20.2 23.5a6.6 7.1 0 1 0 13.2 0 6.6 7.1 0 1 0-13.2 0zm10.4 0a6.6 7.1 0 1 0 13.2 0 6.6 7.1 0 1 0-13.2 0zM32 31.5c-2.6 0-4.6 1.7-4.6 3.5 0 .55.2 1.05.55 1.45L32 41.2l4.05-4.75c.35-.4.55-.9.55-1.45 0-1.8-2-3.5-4.6-3.5z"/>
  <path fill="#ffffff" d="M22 43.2h20v7.6c0 1.05-.6 1.95-1.5 2.25-3.1.9-13.9.9-17 0-.9-.3-1.5-1.2-1.5-2.25v-7.6z"/>
  <path fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="1.25" stroke-linecap="round" d="M25.4 43.5v8.5M28.7 43.5v8.5M32 43.5v8.5M35.3 43.5v8.5M38.6 43.5v8.5"/>
</svg>`;
}

function woundedSvg(iconPx: number) {
  return `<svg width="${iconPx}" height="${iconPx}" viewBox="0 0 24 24" aria-hidden="true" style="display:block;flex-shrink:0">
  <path fill="#ffffff" d="M12 2.2a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8zm-1.1 5.6h2.2c1.3 0 2.3 1.1 2.1 2.4l-.5 4.1c-.1.7-.7 1.2-1.4 1.2h-.2v5.2c0 .6-.5 1.1-1.1 1.1s-1.1-.5-1.1-1.1v-5.2h-.2c-.7 0-1.3-.5-1.4-1.2l-.5-4.1c-.2-1.3.8-2.4 2.1-2.4z"/>
  <path fill="#ffffff" d="M7.2 10.2c.4-.5 1.1-.5 1.5 0l1.1 1.3v2.1L8.4 12.3l-.8 6.2c-.1.6-.6 1-1.2.9-.6-.1-1-.6-.9-1.2l.9-6.6c.05-.3.2-.55.4-.7z"/>
  <path fill="#ffffff" d="M16.8 10.2c-.4-.5-1.1-.5-1.5 0l-1.1 1.3v2.1l1.4-1.3.8 6.2c.1.6.6 1 1.2.9.6-.1 1-.6.9-1.2l-.9-6.6c-.05-.3-.2-.55-.4-.7z"/>
  <path fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" d="M8.6 8.4h6.8"/>
  <circle cx="18.2" cy="7.2" r="2.1" fill="none" stroke="#ffffff" stroke-width="1.5"/>
  <path fill="none" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" d="M18.2 5.6v3.2M16.6 7.2h3.2"/>
</svg>`;
}

/**
 * 전쟁구역 공통 사상자 마커.
 * 사망 호버 → 애도 타입라이터 / 부상 호버 → 고정값 짧은 설명창
 */
export function createWarCasualtyOverlayElement(
  input: WarCasualtyOverlayInput,
): HTMLElement {
  const spanDeg = input.territorySpanDeg ?? 10;
  const scale = getCasualtyOverlayScale(input.altitude ?? 1.8, spanDeg);
  const metrics = getCasualtyOverlayMetrics(scale);
  const lines = input.elegyLines ?? CASUALTY_ELEGY_LINES.ko;
  const theaterId = input.theaterId;
  const woundedNote = input.woundedNote?.trim() || "";

  const el = document.createElement("div");
  el.className = "casualty-skull-marker war-casualty-overlay";
  el.dataset.theaterId = theaterId;
  el.dataset.territorySpan = String(spanDeg);
  // 인플로우: counts · 애도는 숫자 바로 위 absolute (핀 좌표 안 밀림)
  el.style.display = "block";
  el.style.position = "relative";
  el.style.pointerEvents = "auto";
  el.style.userSelect = "none";
  el.style.cursor = "default";
  el.style.zIndex = "7";
  el.style.filter = "drop-shadow(0 2px 6px rgba(0,0,0,0.9))";

  const numberFont = CASUALTY_NUMBER_FONT;
  const elegyFont =
    'var(--font-wanted), "Wanted Sans Variable", "Wanted Sans", sans-serif';

  const counts = document.createElement("div");
  counts.className = "casualty-skull-counts";
  counts.style.display = "flex";
  counts.style.flexDirection = "column";
  counts.style.position = "relative";
  counts.style.transition = "opacity 0.35s ease";

  const row = (
    iconSvg: string,
    count: number,
    label: string,
    kind: "killed" | "wounded",
    displayOverride?: string,
  ) => {
    const wrap = document.createElement("div");
    wrap.className = `casualty-row casualty-row-${kind}`;
    wrap.style.display = "flex";
    wrap.style.alignItems = "center";
    wrap.style.whiteSpace = "nowrap";
    wrap.style.cursor = "default";
    const numText = displayOverride ?? formatCasualtyCount(count);
    wrap.innerHTML = `
      ${iconSvg}
      <div style="display:flex;flex-direction:column;align-items:flex-start;gap:1px;line-height:1">
        <div class="casualty-count-num" style="color:#ffffff;font-family:${numberFont};font-weight:700;font-size:${metrics.numPx}px;letter-spacing:0.01em;font-variant-numeric:tabular-nums;-webkit-text-stroke:0.25px rgba(0,0,0,0.35)">${escapeHtml(
          numText,
        )}</div>
        <div class="casualty-count-label" style="color:rgba(255,255,255,0.92);font-family:${numberFont};font-weight:700;font-size:${metrics.labelPx}px;letter-spacing:0.02em">${escapeHtml(
          label,
        )}</div>
      </div>`;
    return wrap;
  };

  const killedRow = row(skullSvg(metrics.iconPx), input.killed, input.killedLabel, "killed");
  const woundedRow = input.hideWounded
    ? null
    : row(
        woundedSvg(metrics.iconPx),
        input.wounded,
        input.woundedLabel,
        "wounded",
        input.woundedDisplay,
      );
  counts.append(killedRow);
  if (woundedRow) counts.append(woundedRow);

  /** 애도 문구 — 사망 숫자 바로 위에 깔림 */
  const elegyPane = document.createElement("div");
  elegyPane.className = "casualty-elegy-pane";
  elegyPane.style.position = "absolute";
  elegyPane.style.left = "50%";
  elegyPane.style.bottom = "100%";
  elegyPane.style.transform = "translateX(-50%)";
  elegyPane.style.marginBottom = `${Math.max(4, Math.round(metrics.blockGapPx * 0.55))}px`;
  elegyPane.style.width = "max-content";
  elegyPane.style.pointerEvents = "none";
  elegyPane.style.zIndex = "2";
  elegyPane.style.textAlign = "center";

  const elegy = document.createElement("div");
  elegy.className = "casualty-elegy";
  elegy.setAttribute("aria-live", "polite");
  elegy.style.color = "#ffffff";
  elegy.style.fontFamily = elegyFont;
  elegy.style.fontWeight = "600";
  elegy.style.lineHeight = "1.45";
  elegy.style.letterSpacing = "0.01em";
  elegy.style.opacity = "0";
  elegy.style.transition = "opacity 0.35s ease";
  elegy.style.pointerEvents = "none";
  elegy.style.textShadow = "0 1px 4px rgba(0,0,0,0.85)";
  elegy.style.whiteSpace = "normal";

  const line1 = document.createElement("div");
  const line2 = document.createElement("div");
  line1.style.whiteSpace = "nowrap";
  line2.style.whiteSpace = "nowrap";
  line2.style.marginTop = "0.35em";
  elegy.append(line1, line2);
  elegyPane.append(elegy);

  const noteTip = document.createElement("div");
  noteTip.className = "casualty-wounded-note";
  noteTip.setAttribute("role", "status");
  noteTip.style.position = "absolute";
  noteTip.style.left = "50%";
  noteTip.style.bottom = "100%";
  noteTip.style.transform = "translateX(-50%)";
  noteTip.style.marginBottom = `${Math.max(4, Math.round(metrics.blockGapPx * 0.55))}px`;
  noteTip.style.borderRadius = "4px";
  noteTip.style.border = "1px solid rgba(255,255,255,0.28)";
  noteTip.style.background = "rgba(8,12,20,0.82)";
  noteTip.style.color = "rgba(255,255,255,0.95)";
  noteTip.style.fontFamily = elegyFont;
  noteTip.style.fontWeight = "600";
  noteTip.style.lineHeight = "1.4";
  noteTip.style.letterSpacing = "0.01em";
  noteTip.style.maxWidth = `${Math.round(metrics.notePx * 14)}px`;
  noteTip.style.opacity = "0";
  noteTip.style.transition = "opacity 0.2s ease";
  noteTip.style.pointerEvents = "none";
  noteTip.style.whiteSpace = "normal";
  noteTip.style.boxShadow = "0 4px 12px rgba(0,0,0,0.45)";
  noteTip.style.zIndex = "2";
  noteTip.style.textAlign = "center";
  noteTip.textContent = woundedNote;

  el.append(elegyPane, counts, noteTip);

  const sourceAttribution = input.sourceAttribution?.trim() || "";
  if (sourceAttribution) {
    const src = document.createElement("div");
    src.className = "casualty-source-attribution";
    src.style.marginTop = `${Math.max(3, Math.round(metrics.blockGapPx * 0.5))}px`;
    src.style.color = "rgba(255,255,255,0.72)";
    src.style.fontFamily = elegyFont;
    src.style.fontWeight = "600";
    src.style.fontSize = `${Math.max(5, Math.round(metrics.notePx * 0.85))}px`;
    src.style.letterSpacing = "0.02em";
    src.style.lineHeight = "1.35";
    src.style.textShadow = "0 1px 3px rgba(0,0,0,0.85)";
    src.style.maxWidth = `${Math.round(metrics.elegyPx * 16)}px`;
    src.style.whiteSpace = "normal";
    src.textContent = sourceAttribution;
    el.append(src);
  }

  applyCasualtyOverlayMetrics(el, scale, true);

  let timer: ReturnType<typeof setTimeout> | null = null;
  let noteHideTimer: ReturnType<typeof setTimeout> | null = null;
  let elegyActive = false;

  const clearTimer = () => {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const hideNote = () => {
    if (noteHideTimer != null) {
      clearTimeout(noteHideTimer);
      noteHideTimer = null;
    }
    noteTip.style.opacity = "0";
  };

  const showNote = () => {
    if (!woundedNote) return;
    hideElegy(true);
    noteTip.style.opacity = "1";
    if (noteHideTimer != null) clearTimeout(noteHideTimer);
  };

  const showFullElegy = () => {
    hideNote();
    line1.textContent = lines[0];
    line2.textContent = lines[1];
    elegy.style.opacity = "1";
    counts.style.opacity = "0.45";
  };

  const hideElegy = (immediate = false) => {
    clearTimer();
    elegyActive = false;
    elegy.style.opacity = "0";
    counts.style.opacity = "1";
    const clearText = () => {
      if (!elegyActive) {
        line1.textContent = "";
        line2.textContent = "";
      }
    };
    if (immediate) {
      clearText();
      return;
    }
    timer = setTimeout(() => {
      clearText();
      timer = null;
    }, 320);
  };

  const typewrite = () => {
    hideNote();
    clearTimer();
    elegyActive = true;
    const reduced =
      prefersReducedMotion();
    const skipType = reduced || casualtyElegyAlreadyTyped(theaterId);

    if (skipType) {
      showFullElegy();
      return;
    }

    line1.textContent = "";
    line2.textContent = "";
    elegy.style.opacity = "1";
    counts.style.opacity = "0.45";

    const msPerChar = 48;
    const pauseBetweenLines = 420;
    let lineIdx = 0;
    let charIdx = 0;

    const tick = () => {
      if (!elegyActive) return;
      const current = lines[lineIdx] ?? "";
      const target = lineIdx === 0 ? line1 : line2;
      if (charIdx < current.length) {
        target.textContent = current.slice(0, charIdx + 1);
        charIdx += 1;
        timer = setTimeout(tick, msPerChar);
        return;
      }
      if (lineIdx === 0) {
        lineIdx = 1;
        charIdx = 0;
        timer = setTimeout(tick, pauseBetweenLines);
        return;
      }
      markCasualtyElegyTyped(theaterId);
      timer = null;
    };

    timer = setTimeout(tick, 280);
  };

  killedRow.addEventListener("mouseenter", typewrite);
  killedRow.addEventListener("mouseleave", () => hideElegy(false));

  if (woundedRow && woundedNote) {
    woundedRow.addEventListener("mouseenter", showNote);
    woundedRow.addEventListener("mouseleave", hideNote);
  }

  el.addEventListener("mouseleave", () => {
    hideElegy(false);
    hideNote();
  });

  killedRow.addEventListener(
    "touchend",
    (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      hideNote();
      if (elegy.style.opacity === "1" && (line1.textContent || line2.textContent)) {
        hideElegy(false);
      } else {
        typewrite();
      }
    },
    { passive: false },
  );

  if (woundedRow && woundedNote) {
    woundedRow.addEventListener(
      "touchend",
      (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        hideElegy(true);
        if (noteTip.style.opacity === "1") {
          hideNote();
        } else {
          showNote();
          noteHideTimer = setTimeout(hideNote, 2200);
        }
      },
      { passive: false },
    );
  }

  return el;
}
