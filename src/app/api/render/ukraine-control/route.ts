import { loadViinaRenderData } from "@/lib/viinaServerData";
import { VIINA_POLICY } from "@/lib/licensing/viinaPolicy";
import { assertViinaRenderAccess } from "@/lib/licensing/viinaRenderGate";
import { loadUkraineHatchCache } from "@/lib/ukraineHatchServerData";
import type { UkraineControlZone } from "@/data/geoTypes";

/**
 * 지구본 렌더 전용 — private/viina-render 캐시를 같은 앱 클라이언트에만 전달.
 * 세션 쿠키·same-origin 게이트 필수. hatch 준비 시 geometry는 축소본만 반환.
 * @see docs/copyright-checklist.md
 */
function stripZoneGeometry(zones: UkraineControlZone[]): UkraineControlZone[] {
  return zones.map((zone) => ({
    ...zone,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [zone.center.lng - 0.01, zone.center.lat - 0.01],
          [zone.center.lng + 0.01, zone.center.lat - 0.01],
          [zone.center.lng + 0.01, zone.center.lat + 0.01],
          [zone.center.lng - 0.01, zone.center.lat + 0.01],
          [zone.center.lng - 0.01, zone.center.lat - 0.01],
        ],
      ],
    },
  }));
}

const ANTI_SCRAPE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Viina-Policy": "rendering-only",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
} as const;

export async function GET(request: Request) {
  if (!VIINA_POLICY.renderingOnly) {
    return Response.json({ error: "viina-rendering-disabled" }, { status: 404 });
  }

  const gate = assertViinaRenderAccess(request);
  if (!gate.ok) return gate.response;

  const data = loadViinaRenderData();
  if (!data?.features?.length) {
    return Response.json(
      {
        error: "viina-render-cache-missing",
        hint: "Run: npm run viina:build",
      },
      { status: 404, headers: ANTI_SCRAPE_HEADERS },
    );
  }

  const { searchParams } = new URL(request.url);
  const light = searchParams.get("light") === "1";
  const hatchReady =
    Boolean(loadUkraineHatchCache("overview")?.paths?.length) ||
    Boolean(loadUkraineHatchCache("detail")?.paths?.length);

  // hatch 준비 시: 풀 Voronoi geometry bulk 반출 금지 (축소본만).
  // hatch 없으면 게이트 통과 브라우저에만 풀 페이로드 (지도 표시용).
  const strip = hatchReady || light;

  if (strip) {
    return Response.json(
      {
        ...data,
        features: stripZoneGeometry(data.features),
        overviewFeatures: data.overviewFeatures?.length
          ? stripZoneGeometry(data.overviewFeatures)
          : [],
        light: true,
        hatchReady,
        exportForbidden: true,
      },
      {
        headers: {
          ...ANTI_SCRAPE_HEADERS,
          "X-Viina-Light": "1",
        },
      },
    );
  }

  return Response.json(
    { ...data, exportForbidden: true },
    { headers: ANTI_SCRAPE_HEADERS },
  );
}
