/**
 * CRINK 가제트 placeId별 지구본 썸네일 베이크 → public/thumbs/globe 또는 R2.
 *
 * Usage:
 *   GLOBE_THUMB_BAKE_TOKEN=secret BASE_URL=http://localhost:3000 node scripts/bake-globe-thumbs.mjs
 *   (optional) R2 via wrangler after files land in public/thumbs/globe
 *
 * Workers 요청 경로에서 돌리지 말 것 — 로컬/CI 전용.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

/** Keep in sync with src/data/crinkPlaceGazetteer.ts bake targets */
const PLACES = [
  { id: "yongbyon", lat: 39.8, lng: 125.75 },
  { id: "punggye-ri", lat: 41.28, lng: 129.09 },
  { id: "sohae", lat: 39.66, lng: 124.71 },
  { id: "natanz", lat: 33.72, lng: 51.73 },
  { id: "fordow", lat: 34.88, lng: 50.99 },
  { id: "isfahan", lat: 32.65, lng: 51.67 },
  { id: "bushehr", lat: 28.83, lng: 50.89 },
  { id: "bakhmut", lat: 48.59, lng: 38.0 },
  { id: "avdiivka", lat: 48.14, lng: 37.74 },
  { id: "pokrovsk", lat: 48.28, lng: 37.18 },
  { id: "fiery_cross_reef", lat: 9.53, lng: 112.88 },
  { id: "subi_reef", lat: 10.88, lng: 114.07 },
  { id: "mischief_reef", lat: 9.921, lng: 115.506 },
  { id: "woody_island", lat: 16.83, lng: 112.33 },
  { id: "thitu_island", lat: 11.05, lng: 114.28 },
];

async function main() {
  const token = process.env.GLOBE_THUMB_BAKE_TOKEN?.trim();
  if (!token) {
    console.error("GLOBE_THUMB_BAKE_TOKEN required");
    process.exit(1);
  }
  const base = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
  const outDir = path.join(root, "public", "thumbs", "globe");
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });

  for (const place of PLACES) {
    const url = `${base}/internal/globe-thumb?token=${encodeURIComponent(token)}&placeId=${encodeURIComponent(place.id)}`;
    console.log("bake", place.id, url);
    const res = await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
    if (!res || !res.ok()) {
      console.warn("skip", place.id, res?.status());
      continue;
    }
    await page.waitForSelector("#globe-thumb-root", { timeout: 15_000 });
    const buf = await page.locator("#globe-thumb-root").screenshot({ type: "jpeg", quality: 82 });
    const out = path.join(outDir, `${place.id}.jpg`);
    await writeFile(out, buf);
    console.log("wrote", out);
  }

  await browser.close();
  console.log("done", PLACES.length, "places →", outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
