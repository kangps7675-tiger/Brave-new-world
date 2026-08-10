import fs from "fs";
import path from "path";
import type { DisputeHatchCachePayload, DisputeHatchLod } from "@/lib/disputeHatchPrecompute";
import { getServerDataProfile } from "@/lib/serverEnv";
import type { DataProfile } from "@/lib/runtimeConfig.types";

function cacheDir(profile: DataProfile) {
  return path.join(process.cwd(), "private", "overlay-cache", profile);
}

function cacheFile(profile: DataProfile, lod: DisputeHatchLod) {
  return path.join(cacheDir(profile), `dispute-hatch-paths-${lod}.json`);
}

export function loadDisputeHatchCache(
  lod: DisputeHatchLod,
  profile?: DataProfile,
): DisputeHatchCachePayload | null {
  const resolved = profile ?? getServerDataProfile();
  const filePath = cacheFile(resolved, lod);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as DisputeHatchCachePayload;
    if (!Array.isArray(raw.paths) || raw.paths.length === 0) return null;
    return raw;
  } catch {
    return null;
  }
}

/**
 * 디스크 스냅샷 저장. Vercel 등 읽기전용 FS에서는 null을 반환하고 throw하지 않는다.
 */
export function saveDisputeHatchCache(
  payload: DisputeHatchCachePayload,
  profile?: DataProfile,
): string | null {
  const resolved = profile ?? getServerDataProfile();
  const dir = cacheDir(resolved);
  const filePath = cacheFile(resolved, payload.lodTier);
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(payload));
    return filePath;
  } catch (error) {
    console.warn(
      "[dispute-hatch] file cache write skipped:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
