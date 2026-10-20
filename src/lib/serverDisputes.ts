import type { DisputeArea } from "@/data/geoTypes";
import { loadCloudStaticJson } from "@/lib/cloudStaticJson";
import { getServerDataProfile } from "@/lib/serverEnv";
import type { DataProfile } from "@/lib/runtimeConfig.types";

/** 서버에서 disputes.json / app-data 로드 (클라우드 우선) */
export async function loadServerDisputes(profile?: DataProfile): Promise<DisputeArea[]> {
  const resolved = profile ?? getServerDataProfile();
  const chunk = await loadCloudStaticJson<DisputeArea[]>("disputes.json", resolved);
  if (Array.isArray(chunk) && chunk.length > 0) return chunk;
  const appData = await loadCloudStaticJson<{ disputes?: DisputeArea[] }>(
    "app-data.json",
    resolved,
  );
  if (Array.isArray(appData?.disputes)) return appData.disputes;
  return [];
}
