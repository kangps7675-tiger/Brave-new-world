/**
 * 정답 리스트(src/data/gold/maritimeStrikes.ts) 대비 우리 피격 기록의 정밀도·재현율.
 *
 * 사용:
 *   curl -s https://<사이트>/api/ukmto > /tmp/ukmto.json
 *   npm run maritime:gold:eval -- /tmp/ukmto.json [--include-draft]
 *
 * 예측 = UKMTO 사건 중 공격·나포·승선(Attack/Hijack/Boarding)이고 선명이 있는 것.
 * 주의: 이건 UKMTO 적재분의 점수이지 AIS 후보 판정 엔진(확인/유력)의 점수가 아니다.
 *       판정 엔진 출력을 같은 모양({vessel, at}[])으로 뽑을 수 있게 되면 같은 함수에 넣으면 된다.
 */
import { readFileSync } from "node:fs";
import { MARITIME_GOLD } from "../../src/data/gold/maritimeStrikes";
import { scoreAgainstGold, type PredictedStrike } from "../../src/lib/maritimeGold";

const args = process.argv.slice(2);
const includeDraft = args.includes("--include-draft");
const file = args.find((a) => !a.startsWith("--"));
if (!file) {
  console.error("사용: npm run maritime:gold:eval -- <ukmto.json> [--include-draft]");
  process.exit(1);
}

type Row = { incidentTypeName?: string; vesselName?: string | null; utcDateOfIncident?: string | null; lat?: number; lng?: number };
const raw = JSON.parse(readFileSync(file, "utf8")) as Row[] | { incidents?: Row[] };
const rows = Array.isArray(raw) ? raw : raw.incidents ?? [];

const predicted: PredictedStrike[] = rows
  .filter((r) => ["Attack", "Hijack", "Boarding"].includes(r.incidentTypeName ?? "") && r.vesselName && r.utcDateOfIncident)
  .map((r) => ({ vessel: r.vesselName!, at: r.utcDateOfIncident!, lat: r.lat, lng: r.lng }));

// 우리 데이터가 닿는 기간 안의 정답만 비교한다 (기간 밖 정답을 「놓쳤다」고 세지 않기 위해)
const allRows = rows.map((r) => Date.parse(r.utcDateOfIncident ?? "")).filter(Number.isFinite);
const lo = Math.min(...allRows) - 2 * 86_400_000;
const hi = Math.max(...allRows) + 2 * 86_400_000;
const goldInWindow = MARITIME_GOLD.filter((x) => {
  const t = Date.parse(x.date.length === 7 ? `${x.date}-15` : x.date);
  return Number.isFinite(t) && t >= lo && t <= hi;
});
console.log(`데이터 기간 ${new Date(lo + 2 * 86_400_000).toISOString().slice(0, 10)} ~ ${new Date(hi - 2 * 86_400_000).toISOString().slice(0, 10)} · 이 기간의 정답 ${goldInWindow.length}건 / 전체 ${MARITIME_GOLD.length}건`);

const s = scoreAgainstGold(predicted, goldInWindow, { includeDraft });
const pct = (x: number | null) => (x === null ? "계산 불가" : `${(x * 100).toFixed(1)}%`);

console.log(`정답 ${s.goldCount}건${includeDraft ? " (초안 포함)" : " (reviewed=true만)"} · 비교 대상 예측 ${s.predictedCount}건 · 일치 ${s.matched}건`);
console.log(`재현율 ${pct(s.recall)} (정답 중 우리가 가진 비율)`);
console.log(`정밀도 ${pct(s.precision)} (우리 기록 중 정답표에 있는 비율)`);
if (s.goldCount === 0) console.log("→ reviewed=true 줄이 없습니다. 출처를 확인한 뒤 true로 바꾸거나 --include-draft 로 초안을 보세요.");
if (s.missed.length) console.log(`\n놓친 정답(${s.missed.length}): ${s.missed.join(", ")}`);
if (s.unmatchedPredictions.length)
  console.log(`\n정답표에 없는 예측(${s.unmatchedPredictions.length}) — 오탐이거나 정답표 누락: ${s.unmatchedPredictions.join(", ")}`);
