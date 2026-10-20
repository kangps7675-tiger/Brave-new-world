import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isForbiddenViinaApiPath } from "@/lib/licensing/viinaPolicy";

/**
 * Edge: VIINA 공개 export 경로 선차단.
 * 실제 렌더 게이트(쿠키·origin)는 Node 라우트에서 처리.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isForbiddenViinaApiPath(pathname)) {
    return NextResponse.json(
      {
        error: "VIINA data is not available via public API (rendering-only policy).",
        policy: "viina-rendering-only",
      },
      {
        status: 403,
        headers: {
          "Cache-Control": "no-store",
          "X-Viina-Policy": "rendering-only",
        },
      },
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/viina/:path*",
    "/api/layers/ukraine-control/:path*",
    "/api/layers/viina/:path*",
    "/api/export/viina/:path*",
    "/api/download/viina/:path*",
  ],
};
