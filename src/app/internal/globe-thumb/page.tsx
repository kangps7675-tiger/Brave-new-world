import { notFound } from "next/navigation";
import { crinkPlaceById } from "@/data/crinkPlaceGazetteer";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Playwright bake 전용 — MapLibre 없이 고정 카메라 플레이스홀더.
 * 실맵 캡처는 scripts/bake-globe-thumbs.mjs 가 이 페이지(또는 메인 맵)를 연다.
 * 토큰 없으면 404.
 */
export default async function GlobeThumbPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const expected = process.env.GLOBE_THUMB_BAKE_TOKEN?.trim();
  if (!expected || token !== expected) notFound();

  const placeId = typeof params.placeId === "string" ? params.placeId : "";
  const place = placeId ? crinkPlaceById(placeId) : undefined;
  const lat =
    typeof params.lat === "string" ? Number(params.lat) : (place?.lat ?? 0);
  const lng =
    typeof params.lng === "string" ? Number(params.lng) : (place?.lng ?? 0);

  return (
    <main
      id="globe-thumb-root"
      data-place-id={placeId || "custom"}
      data-lat={lat}
      data-lng={lng}
      style={{
        margin: 0,
        width: 640,
        height: 360,
        background:
          "radial-gradient(circle at 40% 35%, #1e3a5f 0%, #0b1220 55%, #05080f 100%)",
        color: "#e2e8f0",
        fontFamily: "system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 50% 50%, transparent 42%, rgba(0,0,0,0.45) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "48%",
          width: 14,
          height: 14,
          marginLeft: -7,
          marginTop: -7,
          borderRadius: "50%",
          background: "#f87171",
          boxShadow: "0 0 0 8px rgba(248,113,113,0.25)",
        }}
      />
      <div style={{ position: "absolute", left: 20, bottom: 20 }}>
        <div style={{ fontSize: 12, letterSpacing: "0.18em", opacity: 0.55 }}>
          CONFLICTVIEW · GLOBE THUMB
        </div>
        <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>
          {place?.label ?? placeId ?? "Custom"}
        </div>
        <div style={{ fontSize: 13, opacity: 0.7, marginTop: 2 }}>
          {lat.toFixed(3)}°, {lng.toFixed(3)}°
        </div>
      </div>
    </main>
  );
}
