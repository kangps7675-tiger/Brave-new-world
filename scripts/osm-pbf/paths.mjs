/**
 * Canonical locations for Geofabrik OSM .pbf files.
 *
 * Remote:  R2 bucket conflict-view-data / sources/osm-pbf/{filename}
 * Local:   OSM_PBF_DIR → data/sources/osm-pbf → Downloads (first hit wins)
 */
import fs from "node:fs";
import path from "node:path";

export const R2_BUCKET = process.env.R2_DATA_BUCKET || "conflict-view-data";
export const R2_PREFIX = process.env.R2_PBF_PREFIX || "sources/osm-pbf";

export function defaultDownloadsDir() {
  return process.env.OSM_PBF_DOWNLOADS || "C:/Users/kangp/Downloads";
}

export function localSearchDirs(root) {
  const dirs = [
    process.env.OSM_PBF_DIR,
    path.join(root, "data", "sources", "osm-pbf"),
    defaultDownloadsDir(),
  ];
  return [...new Set(dirs.filter(Boolean).map((d) => path.resolve(d)))];
}

export function r2KeyForFilename(filename) {
  return `${R2_PREFIX}/${path.basename(filename)}`;
}

export function resolvePbfFile(root, filename) {
  const base = path.basename(filename);
  for (const dir of localSearchDirs(root)) {
    const candidate = path.join(dir, base);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export function discoverLocalPbfs(root) {
  const seen = new Map();
  for (const dir of localSearchDirs(root)) {
    if (!fs.existsSync(dir)) continue;
    let names = [];
    try {
      names = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      if (!name.endsWith(".osm.pbf") && !name.endsWith(".pbf")) continue;
      if (seen.has(name)) continue;
      const file = path.join(dir, name);
      try {
        const st = fs.statSync(file);
        if (!st.isFile()) continue;
        seen.set(name, { name, file, bytes: st.size, mtimeMs: st.mtimeMs, dir });
      } catch {
        /* skip */
      }
    }
  }
  return [...seen.values()].sort((a, b) => a.bytes - b.bytes);
}
