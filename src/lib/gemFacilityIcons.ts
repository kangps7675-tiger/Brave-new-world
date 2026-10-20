import type { StaticPointKind } from "@/data/geoTypes";

/** GEM 자원 시설 — MapLibre symbol 아이콘으로 그리는 kinds */
export const GEM_FACILITY_KINDS = [
  "gem-coal-plant",
  "gem-coal-mine",
  "gem-coal-terminal",
  "gem-nuclear",
  "gem-solar",
  "gem-wind",
  "gem-hydro",
  "gem-geothermal",
  "gem-bioenergy",
  "gem-oil-gas-plant",
  "gem-oil-gas-extraction",
  "gem-iron-ore",
  "gem-cement",
  "gem-steel",
  "gem-chemical",
] as const satisfies readonly StaticPointKind[];

export type GemFacilityKind = (typeof GEM_FACILITY_KINDS)[number];

const GEM_KIND_SET = new Set<string>(GEM_FACILITY_KINDS);

export function isGemFacilityKind(kind: string | undefined | null): kind is GemFacilityKind {
  return typeof kind === "string" && GEM_KIND_SET.has(kind);
}

export function gemFacilityIconId(kind: GemFacilityKind): string {
  return `gem-facility-${kind}`;
}

function wrap(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 32 32">${body}</svg>`;
}

