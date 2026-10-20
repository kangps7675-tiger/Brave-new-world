#!/usr/bin/env node
/**
 * One-shot: stamp dataLicense on NEWS_LAYER_SOURCE_CATALOG entries that lack it.
 * ODbL / OSM → ODbL-1.0 (상속분); 자체 제작 → proprietary;
 * contract → upstream; NASA/PD → public-domain; etc.
 * ODbL은 기본값이 아니다 — 자체 제작 판단·기록물에 ODbL을 찍지 말 것.
 */
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "src", "data", "sourceCatalog.ts");
let src = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const marker = "export const NEWS_LAYER_SOURCE_CATALOG";
const idx = src.indexOf(marker);
if (idx < 0) throw new Error("catalog marker missing");
const head = src.slice(0, idx);
const body = src.slice(idx);
const chunks = body.split(/\n  \{\n/);
let changed = 0;
const out = [chunks[0]];

for (let i = 1; i < chunks.length; i++) {
  let c = chunks[i];
  if (/dataLicense:/.test(c)) {
    out.push(c);
    continue;
  }
  const commercial = /commercialUse: "([a-z-]+)"/.exec(c)?.[1];
  const attr = /attribution:\s*\n?\s*"([^"]*)"/.exec(c)?.[1] || "";
  const note = /commercialNote:\s*\n?\s*"([^"]*)"/.exec(c)?.[1] || "";
  const blob = `${attr} ${note}`.toLowerCase();
  let lic = null;
  if (/odbl|openstreetmap|open database/.test(blob)) {
    // 원본이 ODbL — 상속 의무
    lic = "ODbL-1.0";
  } else if (
    /자체|우리 저작물|자체 제작|자체 파생|자체 큐레이션|자체 렌더/.test(
      `${note}${attr}`,
    )
  ) {
    // 직접 만든 판단·기록물 — 독점
    lic = "proprietary";
  } else if (
    commercial === "license-required" ||
    commercial === "prohibited"
  ) {
    lic = "upstream";
  } else if (/퍼블릭 도메인|public domain|nasa firms/.test(blob)) {
    lic = "public-domain";
  } else if (/cc by 4\.0|cc-by-4\.0|cc by/.test(blob)) {
    lic = "CC-BY-4.0";
  } else if (/\bcc0\b/.test(blob)) {
    lic = "CC0-1.0";
  }
  if (lic && commercial) {
    c = c.replace(
      /commercialUse: "([a-z-]+)"/,
      `dataLicense: "${lic}",\n    commercialUse: "$1"`,
    );
    changed++;
  }
  out.push(c);
}

fs.writeFileSync(file, head + out.join("\n  {\n"));
console.log(`stamped ${changed} entries`);
