import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { nodeStreamToWebStream } from "@/lib/nodeWebStream";

const CHUNK_BYTES = 64 * 1024;

export function streamPublicJsonFile(
  filePath: string,
  extraHeaders?: Record<string, string>,
): NextResponse | null {
  if (!fs.existsSync(filePath)) return null;

  let size: number | undefined;
  try {
    size = fs.statSync(filePath).size;
  } catch {
    // optional
  }

  const nodeStream = fs.createReadStream(filePath, { highWaterMark: CHUNK_BYTES });
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=60",
    ...extraHeaders,
  };
  if (size != null) headers["Content-Length"] = String(size);

  return new NextResponse(nodeStreamToWebStream(nodeStream), { headers });
}

export function resolveNeptunSeedPath(profile: "lite" | "full"): string | null {
  const ROOT = process.cwd();
  const candidates = [
    path.join(ROOT, "public", "data", profile, "neptun-seed.json"),
    path.join(ROOT, "public", "data", "neptun-seed.json"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}
