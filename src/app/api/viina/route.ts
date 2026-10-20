import { rejectViinaPublicDataApi } from "@/lib/licensing/viinaPolicy";

/**
 * VIINA 데이터는 공개 API로 제공하지 않습니다 (렌더링 전용 정책).
 * @see docs/copyright-checklist.md
 */
export async function GET() {
  return rejectViinaPublicDataApi("public-api-forbidden");
}

export async function POST() {
  return rejectViinaPublicDataApi("public-api-forbidden");
}
