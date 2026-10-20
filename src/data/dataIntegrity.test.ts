/**
 * 데이터 무결성 회귀 테스트 — 2026-07-31 감사 대응.
 *
 * 이 프로젝트의 테스트 33개는 전부 `src/lib` 순수 로직이었고,
 * **`public/data/*.json` 을 한 줄도 검사하지 않았다.** 그 공백으로 세 가지가 뚫렸다.
 *
 *   P0-1  GEM 철강·시멘트·철광석·화학 2,000건이 전부 널섬(0,0)
 *   P0-2  낡은/빈 .json.gz 가 살아있는 .json 을 가려 파이프라인 3종이 [] 로 서빙
 *   P0-3  "internet-exchanges site 0" 같은 합성 데모가 PeeringDB 이름으로 shipped
 *
 * 셋 다 **조용한** 실패였다. 예외도 안 나고 빈 지도만 나온다.
 * 사람의 주의력이 아니라 CI 가 잡아야 한다.
 *
 * CLI 판(빌드 게이트)은 `scripts/verify-data-integrity.js` — `npm run verify:data`.
 * 여기는 vitest 로 같은 불변식을 건다.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");
const PROFILES = ["lite", "full"] as const;

/** 널섬 허용 비율 — 0,0 이 진짜 좌표인 데이터셋은 이 프로젝트에 없다. */
const NULL_ISLAND_MAX_RATIO = 0.01;
/** 빈 gzip(`[]`)은 약 23바이트. 원본이 이보다 크면 압축 실패로 본다. */
const MIN_MEANINGFUL_JSON = 10_000;
const MAX_EMPTY_GZ = 100;

/** 의도적으로 비어 있는 파일 — 추가할 때 반드시 사유를 적을 것. */
const EMPTY_ALLOWED = new Map<string, string>([
  ["gdelt-events.json", "빌드타임 스냅샷 — 런타임은 /api/gdelt"],
  ["app-data.json", "청크 인덱스 — 실데이터는 countries/disputes/places"],
  ["sigint-military-bases.json", "합성 데모였음 — 비움 처리 (P0-3)"],
  ["gem-steel.json", "GEM 좌표 파서 실패로 전량 (0,0) — rebuild 전 비움"],
  ["gem-cement.json", "GEM 좌표 파서 실패로 전량 (0,0) — rebuild 전 비움"],
  ["gem-iron-ore.json", "GEM 좌표 파서 실패로 전량 (0,0) — rebuild 전 비움"],
  ["gem-chemicals.json", "GEM 좌표 파서 실패로 전량 (0,0) — rebuild 전 비움"],
  ["internet-exchanges.json", "합성 데모 이름 — PeeringDB fetch 전 비움"],
]);

type Point = { la?: unknown; ln?: unknown; n?: unknown };

function dataDir(profile: string) {
  return path.join(ROOT, "public", "data", profile);
}

function listJson(profile: string): string[] {
  const dir = dataDir(profile);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".json"));
}

function readJson(profile: string, file: string): unknown {
  return JSON.parse(readFileSync(path.join(dataDir(profile), file), "utf8"));
}

function points(data: unknown): Point[] {
  if (!Array.isArray(data)) return [];
  return data.filter(
    (x): x is Point => !!x && typeof x === "object" && typeof (x as Point).la === "number",
  );
}

function countRecords(data: unknown): number {
  if (Array.isArray(data)) return data.length;
  if (!data || typeof data !== "object") return 0;
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.features)) return obj.features.length;
  const lists = Object.values(obj).filter(Array.isArray) as unknown[][];
  if (lists.length) return lists.reduce((sum, l) => sum + l.length, 0);
  return Object.keys(obj).length ? 1 : 0;
}

/**
 * 합성 플레이스홀더 탐지.
 *
 * 단순히 /site \d+/ 로 잡으면 "Ellsworth AFB Site 2"(실재하는 미니트맨 발사대)가
 * 걸린다. 데모 데이터의 특징은 **레코드 이름이 자기 파일명을 반복**한다는 것:
 *   internet-exchanges.json → "internet-exchanges site 0"
 *   conflict-zones.json     → "conflict-zone-0"
 */
export function isPlaceholderName(name: unknown, fileSlug: string): boolean {
  const n = String(name ?? "").trim().toLowerCase();
  if (!n) return false;
  const slug = fileSlug.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!slug) return false;
  const singular = slug.replace(/s$/, "");
  const head = slug === singular ? slug : `(?:${slug}|${singular})`;
  return new RegExp(`^${head}(?:[\\s-]+site)?[\\s-]+\\d+$`).test(n);
}

const cases = PROFILES.flatMap((p) => listJson(p).map((f) => [p, f] as const));

