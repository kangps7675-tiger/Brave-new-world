import { rejectViinaPublicDataApi } from "@/lib/licensing/viinaPolicy";

/** VIINA 우크라이나 점령 레이어 — 공개 API 금지 (렌더링 전용) */
export async function GET() {
  return rejectViinaPublicDataApi("public-api-forbidden");
}

export async function POST() {
  return rejectViinaPublicDataApi("public-api-forbidden");
}
