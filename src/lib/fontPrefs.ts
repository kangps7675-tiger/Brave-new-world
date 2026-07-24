/**
 * UI 본문 글꼴 — 프리셋 + 커스텀 Google Fonts family.
 * 양피지·모노·데이터 폰트는 건드리지 않음 (--font-ui 만).
 */

export const UI_FONT_PREFS_KEY = "geowatch-ui-font-v1";

export type UiFontPresetId =
  | "wanted"
  | "pretendard"
  | "noto-sans-kr"
  | "ibm-plex-sans"
  | "source-sans-3"
  | "pixelify"
  | "system"
  | "custom";

export type UiFontPrefs = {
  presetId: UiFontPresetId;
  /** presetId === "custom" 일 때 Google Fonts 표시 이름 */
  customFamily: string;
};

export type UiFontPresetMeta = {
  id: UiFontPresetId;
  labelKo: string;
  labelEn: string;
  group: "readable" | "character" | "system" | "custom";
  /** Google Fonts CSS family (없으면 로컬/시스템) */
  googleFamily: string | null;
  /** CSS font-family 스택 (googleFamily 있으면 그 이름이 선두) */
  stack: string;
};

const KO_FALLBACK =
  '"Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif';

export const UI_FONT_PRESETS: UiFontPresetMeta[] = [
  {
    id: "wanted",
    labelKo: "Wanted Sans (기본)",
    labelEn: "Wanted Sans (default)",
    group: "readable",
    googleFamily: null,
    stack: `var(--font-wanted), ${KO_FALLBACK}`,
  },
  {
    id: "pretendard",
    labelKo: "Pretendard",
    labelEn: "Pretendard",
    group: "readable",
    googleFamily: null,
    stack: `var(--font-pretendard), "Pretendard", ${KO_FALLBACK}`,
  },
  {
    id: "noto-sans-kr",
    labelKo: "Noto Sans KR",
    labelEn: "Noto Sans KR",
    group: "readable",
    googleFamily: "Noto Sans KR",
    stack: `"Noto Sans KR", ${KO_FALLBACK}`,
  },
  {
    id: "ibm-plex-sans",
    labelKo: "IBM Plex Sans",
    labelEn: "IBM Plex Sans",
    group: "readable",
    googleFamily: "IBM Plex Sans",
    stack: `"IBM Plex Sans", ${KO_FALLBACK}`,
  },
  {
    id: "source-sans-3",
    labelKo: "Source Sans 3",
    labelEn: "Source Sans 3",
    group: "readable",
    googleFamily: "Source Sans 3",
    stack: `"Source Sans 3", ${KO_FALLBACK}`,
  },
  {
    id: "pixelify",
    labelKo: "픽셀 · Pixelify",
    labelEn: "Pixel · Pixelify",
    group: "character",
    googleFamily: "Pixelify Sans",
    stack: `"Pixelify Sans", ${KO_FALLBACK}`,
  },
  {
    id: "system",
    labelKo: "시스템 기본",
    labelEn: "System UI",
    group: "system",
    googleFamily: null,
    stack: `-apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", ${KO_FALLBACK}`,
  },
  {
    id: "custom",
    labelKo: "커스텀 (Google 이름)",
    labelEn: "Custom (Google name)",
    group: "custom",
    googleFamily: null,
    stack: KO_FALLBACK,
  },
];

const DEFAULT: UiFontPrefs = {
  presetId: "wanted",
  customFamily: "",
};

const GOOGLE_LINK_ID = "cv-google-ui-font";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readUiFontPrefs(): UiFontPrefs {
  if (!canUseStorage()) return { ...DEFAULT };
  try {
    const raw = window.localStorage.getItem(UI_FONT_PREFS_KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as Partial<UiFontPrefs>;
    const presetId = UI_FONT_PRESETS.some((p) => p.id === parsed.presetId)
      ? (parsed.presetId as UiFontPresetId)
      : "wanted";
    const customFamily =
      typeof parsed.customFamily === "string"
        ? sanitizeFontFamily(parsed.customFamily)
        : "";
    return { presetId, customFamily };
  } catch {
    return { ...DEFAULT };
  }
}

export function writeUiFontPrefs(prefs: UiFontPrefs): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(
    UI_FONT_PREFS_KEY,
    JSON.stringify({
      presetId: prefs.presetId,
      customFamily: sanitizeFontFamily(prefs.customFamily),
    }),
  );
}