/** 종류마다 건물 실루엣·색을 전부 다르게 */
export const GEM_FACILITY_SVGS: Record<GemFacilityKind, string> = {
  // 석탄 발전 — 굴뚝 2개 + 보일러 블록 (스톤 브라운)
  "gem-coal-plant": wrap(`
    <ellipse cx="16" cy="29" rx="11" ry="1.8" fill="#1c1917" opacity="0.4"/>
    <rect x="6" y="14" width="14" height="12" rx="1" fill="#78716c" stroke="#d6d3d1" stroke-width="0.6"/>
    <rect x="8" y="16" width="3" height="3" fill="#292524" opacity="0.55"/>
    <rect x="13" y="16" width="3" height="3" fill="#292524" opacity="0.45"/>
    <rect x="8" y="21" width="3" height="3" fill="#292524" opacity="0.5"/>
    <rect x="13" y="21" width="3" height="3" fill="#292524" opacity="0.4"/>
    <rect x="21" y="8" width="3.2" height="18" rx="0.6" fill="#57534e" stroke="#a8a29e" stroke-width="0.5"/>
    <rect x="25.5" y="11" width="2.6" height="15" rx="0.5" fill="#44403c" stroke="#a8a29e" stroke-width="0.45"/>
    <path d="M22.6 6 Q24 3 25.4 6" fill="none" stroke="#a8a29e" stroke-width="1.1" opacity="0.7"/>
    <path d="M26.8 9 Q28 6.5 29.2 9" fill="none" stroke="#d6d3d1" stroke-width="0.9" opacity="0.55"/>
  `),

  // 석탄 광산 — 노천 구덩이 + 크레인 (차콜)
  "gem-coal-mine": wrap(`
    <ellipse cx="16" cy="28.5" rx="12" ry="2" fill="#0c0a09" opacity="0.45"/>
    <path d="M4 18 L10 26 H22 L28 18 Z" fill="#44403c" stroke="#a8a29e" stroke-width="0.6"/>
    <path d="M10 26 L16 20 L22 26 Z" fill="#1c1917" opacity="0.85"/>
    <path d="M16 6 V16" stroke="#78716c" stroke-width="1.4"/>
    <path d="M16 8 L26 14" stroke="#a8a29e" stroke-width="1.2"/>
    <rect x="24.5" y="12.5" width="4" height="3" rx="0.4" fill="#57534e" stroke="#d6d3d1" stroke-width="0.45"/>
    <circle cx="16" cy="6" r="1.6" fill="#d6d3d1"/>
  `),

  // 석탄 터미널 — 사일로 3 + 컨베이어 (웜 그레이)
  "gem-coal-terminal": wrap(`
    <ellipse cx="16" cy="29" rx="11" ry="1.7" fill="#1c1917" opacity="0.35"/>
    <rect x="4" y="12" width="6" height="14" rx="3" fill="#57534e" stroke="#d6d3d1" stroke-width="0.55"/>
    <rect x="12" y="10" width="6" height="16" rx="3" fill="#78716c" stroke="#e7e5e4" stroke-width="0.55"/>
    <rect x="20" y="13" width="6" height="13" rx="3" fill="#44403c" stroke="#a8a29e" stroke-width="0.55"/>
    <path d="M7 18 L15 14 L23 17" fill="none" stroke="#fbbf24" stroke-width="1.3" stroke-linecap="round"/>
    <rect x="5.2" y="11" width="3.6" height="1.4" rx="0.4" fill="#a8a29e"/>
    <rect x="13.2" y="9" width="3.6" height="1.4" rx="0.4" fill="#d6d3d1"/>
    <rect x="21.2" y="12" width="3.6" height="1.4" rx="0.4" fill="#a8a29e"/>
  `),

  // 원자력 — 냉각탑 쌍 + 원자 마크 (노랑)
  "gem-nuclear": wrap(`
    <ellipse cx="11" cy="27" rx="5.5" ry="1.8" fill="#713f12" opacity="0.35"/>
    <ellipse cx="22" cy="27" rx="5.5" ry="1.8" fill="#713f12" opacity="0.35"/>
    <path d="M6.5 27 C6.5 16 8.5 9 11 7 C13.5 9 15.5 16 15.5 27 Z" fill="#facc15" stroke="#fef9c3" stroke-width="0.65"/>
    <path d="M17.5 27 C17.5 16 19.5 9 22 7 C24.5 9 26.5 16 26.5 27 Z" fill="#eab308" stroke="#fef08a" stroke-width="0.65"/>
    <circle cx="16" cy="13" r="3.4" fill="none" stroke="#fef08a" stroke-width="1.1"/>
    <path d="M16 9.6 V16.4 M12.6 13 H19.4" stroke="#fef9c3" stroke-width="0.85"/>
  `),

  // 태양광 — 경사 패널 어레이 (골드)
  "gem-solar": wrap(`
    <ellipse cx="16" cy="28.5" rx="11" ry="1.7" fill="#451a03" opacity="0.35"/>
    <path d="M5 20 L16 10 L27 20 L16 24 Z" fill="#f59e0b" stroke="#fde68a" stroke-width="0.7"/>
    <path d="M5 20 L16 24 L16 27 L5 23 Z" fill="#b45309"/>
    <path d="M27 20 L16 24 L16 27 L27 23 Z" fill="#d97706"/>
    <path d="M10.5 16.5 L16 13 L21.5 16.5 M8 19 L16 15 L24 19 M11 22 L16 19.5 L21 22" fill="none" stroke="#78350f" stroke-width="0.45" opacity="0.55"/>
    <circle cx="24" cy="8" r="2.4" fill="#fde047" opacity="0.9"/>
  `),

  // 풍력 — 터빈 타워 + 3엽 (스카이 시안)
  "gem-wind": wrap(`
    <ellipse cx="16" cy="29" rx="7" ry="1.5" fill="#0c4a6e" opacity="0.4"/>
    <rect x="15.1" y="14" width="1.8" height="14" rx="0.5" fill="#67e8f9" stroke="#ecfeff" stroke-width="0.4"/>
    <circle cx="16" cy="13.5" r="1.8" fill="#e0f2fe"/>
    <path d="M16 13.5 L16 3.5 L18.2 12.2 Z" fill="#22d3ee" stroke="#ecfeff" stroke-width="0.4"/>
    <path d="M16 13.5 L25.5 18 L17.2 15.8 Z" fill="#06b6d4" stroke="#a5f3fc" stroke-width="0.4"/>
    <path d="M16 13.5 L6.5 18 L14.8 15.8 Z" fill="#0891b2" stroke="#a5f3fc" stroke-width="0.4"/>
  `),

  // 수력 — 댐 벽 + 방수로 (블루)
  "gem-hydro": wrap(`
    <ellipse cx="16" cy="29" rx="12" ry="1.8" fill="#0c4a6e" opacity="0.35"/>
    <path d="M3 12 L8 26 H24 L29 12 Z" fill="#0ea5e9" stroke="#e0f2fe" stroke-width="0.7"/>
    <path d="M8 26 L16 18 L24 26 Z" fill="#0369a1" opacity="0.55"/>
    <path d="M10 16 H22 M10 19 H22 M10 22 H22" stroke="#7dd3fc" stroke-width="0.55" opacity="0.7"/>
    <path d="M14 26 V29 M18 26 V29" stroke="#38bdf8" stroke-width="1.4" stroke-linecap="round" opacity="0.85"/>
    <path d="M4 10 H28" stroke="#bae6fd" stroke-width="1.2" opacity="0.5"/>
  `),

  // 지열 — 증기 파이프 + 돔 (코랄)
  "gem-geothermal": wrap(`
    <ellipse cx="16" cy="29" rx="10" ry="1.6" fill="#7f1d1d" opacity="0.35"/>
    <path d="M10 18 A6 6 0 0 1 22 18 L22 26 H10 Z" fill="#fb7185" stroke="#fecdd3" stroke-width="0.65"/>
    <ellipse cx="16" cy="18" rx="6" ry="2.2" fill="#fda4af"/>
    <path d="M8 22 H6 V14 M24 22 H26 V12" stroke="#e11d48" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M5 10 Q6.5 7 8 10 M25 8 Q26.5 5 28 8" fill="none" stroke="#fecdd3" stroke-width="1.1" opacity="0.75"/>
    <circle cx="16" cy="22" r="1.6" fill="#9f1239"/>
  `),

  // 바이오 — 원형 탱크 + 굴뚝 (라임 그린)
  "gem-bioenergy": wrap(`
    <ellipse cx="16" cy="29" rx="11" ry="1.7" fill="#14532d" opacity="0.35"/>
    <ellipse cx="11" cy="22" rx="6" ry="5.5" fill="#4ade80" stroke="#bbf7d0" stroke-width="0.65"/>
    <ellipse cx="11" cy="17.5" rx="5.5" ry="2" fill="#86efac"/>
    <rect x="19" y="10" width="3.2" height="16" rx="0.6" fill="#22c55e" stroke="#dcfce7" stroke-width="0.5"/>
    <path d="M20.6 7 Q22 4.5 23.4 7" fill="none" stroke="#bbf7d0" stroke-width="1" opacity="0.7"/>
    <rect x="8" y="20" width="6" height="2" rx="0.3" fill="#166534" opacity="0.45"/>
  `),

  // 오일·가스 발전 — 터빈홀 + 굴뚝 (오렌지)
  "gem-oil-gas-plant": wrap(`
    <ellipse cx="16" cy="29" rx="11" ry="1.7" fill="#7c2d12" opacity="0.35"/>
    <rect x="4" y="15" width="16" height="11" rx="1" fill="#f97316" stroke="#fed7aa" stroke-width="0.65"/>
    <path d="M4 18 H20 M8 15 V26" stroke="#ffedd5" stroke-width="0.55" opacity="0.45"/>
    <rect x="22" y="7" width="3.5" height="19" rx="0.6" fill="#ea580c" stroke="#fdba74" stroke-width="0.55"/>
    <rect x="26.5" y="11" width="2.5" height="15" rx="0.5" fill="#c2410c" stroke="#fdba74" stroke-width="0.45"/>
    <path d="M23.7 5 Q25 2.5 26.3 5" fill="none" stroke="#ffedd5" stroke-width="1" opacity="0.65"/>
  `),

  // 채굴 — 펌잭 (호박색)
  "gem-oil-gas-extraction": wrap(`
    <ellipse cx="16" cy="29" rx="10" ry="1.6" fill="#78350f" opacity="0.4"/>
    <rect x="14.5" y="16" width="3" height="11" fill="#f59e0b" stroke="#fde68a" stroke-width="0.5"/>
    <path d="M7 14 L16 10 L25 14 L16 12 Z" fill="#d97706" stroke="#fef3c7" stroke-width="0.6"/>
    <path d="M16 12 L28 8" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="28" cy="8" r="1.5" fill="#fde68a"/>
    <path d="M8 26 H12 V22 H8 Z" fill="#b45309" stroke="#fcd34d" stroke-width="0.45"/>
    <path d="M10 22 V18" stroke="#fbbf24" stroke-width="1.2"/>
  `),

  // 철광 — 권양탑 (딥 레드)
  "gem-iron-ore": wrap(`
    <ellipse cx="16" cy="29" rx="11" ry="1.7" fill="#450a0a" opacity="0.4"/>
    <path d="M8 26 L12 10 H20 L24 26 Z" fill="#b91c1c" stroke="#fecaca" stroke-width="0.65"/>
    <rect x="11" y="6" width="10" height="5" rx="0.5" fill="#dc2626" stroke="#fee2e2" stroke-width="0.55"/>
    <path d="M13 11 V26 M19 11 V26" stroke="#7f1d1d" stroke-width="0.7" opacity="0.55"/>
    <path d="M16 11 V4" stroke="#fca5a5" stroke-width="1.2"/>
    <circle cx="16" cy="3.5" r="1.4" fill="#fee2e2"/>
  `),

  // 시멘트 — 로터리 킬른 + 사일로 (쿨 그레이)
  "gem-cement": wrap(`
    <ellipse cx="16" cy="29" rx="11" ry="1.7" fill="#27272a" opacity="0.4"/>
    <rect x="5" y="10" width="7" height="16" rx="3.2" fill="#a3a3a3" stroke="#e5e5e5" stroke-width="0.6"/>
    <rect x="14" y="12" width="7" height="14" rx="3.2" fill="#737373" stroke="#d4d4d4" stroke-width="0.55"/>
    <path d="M22 20 L29 14" stroke="#d4d4d4" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M22 22 L28 17" stroke="#525252" stroke-width="1.4" stroke-linecap="round"/>
    <rect x="6.5" y="9" width="4" height="1.5" rx="0.3" fill="#e5e5e5"/>
  `),

  // 철강 — 용광로 (슬레이트 블루)
  "gem-steel": wrap(`
    <ellipse cx="16" cy="29" rx="11" ry="1.7" fill="#0f172a" opacity="0.4"/>
    <path d="M8 26 L11 12 H21 L24 26 Z" fill="#64748b" stroke="#cbd5e1" stroke-width="0.7"/>
    <path d="M11 12 L16 7 L21 12 Z" fill="#94a3b8" stroke="#e2e8f0" stroke-width="0.55"/>
    <rect x="13.5" y="14" width="5" height="8" rx="0.4" fill="#1e293b" opacity="0.55"/>
    <path d="M14 8 Q16 4 18 8" fill="none" stroke="#fb923c" stroke-width="1.2" opacity="0.85"/>
    <circle cx="16" cy="18" r="1.5" fill="#f97316" opacity="0.8"/>
  `),

  // 화학 — 증류탑 열 (바이올렛)
  "gem-chemical": wrap(`
    <ellipse cx="16" cy="29" rx="11" ry="1.7" fill="#4c1d95" opacity="0.35"/>
    <rect x="5" y="10" width="4.5" height="16" rx="0.6" fill="#a855f7" stroke="#e9d5ff" stroke-width="0.55"/>
    <rect x="11.5" y="7" width="5" height="19" rx="0.6" fill="#9333ea" stroke="#f3e8ff" stroke-width="0.55"/>
    <rect x="19" y="12" width="4" height="14" rx="0.5" fill="#7e22ce" stroke="#d8b4fe" stroke-width="0.5"/>
    <rect x="24.5" y="9" width="3.5" height="17" rx="0.5" fill="#6b21a8" stroke="#e9d5ff" stroke-width="0.5"/>
    <path d="M7.2 14 H9.2 M14 11 H16.5 M21 16 H23 M26.2 13 H28" stroke="#f5f3ff" stroke-width="0.7" opacity="0.55"/>
    <circle cx="7.25" cy="8.5" r="1.2" fill="#c084fc"/>
    <circle cx="14" cy="5.5" r="1.3" fill="#e9d5ff"/>
  `),
};

function loadSvgImage(svg: string, size: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(size, size);
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load GEM facility SVG"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

type MapLike = {
  hasImage: (id: string) => boolean;
  addImage: (
    id: string,
    image: HTMLImageElement | ImageBitmap | ImageData,
    options?: { pixelRatio?: number },
  ) => void;
};

/** MapLibre 스타일에 GEM 건물 아이콘 등록 (한 번만) */
export async function ensureGemFacilityImages(map: MapLike): Promise<void> {
  await Promise.all(
    GEM_FACILITY_KINDS.map(async (kind) => {
      const id = gemFacilityIconId(kind);
      if (map.hasImage(id)) return;
      const img = await loadSvgImage(GEM_FACILITY_SVGS[kind], 64);
      map.addImage(id, img, { pixelRatio: 2 });
    }),
  );
}
