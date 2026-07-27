/**
 * sanctions-entities 스냅샷 → ISO3별 엔티티 수.
 * 로컬 시드는 id 접미사 `sanc-xx`(ISO2) 기반.
 */

const ISO2_TO_ISO3: Record<string, string> = {
  ir: "IRN",
  kp: "PRK",
  ru: "RUS",
  by: "BLR",
  mm: "MMR",
  ve: "VEN",
  cu: "CUB",
  sy: "SYR",
  zw: "ZWE",
  sd: "SDN",
  so: "SOM",
  ye: "YEM",
  ly: "LBY",
  ht: "HTI",
  ml: "MLI",
};

function iso3FromSanctionsId(id: string): string | null {
  const m = /sanc-([a-z]{2})\b/i.exec(id);
  if (!m) return null;
  return ISO2_TO_ISO3[m[1].toLowerCase()] ?? null;
}

export function countSanctionsByIso3(
  points: Array<{ id?: string; i?: string }>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of points) {
    const id = p.id ?? p.i ?? "";
    const iso = iso3FromSanctionsId(id);
    if (!iso) continue;
    out[iso] = (out[iso] ?? 0) + 1;
  }
  return out;
}

export function sanctionsCountForIso(
  counts: Record<string, number>,
  iso3: string,
): number {
  return counts[iso3.trim().toUpperCase()] ?? 0;
}
