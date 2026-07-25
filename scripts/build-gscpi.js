/**
 * NY Fed GSCPI xlsx → public/data/gscpi.json
 *
 * Usage:
 *   npm run gscpi:build
 *   node scripts/build-gscpi.js
 *
 * 월간 지표라 수동 또는 월 1회 cron이면 충분. 런타임에서는 JSON만 읽음.
 */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "public", "data", "gscpi.json");
const SOURCE_URL =
  process.env.GSCPI_XLSX_URL ||
  "https://www.newyorkfed.org/medialibrary/research/interactives/gscpi/downloads/gscpi_data.xlsx";

/** 헤더 셀 → Date / GSCPI 열 인덱스 (방어적) */
function findColumns(headerRow) {
  let dateCol = -1;
  let valueCol = -1;
  for (let i = 0; i < headerRow.length; i++) {
    const raw = headerRow[i];
    if (raw == null || raw === "") continue;
    const h = String(raw).trim().toLowerCase();
    if (dateCol < 0 && (h === "date" || h.includes("date") || h === "month" || h === "period")) {
      dateCol = i;
      continue;
    }
    if (
      valueCol < 0 &&
      (h === "gscpi" ||
        h.includes("gscpi") ||
        h === "index" ||
        h.includes("supply chain pressure"))
    ) {
      valueCol = i;
    }
  }
  // 흔한 레이아웃: col0=Date, col1=GSCPI
  if (dateCol < 0) dateCol = 0;
  if (valueCol < 0) valueCol = dateCol === 0 ? 1 : 0;
  return { dateCol, valueCol };
}

/** Excel serial / Date / string → YYYY-MM-01 */
function toMonthDate(cell) {
  if (cell == null || cell === "") return null;

  if (cell instanceof Date && !Number.isNaN(cell.getTime())) {
    const y = cell.getUTCFullYear();
    const m = String(cell.getUTCMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
  }

  if (typeof cell === "number" && Number.isFinite(cell)) {
    // Excel serial date
    const parsed = XLSX.SSF.parse_date_code(cell);
    if (parsed && parsed.y && parsed.m) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-01`;
    }
  }

  const s = String(cell).trim();
  // 2024-03 / 2024-03-01 / 2024/03/01
  let m = s.match(/^(\d{4})[-/](\d{1,2})(?:[-/]\d{1,2})?/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, "0")}-01`;
  }
  // 31-Jan-1998 / 01-Mar-2024 (NY Fed format)
  m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (m) {
    const d = new Date(`${m[2]} ${m[1]}, ${m[3]} UTC`);
    if (!Number.isNaN(d.getTime())) {
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
    }
  }
  // Mar-2024 / March 2024
  m = s.match(/^([A-Za-z]{3,9})\s*[-/]?\s*(\d{4})$/);
  if (m) {
    const d = new Date(`${m[1]} 1, ${m[2]} UTC`);
    if (!Number.isNaN(d.getTime())) {
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
    }
  }
  // last resort — Date.parse
  const fallback = new Date(s);
  if (!Number.isNaN(fallback.getTime())) {
    return `${fallback.getUTCFullYear()}-${String(fallback.getUTCMonth() + 1).padStart(2, "0")}-01`;
  }
  return null;
}

function parseValue(cell) {
  if (typeof cell === "number" && Number.isFinite(cell)) return cell;
  if (cell == null || cell === "") return null;
  const n = Number(String(cell).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

async function main() {
  console.log(`[gscpi] fetching ${SOURCE_URL}`);
  const res = await fetch(SOURCE_URL, {
    headers: { Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*" },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("workbook has no sheets");
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });
  if (!rows.length) throw new Error("empty sheet");

  // 첫 non-empty 행을 헤더로
  let headerIdx = 0;
  while (
    headerIdx < rows.length &&
    (!Array.isArray(rows[headerIdx]) ||
      rows[headerIdx].every((c) => c == null || String(c).trim() === ""))
  ) {
    headerIdx += 1;
  }
  const header = rows[headerIdx] || [];
  const { dateCol, valueCol } = findColumns(header);
  console.log(
    `[gscpi] sheet="${sheetName}" header row=${headerIdx} dateCol=${dateCol} (${header[dateCol]}) valueCol=${valueCol} (${header[valueCol]})`,
  );

  const series = [];
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const date = toMonthDate(row[dateCol]);
    const value = parseValue(row[valueCol]);
    if (!date || value == null) continue;
    series.push({ date, value: Math.round(value * 1e6) / 1e6 });
  }

  // 날짜 오름차순 + 동일 월이면 마지막 값 유지
  series.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const byDate = new Map();
  for (const p of series) byDate.set(p.date, p);
  const out = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));

  if (out.length < 12) {
    throw new Error(`too few points (${out.length}) — check column mapping`);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(out)}\n`, "utf8");

  const latest = out[out.length - 1];
  const prev = out[out.length - 2];
  console.log(`[gscpi] wrote ${out.length} points → ${path.relative(ROOT, OUT)}`);
  console.log(
    `[gscpi] latest ${latest.date} = ${latest.value}${prev ? ` (prev ${prev.date} = ${prev.value})` : ""}`,
  );
}

main().catch((err) => {
  console.error("[gscpi] failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
