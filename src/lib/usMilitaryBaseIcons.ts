/**
 * 미군기지 — MapLibre symbol 아이콘.
 * 저줌(파란 점)은 circle 레이어, zoom ≥ SETTLEMENT_DETAIL_MIN_MAP_ZOOM 에서만 성조기.
 */

export const US_MILITARY_BASE_FLAG_ICON_ID = "us-military-base-flag";

function wrap(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 32 32">${body}</svg>`;
}

/** 단순 성조기 실루엣 — 전역에서 깃발 폭주를 피하려고 작게 유지 */
export const US_MILITARY_BASE_FLAG_SVG = wrap(`
  <rect x="4" y="6" width="24" height="16" rx="1" fill="#fff" stroke="#1e3a8a" stroke-width="0.6"/>
  <rect x="4" y="6" width="10" height="8.5" fill="#1e3a8a"/>
  <g fill="#fff">
    <circle cx="6.2" cy="8" r="0.55"/><circle cx="8.2" cy="8" r="0.55"/><circle cx="10.2" cy="8" r="0.55"/>
    <circle cx="7.2" cy="9.6" r="0.55"/><circle cx="9.2" cy="9.6" r="0.55"/>
    <circle cx="6.2" cy="11.2" r="0.55"/><circle cx="8.2" cy="11.2" r="0.55"/><circle cx="10.2" cy="11.2" r="0.55"/>
  </g>
  <rect x="14" y="6" width="14" height="1.7" fill="#b91c1c"/>
  <rect x="14" y="9.4" width="14" height="1.7" fill="#b91c1c"/>
  <rect x="4" y="12.8" width="24" height="1.7" fill="#b91c1c"/>
  <rect x="4" y="16.2" width="24" height="1.7" fill="#b91c1c"/>
  <rect x="4" y="19.6" width="24" height="2.4" fill="#b91c1c"/>
`);

function loadSvgImage(svg: string, size: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(size, size);
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load US military base flag SVG"));
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

export async function ensureUsMilitaryBaseImages(map: MapLike): Promise<void> {
  if (map.hasImage(US_MILITARY_BASE_FLAG_ICON_ID)) return;
  const img = await loadSvgImage(US_MILITARY_BASE_FLAG_SVG, 64);
  map.addImage(US_MILITARY_BASE_FLAG_ICON_ID, img, { pixelRatio: 2 });
}
