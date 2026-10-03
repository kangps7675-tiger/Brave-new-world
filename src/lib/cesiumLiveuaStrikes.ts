/**
 * 라이브유어맵 확인 타격 — 좌표 위 폭발·화염·연기 빌보드.
 * firms: 산불 레이어와 id 를 나누기 위해 liveua-strike: 를 쓴다.
 */

type CesiumNS = typeof import("cesium");

export type CesiumLiveuaStrikePoint = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  kind: "drone" | "missile";
};

const STRIKE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="88" viewBox="0 0 72 88">
  <ellipse cx="26" cy="16" rx="14" ry="9" fill="#6b7280" opacity="0.55"/>
  <ellipse cx="46" cy="12" rx="16" ry="10" fill="#9ca3af" opacity="0.5"/>
  <ellipse cx="38" cy="22" rx="11" ry="7" fill="#4b5563" opacity="0.45"/>
  <polygon points="36,26 41,40 54,34 45,46 56,58 42,52 36,66 30,52 16,58 27,46 18,34 31,40" fill="#f97316"/>
  <polygon points="36,34 39,43 48,40 42,47 47,55 38,51 36,60 34,51 25,55 30,47 24,40 33,43" fill="#fde68a"/>
  <path d="M36 84 C26 84 18 70 24 58 C27 66 32 62 35 54 C37 64 42 62 46 54 C52 68 50 84 36 84Z" fill="#dc2626"/>
  <path d="M36 78 C30 78 26 68 29 61 C32 66 35 63 36 57 C38 64 41 66 43 60 C46 70 43 78 36 78Z" fill="#fbbf24"/>
</svg>`;

const STRIKE_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(STRIKE_SVG)}`;

const STRIKE_PREFIX = "liveua-strike:";
const HEIGHT_M = 700;
const NEAR_M = 150_000;
const NEAR_SCALE = 1.65;
const FAR_M = 20_000_000;
const FAR_SCALE = 0.22;

/** 확인된 타격만 지구 위에 올리고, 빠진 속보는 지운다. */
export function syncLiveuaStrikeEntities(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
  strikes: CesiumLiveuaStrikePoint[],
): void {
  const seen = new Set<string>();
  for (const strike of strikes) {
    if (!Number.isFinite(strike.lat) || !Number.isFinite(strike.lng)) continue;
    const id = `${STRIKE_PREFIX}${strike.id}`;
    seen.add(id);
    const position = Cesium.Cartesian3.fromDegrees(strike.lng, strike.lat, HEIGHT_M);
    const width = strike.kind === "missile" ? 64 : 56;
    const height = strike.kind === "missile" ? 78 : 68;
    const existing = viewer.entities.getById(id);
    if (existing?.billboard) {
      existing.position = new Cesium.ConstantPositionProperty(position);
      existing.name = strike.title;
      existing.show = true;
      existing.billboard.width = new Cesium.ConstantProperty(width);
      existing.billboard.height = new Cesium.ConstantProperty(height);
      continue;
    }
    viewer.entities.add({
      id,
      name: strike.title,
      position,
      billboard: {
        image: STRIKE_URI,
        width,
        height,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        heightReference: Cesium.HeightReference.NONE,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scale: 1,
        scaleByDistance: new Cesium.NearFarScalar(NEAR_M, NEAR_SCALE, FAR_M, FAR_SCALE),
        color: Cesium.Color.WHITE,
      },
    });
  }

  const stale: import("cesium").Entity[] = [];
  for (const entity of viewer.entities.values) {
    if (typeof entity.id === "string" && entity.id.startsWith(STRIKE_PREFIX) && !seen.has(entity.id)) {
      stale.push(entity);
    }
  }
  for (const entity of stale) viewer.entities.remove(entity);
}

/** 화염이 숨쉬듯 커졌다 작아진다. 줌 스케일은 scaleByDistance 가 따로 곱한다. */
export function attachLiveuaStrikePulse(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
): () => void {
  const remove = viewer.scene.preUpdate.addEventListener(() => {
    if (viewer.isDestroyed()) return;
    const t = performance.now() / 1000;
    for (const entity of viewer.entities.values) {
      if (typeof entity.id !== "string" || !entity.id.startsWith(STRIKE_PREFIX)) continue;
      const bb = entity.billboard;
      if (!bb) continue;
      const phase = (entity.id.charCodeAt(entity.id.length - 1) % 5) * 1.1;
      const pulse = 0.92 + 0.16 * Math.sin(t * 3.6 + phase);
      const alpha = 0.78 + 0.22 * Math.sin(t * 2.4 + phase * 0.5);
      bb.scale = new Cesium.ConstantProperty(pulse);
      bb.color = new Cesium.ConstantProperty(Cesium.Color.WHITE.withAlpha(alpha));
    }
  });
  return () => {
    remove();
  };
}
