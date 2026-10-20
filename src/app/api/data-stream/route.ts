import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { cloudDataPublicUrl } from "@/lib/cloudStaticJson";
import { getDataCdnBase, getServerDataProfile } from "@/lib/serverEnv";
import { streamPublicJsonFile } from "@/lib/streamPublicJson";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Whitelist — path traversal blocked via basename */
const ALLOWED_FILES = new Set([
  "app-data.json",
  "countries.json",
  "disputes.json",
  "places.json",
  "neptun-seed.json",
]);

function resolveDataFile(profile: "lite" | "full", fileName: string): string | null {
  const safeName = path.basename(fileName);
  if (!ALLOWED_FILES.has(safeName)) return null;

  const ROOT = process.cwd();
  const candidates = [
    path.join(ROOT, "public", "data", profile, safeName),
    path.join(ROOT, "public", "data", safeName),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * 부트용 JSON 스트림.
 * DATA_CDN 이 있으면 클라우드(R2)로 리다이렉트 — 앱 디스크에 두지 않음.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileParam = searchParams.get("file");
  if (!fileParam) {
    return NextResponse.json({ error: "Missing query: file" }, { status: 400 });
  }

  const profileParam = searchParams.get("profile");
  const profile: "lite" | "full" =
    profileParam === "full" || profileParam === "lite" ? profileParam : getServerDataProfile();

  const safeName = path.basename(fileParam);
  if (!ALLOWED_FILES.has(safeName)) {
    return NextResponse.json({ error: "Seed file not found" }, { status: 404 });
  }

  const cdn = getDataCdnBase();
  if (cdn) {
    const target = cloudDataPublicUrl(safeName, profile);
    if (target) {
      return NextResponse.redirect(target, {
        status: 307,
        headers: {
          "Cache-Control": "public, max-age=300",
          "X-Data-Source": "cdn-redirect",
        },
      });
    }
  }

  const filePath = resolveDataFile(profile, fileParam);
  if (!filePath) {
    return NextResponse.json(
      {
        error: "Seed file not found",
        hint: cdn
          ? "CDN miss — check R2 upload"
          : "Set NEXT_PUBLIC_DATA_CDN or place file under public/data",
      },
      { status: 404 },
    );
  }

  const streamed = streamPublicJsonFile(filePath, {
    "X-Data-Profile": profile,
    "X-Data-File": path.basename(filePath),
    "X-Data-Source": "local-fs",
  });
  if (!streamed) {
    return NextResponse.json({ error: "Seed file not found" }, { status: 404 });
  }
  return streamed;
}
