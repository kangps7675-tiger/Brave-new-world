import { NextResponse } from "next/server";
import type { UsCarrier } from "@/data/usCarriers";
import { US_CARRIERS_SEED } from "@/data/usCarriers";
import { loadCloudStaticJson } from "@/lib/cloudStaticJson";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CARRIERS_CDN = publicCacheHeaders(CDN_CACHE.carriers);

type CarrierPayload = {
  carriers?: UsCarrier[];
  updatedAt?: string;
  source?: string;
  generatedAt?: string;
};

async function loadCarrierFile(): Promise<{
  carriers: UsCarrier[];
  updatedAt: string;
  source: string;
}> {
  const payload = await loadCloudStaticJson<CarrierPayload>("us-carriers.json");
  if (payload) {
    return {
      carriers: payload.carriers || US_CARRIERS_SEED,
      updatedAt: payload.updatedAt || payload.generatedAt || new Date().toISOString(),
      source: payload.source || "cloud JSON",
    };
  }
  return {
    carriers: US_CARRIERS_SEED,
    updatedAt: "2026-01-21",
    source: "built-in seed",
  };
}

/** stub과 무관하게 정적 항모 데이터 제공 (외부 API 없음) */
export async function GET() {
  try {
    const { carriers, updatedAt, source } = await loadCarrierFile();
    return NextResponse.json(
      {
        receivedAt: new Date().toISOString(),
        updatedAt,
        source,
        count: carriers.length,
        carriers,
      },
      { headers: CARRIERS_CDN },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "항모 데이터 로드 실패",
        carriers: US_CARRIERS_SEED,
        count: US_CARRIERS_SEED.length,
      },
      { status: 500, headers: CARRIERS_CDN },
    );
  }
}
