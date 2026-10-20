import fs from "fs";
import path from "path";
import type { UkraineControlData, ViinaRenderMeta } from "@/data/geoTypes";
import { getServerDataProfile } from "@/lib/serverEnv";
import type { DataProfile } from "@/lib/runtimeConfig.types";
export type { ViinaRenderMeta } from "@/data/geoTypes";

const EMPTY: UkraineControlData = {
  generatedAt: "",
  source: "VIINA",
  controlDate: "",
  vcontrolVersion: null,
  ruCellCount: 0,
  features: [],
  overviewFeatures: [],
};

function renderPath(profile: DataProfile) {
  return path.join(process.cwd(), "private", "viina-render", profile, "ukraine-control.json");
}

/** Server-only VIINA render cache (private/viina-render, not public API). */
export function loadViinaRenderData(profile?: DataProfile): UkraineControlData | null {
  const resolved = profile ?? getServerDataProfile();
  const filePath = renderPath(resolved);
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as UkraineControlData;
    return {
      ...EMPTY,
      ...raw,
      features: Array.isArray(raw.features) ? raw.features : [],
      overviewFeatures: Array.isArray(raw.overviewFeatures) ? raw.overviewFeatures : [],
      settlements: Array.isArray(raw.settlements) ? raw.settlements : undefined,
    };
  } catch {
    return null;
  }
}

export function loadViinaRenderMeta(profile?: DataProfile): ViinaRenderMeta {
  const data = loadViinaRenderData(profile);
  if (!data?.features?.length) {
    return { available: false, controlDate: null, ruCellCount: 0, featureCount: 0 };
  }
  return {
    available: true,
    controlDate: data.controlDate || null,
    ruCellCount: data.ruCellCount ?? 0,
    featureCount: data.features.length,
  };
}
