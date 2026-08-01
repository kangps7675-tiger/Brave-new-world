#!/usr/bin/env node
/**
 * 상업 라이선스 게이트 — `npm run verify:commercial`
 *
 * 유료화를 켠 상태(`COMMERCIAL_TIER_ENABLED=true`)에서 빌드하면,
 * 상업 이용이 금지·미확인인 레이어가 유료 패키지에 섞였는지 검사한다.
 *
 * ── 왜 빌드에서 막나 ──────────────────────────────────────────────
 *
 * 레이어가 60개가 넘고 앞으로 더 늘어난다. 새 레이어를 추가할 때
 * "이거 상업 이용 되나?"를 매번 기억할 수 없다.
 * 그리고 이건 **한 개만 틀려도 계약 위반**이다:
 *
 *   adsb.fi  "for personal, non-commercial use only. You may not license,
 *             sell, rent, or lease any part of the data or the service."
 *   ACLED    "Commercial entities may not access or use the Content and/or
 *             Platforms without first obtaining a corporate license."
 *
 * 데이터 무결성 게이트와 같은 발상이다 — 사람의 주의력이 아니라 CI 가 잡는다.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CATALOG = path.join(ROOT, "src", "data", "sourceCatalog.ts");
const WARN_ONLY = process.argv.includes("--warn");

/**
 * 유료 티어를 실제로 켰는가.
 * 켜지 않았으면 경고만 내고 통과시킨다 (아직 무료 서비스이므로).
 */
const COMMERCIAL_ON =
  process.env.COMMERCIAL_TIER_ENABLED === "true" ||
  process.env.NEXT_PUBLIC_COMMERCIAL_TIER_ENABLED === "true";

function parseCatalog() {
  /*
   * ⚠️ 줄바꿈을 LF 로 정규화한 뒤에 자른다 — **이 줄을 빼지 말 것.**
   *
   * 이전 구현은 `src.split(/\n  \{\n/)` 로 원본을 그대로 잘랐다.
   * 저장소에 `.gitattributes` 가 없어 Windows 체크아웃에서는 파일이 CRLF 로
   * 변환되는데, 그러면 `\r\n  {\r\n` 이 되어 이 패턴이 **한 번도 매치되지 않는다.**
   * 결과적으로 layers=[] → "카탈로그를 파싱하지 못했다" 로 즉시 exit(1),
   * 즉 게이트가 검사를 수행한 적이 없는 상태로 빌드만 막고 있었다.
   *
   * 게이트가 "통과"를 찍으려면 실제로 파싱에 성공해야 한다.
   *
   * @see docs/copyright-audit-2026-08-01.md — O-1
   */
  const src = fs.readFileSync(CATALOG, "utf8").replace(/\r\n/g, "\n");
  // 최상위 배열 요소 단위로 자른다
  const chunks = src.split(/\n  \{\n/).slice(1);
  const out = [];
  for (const c of chunks) {
    const layerId = /layerId: "([a-z0-9-]+)"/.exec(c)?.[1];
    if (!layerId) continue;
    out.push({
      layerId,
      status: /status: "(\w+)"/.exec(c)?.[1] ?? "?",
      commercialUse: /commercialUse: "([a-z-]+)"/.exec(c)?.[1] ?? null,
      hasNote: /commercialNote:/.test(c),
      attribution: /attribution:\s*\n?\s*"([^"]*)"/.exec(c)?.[1] ?? "",
    });
  }
  return out;
}

function main() {
  const layers = parseCatalog();
  if (layers.length === 0) {
    console.error("[verify:commercial] 카탈로그를 파싱하지 못했다 — 형식이 바뀌었는지 확인할 것");
    process.exit(1);
  }

  const problems = [];
  const info = [];

  // ① 모든 레이어에 commercialUse 가 있어야 한다
  for (const l of layers) {
    if (!l.commercialUse) {
      problems.push(
        `${l.layerId} — commercialUse 미지정. 새 레이어는 반드시 상업 이용 가부를 판단해서 적을 것. ` +
          `모르면 "unknown" 으로 두면 된다 (유료 노출만 막힌다).`,
      );
    }
  }

  // ② allowed 가 아니면 사유를 남겨야 한다
  for (const l of layers) {
    if (l.commercialUse && l.commercialUse !== "allowed" && !l.hasNote) {
      problems.push(`${l.layerId} — commercialUse="${l.commercialUse}" 인데 commercialNote 가 없다.`);
    }
  }

  const buckets = { allowed: [], "license-required": [], prohibited: [], unknown: [] };
  for (const l of layers) {
    if (l.commercialUse && buckets[l.commercialUse]) buckets[l.commercialUse].push(l);
  }

  const shippedUnsafe = layers.filter(
    (l) => l.status === "shipped" && l.commercialUse && l.commercialUse !== "allowed",
  );

  console.log(`[verify:commercial] 레이어 ${layers.length}개`);
  console.log(
    `   상업 가능 ${buckets.allowed.length} · 라이선스 필요 ${buckets["license-required"].length} · ` +
      `금지 ${buckets.prohibited.length} · 미확인 ${buckets.unknown.length}`,
  );

  // ③ 유료화를 켠 상태라면, shipped 이면서 상업 불가인 레이어는 **빌드 실패**
  if (COMMERCIAL_ON) {
    for (const l of shippedUnsafe) {
      problems.push(
        `${l.layerId} — 유료 티어가 켜져 있는데 commercialUse="${l.commercialUse}". ` +
          `유료 패키지에서 제외하거나, 라이선스를 취득하거나, 소스를 교체할 것.`,
      );
    }
  } else if (shippedUnsafe.length) {
    info.push(
      `유료화(COMMERCIAL_TIER_ENABLED)를 켜면 아래 ${shippedUnsafe.length}개가 빌드를 막는다:`,
    );
    for (const l of shippedUnsafe) {
      info.push(`   · ${l.layerId}  [${l.commercialUse}]`);
    }
  }

  for (const line of info) console.log(`   ${line}`);

  if (!problems.length) {
    console.log(
      COMMERCIAL_ON
        ? "[verify:commercial] ✅ 유료 티어 통과"
        : "[verify:commercial] ✅ 통과 (무료 운영 중 — 유료화 시 위 목록 처리 필요)",
    );
    return;
  }

  console.error(`\n[verify:commercial] ❌ 문제 ${problems.length}건\n`);
  for (const p of problems) console.error(`  • ${p}`);
  console.error("");
  if (!WARN_ONLY) process.exit(1);
}

main();
