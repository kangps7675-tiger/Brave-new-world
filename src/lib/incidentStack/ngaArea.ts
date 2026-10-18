/** 경보 첫머리의 해역명: "GULF OF OMAN. OMAN. 1. ..." → "GULF OF OMAN · OMAN" */
export function ngaAreaLabel(description: string): string {
  const head = description.replace(/\s+/g, " ").trim();
  const parts: string[] = [];
  for (const m of head.matchAll(/([A-Z][A-Z .'\-]{2,40}?)\.(?=\s|$)/g)) {
    const s = m[1]!.trim();
    if (/^(?:DNC \d+|M\/V|F\/V|\d)/.test(s) || /\d/.test(s)) break;
    parts.push(s);
    if (parts.length >= 2) break;
  }
  return parts.join(" · ");
}
