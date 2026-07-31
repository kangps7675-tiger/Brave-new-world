import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import { geeApi, initializeGEE, type GeeFeature } from "@/lib/gee";
import { apiStubResponse } from "@/lib/apiStub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const stub = apiStubResponse("gee-labels", request);
  if (stub) return stub;

  try {
    await initializeGEE();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") || 500), 1),
      2000,
    );

    // 1. FAO GAUL Level 1 (주/도 단위 행정구역) 데이터셋 로드
    const regions = geeApi.FeatureCollection("FAO/GAUL/2015/level1");

    // 2. 무거운 폴리곤 대신 라벨용 중심점(Centroid)만 계산
    const regionPoints = regions
      .map((feature: GeeFeature) => {
        return geeApi.Feature(feature.centroid(), {
          name: feature.get("ADM1_NAME"),
          country: feature.get("ADM0_NAME"),
        });
      })
      .limit(limit);

    // 3. GEE 서버에서 연산 결과를 JSON으로 평가
    const data = await new Promise<{
      features?: Array<{
        geometry?: { coordinates?: number[] };
        properties?: { name?: string; country?: string };
      }>;
    }>((resolve, reject) => {
      regionPoints.evaluate(
        (result: unknown, error: Error | null) => {
          if (error) reject(error);
          else resolve(result as { features?: Array<{
            geometry?: { coordinates?: number[] };
            properties?: { name?: string; country?: string };
          }> });
        },
      );
    });

    // 4. react-globe.gl labelsData 포맷
    const formattedLabels = (data.features ?? [])
      .map((f) => {
        const coords = f.geometry?.coordinates;
        if (!coords || coords.length < 2) return null;
        const [lng, lat] = coords;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return {
          lat,
          lng,
          name: f.properties?.name ?? "",
          country: f.properties?.country ?? "",
          size: 1.5,
        };
      })
      .filter((label): label is NonNullable<typeof label> => Boolean(label));

    return NextResponse.json({ labels: formattedLabels });
  } catch (error) {
    return NextResponse.json(
      {
        error: publicErrorMessage(error, "GEE 라벨 조회 실패"),
        labels: [],
      },
      { status: 500 },
    );
  }
}