describe("data integrity — public/data", () => {
  it("검사 대상 파일이 존재한다", () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  it.each(cases)("%s/%s — 널섬(0,0) 좌표가 없다", (profile, file) => {
    const pts = points(readJson(profile, file));
    if (!pts.length) return;
    const nullIsland = pts.filter((p) => p.la === 0 && p.ln === 0);
    const ratio = nullIsland.length / pts.length;
    expect(
      ratio,
      `${nullIsland.length}/${pts.length} 가 (0,0). 좌표 파서가 깨졌을 수 있다. ` +
        `예: "${String(nullIsland[0]?.n)}"`,
    ).toBeLessThanOrEqual(NULL_ISLAND_MAX_RATIO);
  });

  it.each(cases)("%s/%s — 좌표가 유효 범위 안이다", (profile, file) => {
    const pts = points(readJson(profile, file));
    const bad = pts.filter((p) => {
      const la = p.la as number;
      const ln = p.ln;
      return (
        !Number.isFinite(la) ||
        la < -90 ||
        la > 90 ||
        typeof ln !== "number" ||
        !Number.isFinite(ln) ||
        ln < -180 ||
        ln > 180
      );
    });
    expect(bad.length, `범위 이탈 예: ${JSON.stringify(bad[0])}`).toBe(0);
  });

  it.each(cases)("%s/%s — 합성 플레이스홀더 작명이 없다", (profile, file) => {
    if (EMPTY_ALLOWED.has(file)) return;
    const slug = file.replace(/\.json$/, "").replace(/^sigint-/, "");
    const pts = points(readJson(profile, file));
    const fake = pts.filter((p) => isPlaceholderName(p.n, slug));
    expect(
      fake.length,
      `합성 데모 데이터로 보인다. 예: "${String(fake[0]?.n)}" — ` +
        `sourceCatalog 에서 status:"blocked" 로 내리고 실제 소스로 교체할 것`,
    ).toBe(0);
  });

  it.each(cases)("%s/%s — 레코드가 비어 있지 않다", (profile, file) => {
    if (EMPTY_ALLOWED.has(file)) return;
    expect(
      countRecords(readJson(profile, file)),
      `레코드 0건. 의도한 것이면 EMPTY_ALLOWED 에 사유와 함께 추가할 것`,
    ).toBeGreaterThan(0);
  });
});

describe("data integrity — gzip sidecar", () => {
  const gzCases = PROFILES.flatMap((p) => {
    const dir = dataDir(p);
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => f.endsWith(".json.gz"))
      .map((f) => [p, f] as const);
  });

  it.each(gzCases)("%s/%s — 빈 gzip 이 원본을 가리지 않는다", (profile, gz) => {
    const dir = dataDir(profile);
    const jsonPath = path.join(dir, gz.slice(0, -3));
    if (!existsSync(jsonPath)) return;
    const gzSize = statSync(path.join(dir, gz)).size;
    const jsonSize = statSync(jsonPath).size;
    if (jsonSize <= MIN_MEANINGFUL_JSON) return;
    expect(
      gzSize,
      `${(jsonSize / 1024).toFixed(0)}KB 원본에 ${gzSize}B gzip. ` +
        `fetchJsonPreferGzip 이 gz 를 우선하므로 런타임에 [] 가 나간다. ` +
        `→ node scripts/compress-data-gzip.js all`,
    ).toBeGreaterThan(MAX_EMPTY_GZ);
  });

  it.each(gzCases)("%s/%s — .json 보다 낡지 않았다", (profile, gz) => {
    const dir = dataDir(profile);
    const jsonPath = path.join(dir, gz.slice(0, -3));
    if (!existsSync(jsonPath)) return;
    const gzTime = statSync(path.join(dir, gz)).mtimeMs;
    const jsonTime = statSync(jsonPath).mtimeMs;
    const staleDays = (jsonTime - gzTime) / 86_400_000;
    expect(
      staleDays,
      `gz 가 ${staleDays.toFixed(1)}일 낡았다. 런타임은 이 낡은 gz 를 쓴다. ` +
        `→ node scripts/compress-data-gzip.js all`,
    ).toBeLessThanOrEqual(0.01);
  });

  it.each(gzCases)("%s/%s — 압축본이 원본과 같은 레코드 수를 갖는다", (profile, gz) => {
    const dir = dataDir(profile);
    const jsonPath = path.join(dir, gz.slice(0, -3));
    if (!existsSync(jsonPath)) return;
    const inflated = JSON.parse(gunzipSync(readFileSync(path.join(dir, gz))).toString("utf8"));
    const original = JSON.parse(readFileSync(jsonPath, "utf8"));
    expect(countRecords(inflated)).toBe(countRecords(original));
  });
});

describe("isPlaceholderName", () => {
  it.each([
    ["internet-exchanges site 0", "internet-exchanges", true],
    ["military-bases site 3", "military-bases", true],
    ["conflict-zone-0", "conflict-zones", true],
    ["Ellsworth AFB Site 2", "military-bases", false],
    ["Comanche Peak", "nuclear-sites", false],
    ["Vale Serra Norte Complex Mine", "gem-iron-ore", false],
  ] as const)("%s → %s", (name, slug, expected) => {
    expect(isPlaceholderName(name, slug)).toBe(expected);
  });
});
