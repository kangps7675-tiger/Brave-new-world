#!/usr/bin/env node
/**
 * PeeringDB IXP 수집 — `npm run peeringdb:fetch`
 *
 * 2026-07-31 감사 P0-3 대응.
 * 기존 `internet-exchanges.json` 은 서드파티 데모 저장소에서 온 합성 5건이었다
 * ("internet-exchanges site 0~4", 좌표는 세계 5개 도시 시청). 그런데 앱은
 * 그걸 **PeeringDB 로 표기**하고 있었다. 이 스크립트가 진짜 데이터로 교체한다.
 *
 * PeeringDB API: 공개·무료·키 불필요.
 *   https://www.peeringdb.com/api/ix        IXP 목록
 *   https://www.peeringdb.com/api/fac       시설(좌표 보유)
 *
 * ⚠️ ix 엔드포인트 자체에는 좌표가 없다. 여기서는 ix 와 fac 을 조인해 근사한다 —
 *    IXP 의 city/country 를 같은 도시의 시설 좌표에 매칭한다.
 *    정확한 시설 단위 좌표가 필요하면 fac 을 직접 레이어로 쓸 것.
 *    출력 meta 에 coordPrecision:"city" 를 남겨 이 근사를 숨기지 않는다.
 *
 * License: PeeringDB 데이터는 CC-BY-4.0. 표기 의무 있음.
 */
const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "public", "data");
const UA = "BraveNewWorld/0.2 (Brave New World geopolitics map; kangps7675@gmail.com)";
const BASE = "https://www.peeringdb.com/api";

/** 성능 캡 — 레이어 캡 정책과 같은 정신. */
const CAPS = { lite: 250, full: 900 };

async function get(pathname) {
  const res = await fetch(`${BASE}${pathname}`, {
    headers: { Accept: "application/json", "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`PeeringDB ${pathname} → HTTP ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

function keyOf(city, country) {
  return `${String(city ?? "").trim().toLowerCase()}|${String(country ?? "").trim().toUpperCase()}`;
}

async function main() {
  console.log("PeeringDB 수집 시작 (키 불필요, 공개 API)");

  const [ixs, facs] = await Promise.all([get("/ix"), get("/fac")]);
  console.log(`   /ix: ${ixs.length}건 · /fac: ${facs.length}건`);

  // 도시+국가 → 대표 좌표 (시설 중 좌표가 있는 첫 항목)
  const cityCoord = new Map();
  for (const f of facs) {
    const lat = Number(f.latitude);
    const lng = Number(f.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat === 0 && lng === 0) continue;
    const k = keyOf(f.city, f.country);
    if (!cityCoord.has(k)) cityCoord.set(k, { lat, lng });
  }

  const points = [];
  let unmatched = 0;
  for (const ix of ixs) {
    const coord = cityCoord.get(keyOf(ix.city, ix.country));
    if (!coord) {
      unmatched += 1;
      continue;
    }
    points.push({
      id: `peeringdb-ix-${ix.id}`,
      kind: "internet-exchange",
      // 실제 IXP 이름 — "site 0" 같은 플레이스홀더가 아니다
      name: String(ix.name ?? `IX ${ix.id}`),
      lat: Number(coord.lat.toFixed(4)),
      lng: Number(coord.lng.toFixed(4)),
      tier: (ix.net_count ?? 0) >= 100 ? 1 : 2,
      meta: {
        source: "peeringdb",
        nameLong: ix.name_long ?? null,
        city: ix.city ?? null,
        country: ix.country ?? null,
        netCount: ix.net_count ?? null,
        // 좌표는 IXP 자체가 아니라 같은 도시의 시설에서 왔다 — 정직하게 밝힌다
        coordSource: "peeringdb-facility-city-match",
        coordPrecision: "city",
      },
      _rank: -(ix.net_count ?? 0),
    });
  }

  points.sort((a, b) => a._rank - b._rank || a.name.localeCompare(b.name));
  console.log(`   좌표 매칭 ${points.length} · 미매칭 ${unmatched}`);

  if (points.length < 100) {
    throw new Error(
      `IXP ${points.length}건뿐이다 — API 응답이 이상하다. 덮어쓰지 않고 중단한다.`,
    );
  }

  for (const profile of ["lite", "full"]) {
    const dir = path.join(OUT_DIR, profile);
    if (!fs.existsSync(dir)) continue;
    const capped = points.slice(0, CAPS[profile]).map(({ _rank, ...rest }) => rest);
    const lines = capped.map((p) => {
      const compact = {
        i: p.id,
        k: p.kind,
        n: p.name,
        la: p.lat,
        ln: p.lng,
        s: p.tier,
        m: p.meta,
      };
      return `\t${JSON.stringify(compact)}`;
    });
    fs.writeFileSync(
      path.join(dir, "internet-exchanges.json"),
      `[\n${lines.join(",\n")}\n]\n`,
    );
    console.log(`   ✓ ${profile}: ${capped.length}건`);
  }

  console.log("\n다음 단계:");
  console.log("  1) src/data/sourceCatalog.ts 의 internet-exchanges 를");
  console.log('     status:"blocked" → "shipped", ingest:"synthetic-demo" → "static-build",');
  console.log('     attribution 을 "PeeringDB (CC BY 4.0)" 으로 되돌린다');
  console.log("  2) node scripts/compress-data-gzip.js all");
  console.log("  3) npm run verify:data");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