/** Google Fonts / CSS용 — 따옴표·제어문자 제거, 길이 제한 */
export function sanitizeFontFamily(raw: string): string {
  return raw
    .replace(/["'<>\\]/g, "")
    .replace(/[\u0000-\u001f]/g, "")
    .trim()
    .slice(0, 64);
}

export function presetById(id: UiFontPresetId): UiFontPresetMeta {
  return UI_FONT_PRESETS.find((p) => p.id === id) ?? UI_FONT_PRESETS[0]!;
}

export function resolveUiFontStack(prefs: UiFontPrefs): string {
  if (prefs.presetId === "custom") {
    const name = sanitizeFontFamily(prefs.customFamily);
    if (!name) return presetById("wanted").stack;
    return `"${name}", ${KO_FALLBACK}`;
  }
  return presetById(prefs.presetId).stack;
}

export function resolveGoogleFamily(prefs: UiFontPrefs): string | null {
  if (prefs.presetId === "custom") {
    const name = sanitizeFontFamily(prefs.customFamily);
    return name || null;
  }
  return presetById(prefs.presetId).googleFamily;
}

/** Google Fonts CSS2 URL */
export function googleFontsCssUrl(family: string): string {
  const q = encodeURIComponent(sanitizeFontFamily(family)).replace(/%20/g, "+");
  return `https://fonts.googleapis.com/css2?family=${q}:wght@400;500;600;700&display=swap`;
}

function ensureGoogleStylesheet(family: string): void {
  if (typeof document === "undefined") return;
  const href = googleFontsCssUrl(family);
  if (!document.getElementById("cv-google-fonts-preconnect")) {
    const pre1 = document.createElement("link");
    pre1.rel = "preconnect";
    pre1.href = "https://fonts.googleapis.com";
    pre1.id = "cv-google-fonts-preconnect";
    document.head.appendChild(pre1);
  }
  if (!document.getElementById("cv-google-fonts-preconnect-gstatic")) {
    const pre2 = document.createElement("link");
    pre2.rel = "preconnect";
    pre2.href = "https://fonts.gstatic.com";
    pre2.crossOrigin = "anonymous";
    pre2.id = "cv-google-fonts-preconnect-gstatic";
    document.head.appendChild(pre2);
  }
  let link = document.getElementById(GOOGLE_LINK_ID) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = GOOGLE_LINK_ID;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  if (link.getAttribute("href") !== href) link.href = href;
}

function removeGoogleStylesheet(): void {
  if (typeof document === "undefined") return;
  document.getElementById(GOOGLE_LINK_ID)?.remove();
}

/** 클라이언트에서 CSS 변수 + (필요 시) Google CSS 주입 */
export function applyUiFontPrefs(prefs: UiFontPrefs): void {
  if (typeof document === "undefined") return;
  const stack = resolveUiFontStack(prefs);
  const google = resolveGoogleFamily(prefs);
  document.documentElement.style.setProperty("--font-ui", stack);
  document.documentElement.dataset.uiFont = prefs.presetId;
  if (google) ensureGoogleStylesheet(google);
  else removeGoogleStylesheet();
}

export function setUiFontPrefs(prefs: UiFontPrefs): UiFontPrefs {
  const next: UiFontPrefs = {
    presetId: prefs.presetId,
    customFamily: sanitizeFontFamily(prefs.customFamily),
  };
  writeUiFontPrefs(next);
  applyUiFontPrefs(next);
  return next;
}

/**
 * beforeInteractive 부트 — localStorage 읽어 --font-ui 선적용 + Google link.
 * layout Script에 넣음 (로직은 여기 문자열과 동기 유지).
 */
export const UI_FONT_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(UI_FONT_PREFS_KEY)};var raw=localStorage.getItem(k);if(!raw)return;var p=JSON.parse(raw);var id=p&&p.presetId?String(p.presetId):"wanted";var custom=p&&typeof p.customFamily==="string"?p.customFamily.replace(/["'<>\\\\]/g,"").trim().slice(0,64):"";var ko='"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif';var stacks={wanted:'var(--font-wanted),'+ko,pretendard:'var(--font-pretendard),"Pretendard",'+ko,"noto-sans-kr":'"Noto Sans KR",'+ko,"ibm-plex-sans":'"IBM Plex Sans",'+ko,"source-sans-3":'"Source Sans 3",'+ko,pixelify:'"Pixelify Sans",'+ko,system:'-apple-system,BlinkMacSystemFont,system-ui,"Segoe UI",'+ko};var google={wanted:null,pretendard:null,"noto-sans-kr":"Noto Sans KR","ibm-plex-sans":"IBM Plex Sans","source-sans-3":"Source Sans 3",pixelify:"Pixelify Sans",system:null};var stack=stacks[id]||stacks.wanted;var g=google[id]||null;if(id==="custom"&&custom){stack='"'+custom+'",'+ko;g=custom;}document.documentElement.style.setProperty("--font-ui",stack);document.documentElement.setAttribute("data-ui-font",id);if(g){var href="https://fonts.googleapis.com/css2?family="+encodeURIComponent(g).replace(/%20/g,"+")+":wght@400;500;600;700&display=swap";var link=document.createElement("link");link.id="cv-google-ui-font";link.rel="stylesheet";link.href=href;document.head.appendChild(link);}}catch(e){}})();`;
